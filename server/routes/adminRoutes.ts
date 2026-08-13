import { Router, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/index.js';
import { authenticateToken, requireRole, AuthenticatedRequest, logAudit } from '../middleware/auth.js';

const router = Router();

// Admin Marketplace Analytics & KPI Dashboard
router.get('/dashboard', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const gmvData = await queryOne(`
    SELECT 
      COUNT(*) as total_bookings,
      SUM(total_amount) as total_gmv,
      SUM(commission_amount) as total_commission,
      SUM(platform_fee) as total_platform_fees
    FROM bookings
    WHERE status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
  `);

  const venueStats = await queryOne(`
    SELECT 
      COUNT(*) as total_venues,
      SUM(CASE WHEN verification_status = 'VERIFIED' OR verification_status = 'ACTIVE' THEN 1 ELSE 0 END) as active_venues,
      SUM(CASE WHEN verification_status = 'PENDING' THEN 1 ELSE 0 END) as pending_venues
    FROM venues
  `);

  const userStats = await queryOne(`
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN role = 'PLAYER' THEN 1 ELSE 0 END) as player_count,
      SUM(CASE WHEN role = 'VENUE_OWNER' THEN 1 ELSE 0 END) as owner_count
    FROM users
  `);

  const sportBreakdown = await queryAll(`
    SELECT s.name as sport_name, COUNT(b.id) as booking_count, SUM(b.total_amount) as total_revenue
    FROM bookings b
    JOIN courts c ON b.court_id = c.id
    JOIN sports s ON c.sport_id = s.id
    WHERE b.status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
    GROUP BY s.name
  `);

  // Venue Utilization calculation
  const totalCourts = await queryOne('SELECT COUNT(*) as count FROM courts WHERE is_active = 1');
  const utilization = Math.min(100, Math.round(((gmvData?.total_bookings || 0) / Math.max(1, (totalCourts?.count || 1) * 12)) * 100));

  res.json({
    kpis: {
      total_gmv: gmvData?.total_gmv || 0,
      total_commission: gmvData?.total_commission || 0,
      total_platform_fees: gmvData?.total_platform_fees || 0,
      take_rate: '7.0%',
      total_bookings: gmvData?.total_bookings || 0,
      active_venues: venueStats?.active_venues || 0,
      pending_venues: venueStats?.pending_venues || 0,
      total_players: userStats?.player_count || 0,
      venue_utilization: `${utilization}%`
    },
    sport_breakdown: sportBreakdown
  });
});

// Get Pending Venues for Verification
router.get('/venues/pending', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const venues = await queryAll(`
    SELECT v.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email, c.name as city_name, a.name as area_name
    FROM venues v
    JOIN users u ON v.owner_id = u.id
    JOIN cities c ON v.city_id = c.id
    JOIN areas a ON v.area_id = a.id
    WHERE v.verification_status = 'PENDING'
    ORDER BY v.created_at ASC
  `);

  const parsed = venues.map(v => ({
    ...v,
    images: JSON.parse(v.images || '[]'),
    facilities: JSON.parse(v.facilities || '[]')
  }));

  res.json(parsed);
});

// Update Venue Verification Status
router.post('/venues/:id/verify', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, commission_rate, notes } = req.body; // 'VERIFIED' | 'REJECTED' | 'SUSPENDED'

  const venue = await queryOne('SELECT * FROM venues WHERE id = ?', [id]);
  if (!venue) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Venue not found' });
    return;
  }

  await execute(`
    UPDATE venues 
    SET verification_status = ?, commission_rate = ?
    WHERE id = ?
  `, [status, commission_rate || venue.commission_rate, id]);

  await logAudit(req.user!.id, req.user!.role, 'VENUE_VERIFICATION_CHANGE', 'VENUE', id, { status, notes }, req.ip);

  res.json({ success: true, message: `Venue verification status updated to ${status}` });
});

// Get Audit Logs
router.get('/audit-logs', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const logs = await queryAll('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
  res.json(logs);
});

// Get System Settings & Global Commission Rates
router.get('/settings', authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const settings = await queryAll('SELECT * FROM system_settings');
  res.json(settings);
});

// Update System Setting
router.post('/settings', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { key, value } = req.body;

  await execute(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
  `, [key, value, value]);

  await logAudit(req.user!.id, req.user!.role, 'SYSTEM_SETTING_UPDATE', 'SETTING', key, { value }, req.ip);

  res.json({ success: true, message: 'System setting updated successfully' });
});

export default router;
