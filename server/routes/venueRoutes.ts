import { Router, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/index.js';
import { authenticateToken, requireRole, checkVenueOwnership, AuthenticatedRequest, logAudit } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Cities
router.get('/cities', async (req, res: Response) => {
  const cities = await queryAll('SELECT * FROM cities WHERE is_active = 1 ORDER BY name ASC');
  const areas = await queryAll('SELECT * FROM areas ORDER BY name ASC');
  
  const grouped = cities.map(c => ({
    ...c,
    areas: areas.filter(a => a.city_id === c.id)
  }));

  res.json(grouped);
});

// Sports
router.get('/sports', async (req, res: Response) => {
  const sports = await queryAll('SELECT * FROM sports ORDER BY name ASC');
  res.json(sports);
});

// Venue Search Marketplace
router.get('/', async (req, res: Response) => {
  const { city = 'city_patna', area, sport, search, date } = req.query;

  let query = `
    SELECT v.*, c.name as city_name, a.name as area_name,
      (SELECT COUNT(*) FROM reviews r WHERE r.venue_id = v.id) as review_count,
      (SELECT AVG(rating) FROM reviews r WHERE r.venue_id = v.id) as avg_rating,
      (SELECT MIN(hourly_rate_offpeak) FROM courts cr WHERE cr.venue_id = v.id AND cr.is_active = 1) as min_price
    FROM venues v
    JOIN cities c ON v.city_id = c.id
    JOIN areas a ON v.area_id = a.id
    WHERE v.verification_status IN ('VERIFIED', 'ACTIVE')
  `;

  const params: any[] = [];

  if (city) {
    query += ` AND (v.city_id = ? OR c.name LIKE ?)`;
    params.push(city, `%${city}%`);
  }

  if (area) {
    query += ` AND (v.area_id = ? OR a.name LIKE ?)`;
    params.push(area, `%${area}%`);
  }

  if (search) {
    query += ` AND (v.name LIKE ? OR a.name LIKE ? OR v.address LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (sport) {
    query += ` AND v.id IN (SELECT venue_id FROM courts cr WHERE cr.sport_id = ? OR cr.sport_id IN (SELECT id FROM sports WHERE slug = ?))`;
    params.push(sport, sport);
  }

  query += ` ORDER BY avg_rating DESC, v.created_at DESC`;

  const venues = await queryAll(query, params);

  // Parse images and facilities
  const formatted = venues.map(v => ({
    ...v,
    images: JSON.parse(v.images || '[]'),
    facilities: JSON.parse(v.facilities || '[]'),
    avg_rating: v.avg_rating ? parseFloat(v.avg_rating.toFixed(1)) : 4.8,
    min_price: v.min_price || 300
  }));

  res.json(formatted);
});

// Venue Details
router.get('/:id', async (req, res: Response): Promise<void> => {
  const venue = await queryOne(`
    SELECT v.*, c.name as city_name, a.name as area_name,
      u.name as owner_name, u.phone as owner_phone
    FROM venues v
    JOIN cities c ON v.city_id = c.id
    JOIN areas a ON v.area_id = a.id
    JOIN users u ON v.owner_id = u.id
    WHERE v.id = ? OR v.slug = ?
  `, [req.params.id, req.params.id]);

  if (!venue) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Venue not found' });
    return;
  }

  const courts = await queryAll(`
    SELECT cr.*, s.name as sport_name, s.icon as sport_icon, s.slug as sport_slug
    FROM courts cr
    JOIN sports s ON cr.sport_id = s.id
    WHERE cr.venue_id = ? AND cr.is_active = 1
  `, [venue.id]);

  const reviews = await queryAll(`
    SELECT r.*, u.name as reviewer_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.venue_id = ?
    ORDER BY r.created_at DESC LIMIT 10
  `, [venue.id]);

  res.json({
    ...venue,
    images: JSON.parse(venue.images || '[]'),
    facilities: JSON.parse(venue.facilities || '[]'),
    courts,
    reviews
  });
});

// Availability Slots Calculation
router.get('/:id/courts/:courtId/slots', async (req, res: Response): Promise<void> => {
  const { id: venueId, courtId } = req.params;
  const { date } = req.query; // YYYY-MM-DD

  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'INVALID_DATE', message: 'Query param date (YYYY-MM-DD) is required' });
    return;
  }

  const court = await queryOne('SELECT * FROM courts WHERE id = ? AND venue_id = ?', [courtId, venueId]);
  const venue = await queryOne('SELECT opening_time, closing_time FROM venues WHERE id = ?', [venueId]);

  if (!court || !venue) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Court or Venue not found' });
    return;
  }

  // Fetch active bookings for court on date
  const activeBookings = await queryAll(`
    SELECT start_time, end_time, status, held_until 
    FROM bookings 
    WHERE court_id = ? AND date = ? 
    AND status IN ('HELD', 'PAYMENT_PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED')
  `, [courtId, date]);

  // Clean expired holds
  const nowStr = new Date().toISOString();

  // Fetch inventory blocks (maintenance, external)
  const blocks = await queryAll(`
    SELECT start_time, end_time, reason 
    FROM availability_blocks 
    WHERE court_id = ? AND date = ?
  `, [courtId, date]);

  // Generate hourly slots from opening_time to closing_time
  const openHour = parseInt(venue.opening_time.split(':')[0], 10);
  const closeHour = parseInt(venue.closing_time.split(':')[0], 10);

  const slots = [];
  for (let h = openHour; h < closeHour; h++) {
    const startTime = `${h.toString().padStart(2, '0')}:00`;
    const endTime = `${(h + 1).toString().padStart(2, '0')}:00`;

    // Check if slot is peak hour (Peak hours: 18:00 to 22:00)
    const isPeak = h >= 18 && h <= 21;
    const price = isPeak ? court.hourly_rate_peak : court.hourly_rate_offpeak;

    // Check if booked
    const existingBooking = activeBookings.find(b => {
      if (b.status === 'HELD' && b.held_until && new Date(b.held_until) < new Date()) {
        return false; // Expired hold
      }
      return b.start_time === startTime;
    });

    const block = blocks.find(b => b.start_time === startTime);

    let status = 'AVAILABLE';
    let blockReason = null;

    if (existingBooking) {
      status = 'BOOKED';
    } else if (block) {
      status = 'BLOCKED';
      blockReason = block.reason;
    }

    slots.push({
      start_time: startTime,
      end_time: endTime,
      price,
      is_peak: isPeak,
      status,
      block_reason: blockReason
    });
  }

  res.json({
    court,
    date,
    slots
  });
});

// Owner Register New Venue
const newVenueSchema = z.object({
  name: z.string().min(3),
  city_id: z.string(),
  area_id: z.string(),
  address: z.string().min(5),
  phone: z.string().min(10),
  email: z.string().email(),
  facilities: z.array(z.string()),
  opening_time: z.string().default('06:00'),
  closing_time: z.string().default('23:00'),
  bank_account_no: z.string().optional(),
  bank_ifsc: z.string().optional(),
  bank_account_holder: z.string().optional()
});

router.post('/', authenticateToken, requireRole(['VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = newVenueSchema.parse(req.body);
    const venueId = 'venue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

    const defaultImages = JSON.stringify([
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'
    ]);

    await execute(`
      INSERT INTO venues (id, owner_id, city_id, area_id, name, slug, address, phone, email, verification_status, commission_rate, images, facilities, opening_time, closing_time, bank_account_no, bank_ifsc, bank_account_holder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 7.0, ?, ?, ?, ?, ?, ?, ?)
    `, [
      venueId,
      req.user!.id,
      data.city_id,
      data.area_id,
      data.name,
      slug,
      data.address,
      data.phone,
      data.email,
      defaultImages,
      JSON.stringify(data.facilities),
      data.opening_time,
      data.closing_time,
      data.bank_account_no || '',
      data.bank_ifsc || '',
      data.bank_account_holder || ''
    ]);

    await logAudit(req.user!.id, req.user!.role, 'VENUE_CREATE', 'VENUE', venueId, { name: data.name }, req.ip);

    res.json({ id: venueId, message: 'Venue created successfully. Submitted for Admin verification.' });
  } catch (err: any) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: err.message });
  }
});

// Owner Add Court
router.post('/:id/courts', authenticateToken, requireRole(['VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id: venueId } = req.params;
  const isOwner = await checkVenueOwnership(req.user!.id, req.user!.role, venueId);
  if (!isOwner) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You do not own this venue' });
    return;
  }

  const { name, sport_id, type, hourly_rate_offpeak, hourly_rate_peak } = req.body;
  const courtId = 'court_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  await execute(`
    INSERT INTO courts (id, venue_id, sport_id, name, type, hourly_rate_offpeak, hourly_rate_peak)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [courtId, venueId, sport_id, name, type || 'Standard', hourly_rate_offpeak, hourly_rate_peak]);

  res.json({ id: courtId, message: 'Court added successfully' });
});

// Owner Manual Inventory Control (Block/Unblock Slot)
router.post('/:id/inventory-block', authenticateToken, requireRole(['VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id: venueId } = req.params;
  const isOwner = await checkVenueOwnership(req.user!.id, req.user!.role, venueId);
  if (!isOwner) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You do not own this venue' });
    return;
  }

  const { court_id, date, start_time, end_time, reason, action } = req.body; // action: 'BLOCK' | 'UNBLOCK'

  if (action === 'UNBLOCK') {
    await execute('DELETE FROM availability_blocks WHERE court_id = ? AND date = ? AND start_time = ?', [court_id, date, start_time]);
    res.json({ message: 'Slot unblocked successfully' });
    return;
  }

  const blockId = 'block_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  await execute(`
    INSERT INTO availability_blocks (id, court_id, date, start_time, end_time, reason, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [blockId, court_id, date, start_time, end_time, reason || 'EXTERNAL_BOOKING', req.user!.id]);

  res.json({ id: blockId, message: `Slot blocked for ${reason}` });
});

export default router;
