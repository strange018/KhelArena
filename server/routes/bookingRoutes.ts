import { Router, Response } from 'express';
import { queryOne, queryAll, execute, transaction } from '../db/index.js';
import { authenticateToken, requireRole, checkVenueOwnership, AuthenticatedRequest, logAudit } from '../middleware/auth.js';
import QRCode from 'qrcode';
import { z } from 'zod';

const router = Router();

// Hold Slot (Lock for 5 Minutes) with Double-Booking Concurrency Protection
const holdSlotSchema = z.object({
  venue_id: z.string(),
  court_id: z.string(),
  date: z.string(), // YYYY-MM-DD
  start_time: z.string(), // HH:MM
  end_time: z.string(), // HH:MM
  coupon_code: z.string().optional()
});

router.post('/hold', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = holdSlotSchema.parse(req.body);
    const userId = req.user!.id;

    // Execute atomic slot reservation in SQL transaction
    const result = await transaction(async () => {
      // 1. Verify Venue & Court existence
      const court = await queryOne('SELECT * FROM courts WHERE id = ? AND venue_id = ? AND is_active = 1', [data.court_id, data.venue_id]);
      const venue = await queryOne('SELECT * FROM venues WHERE id = ? AND verification_status IN (\'VERIFIED\', \'ACTIVE\')', [data.venue_id]);

      if (!court || !venue) {
        throw new Error('SLOT_UNAVAILABLE: Venue or Court is not available');
      }

      // 2. Check for existing active booking or lock on court + date + start_time
      const existing = await queryOne(`
        SELECT id, status, held_until 
        FROM bookings 
        WHERE court_id = ? AND date = ? AND start_time = ? 
        AND status IN ('HELD', 'PAYMENT_PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED')
      `, [data.court_id, data.date, data.start_time]);

      if (existing) {
        // If it's a held booking, check if hold expired
        if (existing.status === 'HELD' && existing.held_until && new Date(existing.held_until) < new Date()) {
          // Release expired hold
          await execute('UPDATE bookings SET status = \'EXPIRED\' WHERE id = ?', [existing.id]);
        } else {
          throw new Error('SLOT_UNAVAILABLE: This court time slot is already booked or currently held by another user.');
        }
      }

      // 3. Check manual inventory blocks (maintenance / walk-in)
      const block = await queryOne(`
        SELECT id, reason FROM availability_blocks 
        WHERE court_id = ? AND date = ? AND start_time = ?
      `, [data.court_id, data.date, data.start_time]);

      if (block) {
        throw new Error(`SLOT_UNAVAILABLE: Court is unavailable due to ${block.reason}`);
      }

      // 4. Server-Side Pricing Calculation
      const startHour = parseInt(data.start_time.split(':')[0], 10);
      const isPeak = startHour >= 18 && startHour <= 21;
      const courtPrice = isPeak ? court.hourly_rate_peak : court.hourly_rate_offpeak;

      let discountAmount = 0;
      if (data.coupon_code) {
        const coupon = await queryOne('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [data.coupon_code.toUpperCase()]);
        if (coupon) {
          if (coupon.discount_type === 'FIXED') {
            discountAmount = coupon.discount_value;
          } else if (coupon.discount_type === 'PERCENTAGE') {
            discountAmount = (courtPrice * coupon.discount_value) / 100;
            if (coupon.max_discount && discountAmount > coupon.max_discount) {
              discountAmount = coupon.max_discount;
            }
          }
        }
      }

      const platformFee = 15; // ₹15 platform fee
      const totalAmount = Math.max(0, courtPrice - discountAmount + platformFee);

      const commissionRate = venue.commission_rate || 7.0;
      const commissionAmount = (courtPrice * commissionRate) / 100;
      const venuePayable = courtPrice - commissionAmount;

      // 5. Generate Booking & Hold
      const bookingId = 'bk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const bookingCode = 'BK-' + Math.floor(100000 + Math.random() * 900000);
      
      // 5 Minute Hold Expiration
      const heldUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await execute(`
        INSERT INTO bookings (
          id, booking_code, user_id, venue_id, court_id, date, start_time, end_time,
          court_price, discount_amount, platform_fee, total_amount,
          commission_rate, commission_amount, venue_payable, status, held_until
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'HELD', ?)
      `, [
        bookingId, bookingCode, userId, data.venue_id, data.court_id, data.date, data.start_time, data.end_time,
        courtPrice, discountAmount, platformFee, totalAmount,
        commissionRate, commissionAmount, venuePayable, heldUntil
      ]);

      // 6. Create Razorpay Payment Order Simulation
      const razorpayOrderId = 'order_rzp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      await execute(`
        INSERT INTO payments (id, booking_id, razorpay_order_id, amount, currency, status)
        VALUES (?, ?, ?, ?, 'INR', 'CREATED')
      `, ['pay_' + Date.now(), bookingId, razorpayOrderId, totalAmount]);

      return {
        booking_id: bookingId,
        booking_code: bookingCode,
        held_until: heldUntil,
        court_price: courtPrice,
        discount_amount: discountAmount,
        platform_fee: platformFee,
        total_amount: totalAmount,
        razorpay_order_id: razorpayOrderId
      };
    });

    await logAudit(userId, req.user!.role, 'BOOKING_HOLD', 'BOOKING', result.booking_id, { amount: result.total_amount }, req.ip);

    res.json(result);
  } catch (err: any) {
    if (err.message.startsWith('SLOT_UNAVAILABLE')) {
      res.status(409).json({ error: 'SLOT_UNAVAILABLE', message: err.message.replace('SLOT_UNAVAILABLE: ', '') });
    } else {
      res.status(400).json({ error: 'BOOKING_FAILED', message: err.message || 'Failed to hold slot' });
    }
  }
});

// Confirm Payment & Complete Booking
router.post('/confirm-payment', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { booking_id, razorpay_order_id, razorpay_payment_id, payment_method } = req.body;

  try {
    await transaction(async () => {
      const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [booking_id]);
      if (!booking) throw new Error('Booking not found');

      if (booking.status === 'EXPIRED') {
        throw new Error('Hold timer expired. Please select court slot again.');
      }

      // Generate QR code data
      const qrData = `KHELARENA:${booking.booking_code}:${booking.id}:${req.user!.id}`;

      // Update booking to CONFIRMED
      await execute(`
        UPDATE bookings 
        SET status = 'CONFIRMED', payment_method = ?, qr_code_data = ?
        WHERE id = ?
      `, [payment_method || 'UPI_RAZORPAY', qrData, booking_id]);

      // Update payment record
      await execute(`
        UPDATE payments 
        SET razorpay_payment_id = ?, status = 'CAPTURED', signature = 'VALID_SIG'
        WHERE booking_id = ?
      `, [razorpay_payment_id || 'pay_demo_' + Date.now(), booking_id]);

      // Record in Immutable Financial Ledger
      const ledgerId = 'led_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      await execute(`
        INSERT INTO commission_ledgers (id, booking_id, venue_id, booking_amount, commission_rate, platform_commission, platform_fee, venue_payable)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ledgerId,
        booking_id,
        booking.venue_id,
        booking.total_amount,
        booking.commission_rate,
        booking.commission_amount,
        booking.platform_fee,
        booking.venue_payable
      ]);

      // Create confirmation notification
      const notifId = 'notif_' + Date.now();
      await execute(`
        INSERT INTO notifications (id, user_id, title, message, type)
        VALUES (?, ?, 'Booking Confirmed!', 'Your booking ${booking.booking_code} is confirmed. Show QR code at venue upon arrival.', 'BOOKING')
      `, [notifId, req.user!.id]);
    });

    const updatedBooking = await queryOne('SELECT * FROM bookings WHERE id = ?', [booking_id]);
    const qrImage = await QRCode.toDataURL(updatedBooking.qr_code_data);

    await logAudit(req.user!.id, req.user!.role, 'PAYMENT_CONFIRM', 'BOOKING', booking_id, { booking_code: updatedBooking.booking_code }, req.ip);

    res.json({
      success: true,
      booking: updatedBooking,
      qr_image: qrImage
    });
  } catch (err: any) {
    res.status(400).json({ error: 'PAYMENT_VERIFICATION_FAILED', message: err.message });
  }
});

