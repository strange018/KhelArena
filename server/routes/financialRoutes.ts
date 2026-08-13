import { Router, Response } from 'express';
import { queryAll, queryOne, execute, transaction } from '../db/index.js';
import { authenticateToken, requireRole, checkVenueOwnership, AuthenticatedRequest, logAudit } from '../middleware/auth.js';

const router = Router();

// Venue Owner Dashboard Earnings & Financial Summary
router.get('/venue-summary/:venueId', authenticateToken, requireRole(['VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { venueId } = req.params;
  const isOwner = await checkVenueOwnership(req.user!.id, req.user!.role, venueId);
  if (!isOwner) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You do not own this venue' });
    return;
  }

  // Calculate totals
  const earnings = await queryOne(`
    SELECT 
      COUNT(*) as total_bookings,
      SUM(booking_amount) as total_gmv,
      SUM(platform_commission) as total_commission,
      SUM(platform_fee) as total_platform_fees,
      SUM(venue_payable) as net_earnings
    FROM commission_ledgers
    WHERE venue_id = ?
  `, [venueId]);

  const recentLedger = await queryAll(`
    SELECT cl.*, b.booking_code, b.date, b.start_time, u.name as customer_name
    FROM commission_ledgers cl
    JOIN bookings b ON cl.booking_id = b.id
    JOIN users u ON b.user_id = u.id
    WHERE cl.venue_id = ?
    ORDER BY cl.created_at DESC LIMIT 20
  `, [venueId]);

  const settlements = await queryAll(`
    SELECT * FROM settlements WHERE venue_id = ? ORDER BY created_at DESC
  `, [venueId]);

  res.json({
    summary: {
      total_bookings: earnings?.total_bookings || 0,
      total_gmv: earnings?.total_gmv || 0,
      total_commission: earnings?.total_commission || 0,
      net_earnings: earnings?.net_earnings || 0
    },
    recent_transactions: recentLedger,
    settlements
  });
});

// Admin Generate Settlement Batch for Venue
router.post('/settlements/generate', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { venue_id } = req.body;

  const venue = await queryOne('SELECT * FROM venues WHERE id = ?', [venue_id]);
  if (!venue) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Venue not found' });
    return;
  }

  // Unsettled ledger entries
  const unsettled = await queryOne(`
    SELECT 
      COUNT(*) as count,
      SUM(booking_amount) as total_gmv,
      SUM(platform_commission) as total_commission,
      SUM(venue_payable) as net_payable
    FROM commission_ledgers
    WHERE venue_id = ?
  `, [venue_id]);

  if (!unsettled || unsettled.count === 0) {
    res.status(400).json({ error: 'NO_UNSETTLED_ENTRIES', message: 'No unsettled transactions for this venue' });
    return;
  }

  const settlementId = 'stl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const settlementCode = 'STL-' + Math.floor(100000 + Math.random() * 900000);

  const todayStr = new Date().toISOString().split('T')[0];

  await execute(`
    INSERT INTO settlements (
      id, settlement_code, venue_id, period_start, period_end,
      total_bookings_count, total_gmv, total_commission, net_payable, status, bank_reference_no
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `, [
    settlementId, settlementCode, venue_id, '2026-08-01', todayStr,
    unsettled.count, unsettled.total_gmv, unsettled.total_commission, unsettled.net_payable,
    'BANK-REF-' + Math.floor(10000000 + Math.random() * 90000000)
  ]);

  await logAudit(req.user!.id, req.user!.role, 'SETTLEMENT_GENERATE', 'SETTLEMENT', settlementId, { venue_id, net_payable: unsettled.net_payable }, req.ip);

  res.json({
    settlement_id: settlementId,
    settlement_code: settlementCode,
    net_payable: unsettled.net_payable,
    message: 'Settlement created and marked PENDING for payout release.'
  });
});

// Admin Process / Pay Settlement
router.post('/settlements/:id/pay', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { bank_reference_no } = req.body;

  const stl = await queryOne('SELECT * FROM settlements WHERE id = ?', [id]);
  if (!stl) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Settlement record not found' });
    return;
  }

  await execute(`
    UPDATE settlements 
    SET status = 'PAID', bank_reference_no = ?, paid_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [bank_reference_no || 'UTR_' + Date.now(), id]);

  await logAudit(req.user!.id, req.user!.role, 'SETTLEMENT_PAID', 'SETTLEMENT', id, { net_payable: stl.net_payable }, req.ip);

  res.json({ success: true, message: 'Settlement payout successfully marked PAID.' });
});

export default router;
