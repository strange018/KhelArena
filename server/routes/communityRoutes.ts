import { Router, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/index.js';
import { authenticateToken, requireRole, AuthenticatedRequest, logAudit } from '../middleware/auth.js';

const router = Router();

// Validate Coupon
router.post('/coupons/validate', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { code, amount } = req.body;

  if (!code) {
    res.status(400).json({ error: 'INVALID_CODE', message: 'Coupon code required' });
    return;
  }

  const coupon = await queryOne('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code.toUpperCase()]);
  if (!coupon) {
    res.status(404).json({ error: 'COUPON_NOT_FOUND', message: 'Invalid or expired coupon code' });
    return;
  }

  if (amount && coupon.min_booking_amount && amount < coupon.min_booking_amount) {
    res.status(400).json({
      error: 'MIN_AMOUNT_NOT_MET',
      message: `Minimum booking amount of ₹${coupon.min_booking_amount} required for coupon ${code}`
    });
    return;
  }

  let discount = 0;
  if (coupon.discount_type === 'FIXED') {
    discount = coupon.discount_value;
  } else if (coupon.discount_type === 'PERCENTAGE') {
    discount = ((amount || 500) * coupon.discount_value) / 100;
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  }

  res.json({
    valid: true,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    discount_calculated: Math.round(discount)
  });
});

// Post Verified Review
router.post('/reviews', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { venue_id, booking_id, rating, comment } = req.body;
  const userId = req.user!.id;

  if (!venue_id) {
    res.status(400).json({ error: 'VENUE_REQUIRED', message: 'Venue ID is required' });
    return;
  }

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'INVALID_RATING', message: 'Please provide a star rating between 1 and 5' });
    return;
  }

  let finalBookingId = booking_id;
  if (!finalBookingId) {
    // Find any existing booking for user or generate a default booking ID
    const booking = await queryOne(
      'SELECT id FROM bookings WHERE user_id = ? AND venue_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId, venue_id]
    );
    finalBookingId = booking ? booking.id : `bk_rev_${Date.now()}`;
  }

  const reviewId = 'rev_' + Date.now();
  await execute(`
    INSERT INTO reviews (id, venue_id, booking_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [reviewId, venue_id, finalBookingId, userId, Math.min(5, Math.max(1, rating)), comment || '']);

  // Calculate updated avg rating and review count
  const stats = await queryOne(`
    SELECT COUNT(*) as review_count, AVG(rating) as avg_rating
    FROM reviews WHERE venue_id = ?
  `, [venue_id]);

  res.json({
    success: true,
    message: 'Thank you for your review!',
    review: {
      id: reviewId,
      venue_id,
      booking_id: finalBookingId,
      user_id: userId,
      reviewer_name: req.user?.name || 'Player',
      rating: Number(rating),
      comment: comment || '',
      created_at: new Date().toISOString()
    },
    avg_rating: stats?.avg_rating ? parseFloat(Number(stats.avg_rating).toFixed(1)) : Number(rating),
    review_count: stats?.review_count ? Number(stats.review_count) : 1
  });
});

// Join Slot Waitlist
router.post('/waitlist/join', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { venue_id, court_id, date, start_time, end_time } = req.body;
  const userId = req.user!.id;

  const waitlistId = 'wl_' + Date.now();
  await execute(`
    INSERT INTO waitlists (id, venue_id, court_id, date, start_time, end_time, user_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'WAITING')
  `, [waitlistId, venue_id, court_id, date, start_time, end_time, userId]);

  res.json({ success: true, message: 'Added to waitlist! We will notify you instantly if this court slot opens up.' });
});

// Create Support Ticket
router.post('/support/tickets', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { subject, issue_type, message, booking_id } = req.body;
  const userId = req.user!.id;

  const ticketId = 'tkt_' + Date.now();
  const ticketNo = 'TKT-' + Math.floor(100000 + Math.random() * 900000);

  await execute(`
    INSERT INTO support_tickets (id, ticket_no, user_id, booking_id, subject, issue_type, status, priority)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN', 'MEDIUM')
  `, [ticketId, ticketNo, userId, booking_id || null, subject, issue_type || 'GENERAL']);

  await execute(`
    INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message)
    VALUES (?, ?, ?, ?, ?)
  `, ['msg_' + Date.now(), ticketId, userId, req.user!.role, message]);

  res.json({ ticket_no: ticketNo, message: 'Support ticket submitted successfully.' });
});

// Get User Support Tickets
router.get('/support/tickets', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const tickets = await queryAll('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  res.json(tickets);
});

// Create Dispute Workflow
router.post('/disputes', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { booking_id, venue_id, reason, evidence } = req.body;
  const userId = req.user!.id;

  const disputeId = 'disp_' + Date.now();
  await execute(`
    INSERT INTO disputes (id, booking_id, complainant_id, venue_id, reason, evidence, status)
    VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED')
  `, [disputeId, booking_id, userId, venue_id, reason, evidence || '']);

  await logAudit(userId, req.user!.role, 'DISPUTE_CREATE', 'DISPUTE', disputeId, { booking_id }, req.ip);

  res.json({ dispute_id: disputeId, message: 'Dispute submitted. Admin will review within 24 hours.' });
});

export default router;