// Player Cancel Booking (Tiered Refund Policy)
router.post('/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { booking_id, reason } = req.body;
  const userId = req.user!.id;

  const booking = await queryOne('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [booking_id, userId]);
  if (!booking) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found' });
    return;
  }

  if (['CANCELLED', 'COMPLETED', 'CHECKED_IN'].includes(booking.status)) {
    res.status(400).json({ error: 'INVALID_STATUS', message: `Cannot cancel booking with status ${booking.status}` });
    return;
  }

  // Calculate Tiered Refund based on hours remaining until game date & time
  const gameDateTime = new Date(`${booking.date}T${booking.start_time}:00`);
  const hoursUntilGame = (gameDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

  let refundPercent = 0;
  let policyRule = 'Less than 6 hours - No Refund';

  if (hoursUntilGame >= 24) {
    refundPercent = 100;
    policyRule = 'More than 24 hours - 100% Refund';
  } else if (hoursUntilGame >= 6) {
    refundPercent = 50;
    policyRule = '6 to 24 hours - 50% Refund';
  }

  const refundAmount = (booking.court_price * refundPercent) / 100;

  await transaction(async () => {
    // Mark booking CANCELLED
    await execute('UPDATE bookings SET status = \'CANCELLED\', cancellation_reason = ? WHERE id = ?', [reason || policyRule, booking_id]);

    // Create refund record
    if (refundAmount > 0) {
      const refundId = 'ref_' + Date.now();
      await execute(`
        INSERT INTO refunds (id, booking_id, user_id, amount, reason, status)
        VALUES (?, ?, ?, ?, ?, 'APPROVED')
      `, [refundId, booking_id, userId, refundAmount, policyRule]);
    }
  });

  await logAudit(userId, req.user!.role, 'BOOKING_CANCEL', 'BOOKING', booking_id, { refundAmount, policyRule }, req.ip);

  res.json({
    message: 'Booking cancelled successfully',
    refund_amount: refundAmount,
    refund_policy_applied: policyRule
  });
});

// Venue Owner Scanner / Check-in QR Code
router.post('/check-in', authenticateToken, requireRole(['VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { qr_code_data, booking_code } = req.body;

  let booking = null;
  if (qr_code_data) {
    booking = await queryOne('SELECT * FROM bookings WHERE qr_code_data = ?', [qr_code_data]);
  } else if (booking_code) {
    booking = await queryOne('SELECT * FROM bookings WHERE booking_code = ?', [booking_code.toUpperCase()]);
  }

  if (!booking) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Booking not found' });
    return;
  }

  const isOwner = await checkVenueOwnership(req.user!.id, req.user!.role, booking.venue_id);
  if (!isOwner) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You do not own the venue for this booking' });
    return;
  }

  if (booking.status === 'CHECKED_IN') {
    res.status(400).json({ error: 'ALREADY_CHECKED_IN', message: 'Player is already checked in!' });
    return;
  }

  if (booking.status !== 'CONFIRMED') {
    res.status(400).json({ error: 'INVALID_STATUS', message: `Booking status is ${booking.status}. Only CONFIRMED bookings can be checked in.` });
    return;
  }

  await execute(`
    UPDATE bookings 
    SET status = 'CHECKED_IN', checked_in_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [booking.id]);

  const player = await queryOne('SELECT name, phone FROM users WHERE id = ?', [booking.user_id]);

  await logAudit(req.user!.id, req.user!.role, 'PLAYER_CHECK_IN', 'BOOKING', booking.id, { player_name: player?.name }, req.ip);

  res.json({
    success: true,
    message: `Player ${player?.name || 'Customer'} successfully checked in!`,
    booking
  });
});

// My Bookings
router.get('/my-bookings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const bookings = await queryAll(`
    SELECT b.*, v.name as venue_name, v.address as venue_address,
      c.name as court_name, s.name as sport_name, s.icon as sport_icon
    FROM bookings b
    JOIN venues v ON b.venue_id = v.id
    JOIN courts c ON b.court_id = c.id
    JOIN sports s ON c.sport_id = s.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `, [userId]);

  // Attach QR code base64 images for confirmed bookings
  const withQR = await Promise.all(
    bookings.map(async b => {
      let qr_image = null;
      if (b.qr_code_data && (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')) {
        qr_image = await QRCode.toDataURL(b.qr_code_data);
      }
      return {
        ...b,
        qr_image
      };
    })
  );

  res.json(withQR);
});

export default router;
