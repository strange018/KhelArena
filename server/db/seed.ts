import { execute, queryOne } from './index.js';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  const existingUser = await queryOne('SELECT id FROM users LIMIT 1');
  if (existingUser) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  console.log('Seeding KhelArena database with Patna marketplace data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Cities
  await execute(`INSERT INTO cities (id, name, state) VALUES 
    ('city_patna', 'Patna', 'Bihar'),
    ('city_ranchi', 'Ranchi', 'Jharkhand'),
    ('city_muzaffarpur', 'Muzaffarpur', 'Bihar');`);

  // 2. Areas
  await execute(`INSERT INTO areas (id, city_id, name, pincode) VALUES
    ('area_kankarbagh', 'city_patna', 'Kankarbagh', '800020'),
    ('area_boring_road', 'city_patna', 'Boring Road', '800001'),
    ('area_patliputra', 'city_patna', 'Patliputra Colony', '800013'),
    ('area_bailey_road', 'city_patna', 'Bailey Road', '800014'),
    ('area_anisabad', 'city_patna', 'Anisabad', '800002');`);

  // 3. Sports
  await execute(`INSERT INTO sports (id, name, slug, icon) VALUES
    ('sport_badminton', 'Badminton', 'badminton', 'Zap'),
    ('sport_football', 'Football Turf', 'football', 'Trophy'),
    ('sport_cricket', 'Cricket Nets', 'cricket', 'Target'),
    ('sport_tennis', 'Tennis', 'tennis', 'Activity'),
    ('sport_basketball', 'Basketball', 'basketball', 'Dribble'),
    ('sport_table_tennis', 'Table Tennis', 'table-tennis', 'CircleDot');`);

  // 4. Permissions & Role Permissions
  const permissions = [
    'USER_READ', 'USER_UPDATE', 'USER_SUSPEND',
    'VENUE_CREATE', 'VENUE_READ', 'VENUE_UPDATE', 'VENUE_APPROVE', 'VENUE_SUSPEND',
    'COURT_CREATE', 'COURT_READ', 'COURT_UPDATE', 'AVAILABILITY_BLOCK',
    'BOOKING_CREATE', 'BOOKING_READ_OWN', 'BOOKING_CANCEL', 'BOOKING_MANAGE',
    'PAYMENT_READ', 'REFUND_CREATE', 'COMMISSION_MANAGE', 'SETTLEMENT_MANAGE',
    'GAME_CREATE', 'GAME_JOIN', 'GAME_MANAGE', 'REVIEW_CREATE', 'DISPUTE_CREATE', 'DISPUTE_MANAGE', 'AUDIT_LOG_READ'
  ];

  for (const perm of permissions) {
    await execute(`INSERT OR IGNORE INTO permissions (id, code, description) VALUES ('perm_${perm}', '${perm}', 'Permission ${perm}')`);
    // Assign permissions to roles
    if (['SUPER_ADMIN', 'ADMIN'].includes('ADMIN')) {
      await execute(`INSERT OR IGNORE INTO role_permissions (role, permission_code) VALUES ('ADMIN', '${perm}'), ('SUPER_ADMIN', '${perm}')`);
    }
  }

  // Add player permissions
  const playerPerms = ['USER_READ', 'USER_UPDATE', 'VENUE_READ', 'COURT_READ', 'BOOKING_CREATE', 'BOOKING_READ_OWN', 'BOOKING_CANCEL', 'GAME_CREATE', 'GAME_JOIN', 'REVIEW_CREATE', 'DISPUTE_CREATE'];
  for (const p of playerPerms) {
    await execute(`INSERT OR IGNORE INTO role_permissions (role, permission_code) VALUES ('PLAYER', '${p}')`);
  }

  // Add venue owner permissions
  const ownerPerms = ['USER_READ', 'VENUE_CREATE', 'VENUE_READ', 'VENUE_UPDATE', 'COURT_CREATE', 'COURT_READ', 'COURT_UPDATE', 'AVAILABILITY_BLOCK', 'BOOKING_MANAGE', 'PAYMENT_READ', 'SETTLEMENT_MANAGE'];
  for (const p of ownerPerms) {
    await execute(`INSERT OR IGNORE INTO role_permissions (role, permission_code) VALUES ('VENUE_OWNER', '${p}')`);
  }

  // 5. Users
  await execute(`INSERT INTO users (id, name, phone, email, password_hash, role, status, reliability_score, city_id) VALUES
    ('user_admin', 'System Admin', '+919800000000', 'admin@khelarena.in', '${passwordHash}', 'SUPER_ADMIN', 'ACTIVE', 100, 'city_patna'),
    ('user_owner_1', 'Ramesh Kumar (Kankarbagh Hub)', '+919876543210', 'owner.ramesh@khelarena.in', '${passwordHash}', 'VENUE_OWNER', 'ACTIVE', 98, 'city_patna'),
    ('user_owner_2', 'Priya Singh (Patliputra Arena)', '+919876543211', 'owner.priya@khelarena.in', '${passwordHash}', 'VENUE_OWNER', 'ACTIVE', 100, 'city_patna'),
    ('user_player_1', 'Rahul Narayan', '+919988776655', 'rahul@example.com', '${passwordHash}', 'PLAYER', 'ACTIVE', 96, 'city_patna'),
    ('user_player_2', 'Ananya Roy', '+919988776656', 'ananya@example.com', '${passwordHash}', 'PLAYER', 'ACTIVE', 99, 'city_patna'),
    ('user_player_3', 'Vikram Sharma', '+919988776657', 'vikram@example.com', '${passwordHash}', 'PLAYER', 'ACTIVE', 92, 'city_patna');`);

  // 6. Venues
  const venue1Images = JSON.stringify([
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80'
  ]);
  const venue1Facilities = JSON.stringify(['Synthetic Flooring', 'Floodlights', 'Changing Rooms', 'Drinking Water', 'Free Parking', 'Equipment Rental']);

  const venue2Images = JSON.stringify([
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80'
  ]);
  const venue2Facilities = JSON.stringify(['FIFA Approved Turf', 'Night Lighting', 'Dressing Room', 'Shower', 'Canteen', 'First Aid']);

  const venue3Images = JSON.stringify([
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80'
  ]);
  const venue3Facilities = JSON.stringify(['Automatic Bowling Machine', 'Pro Nets', 'Coach Available', 'Locker Room']);

  await execute(`INSERT INTO venues (id, owner_id, city_id, area_id, name, slug, address, latitude, longitude, phone, email, verification_status, commission_rate, images, facilities, opening_time, closing_time) VALUES
    ('venue_1', 'user_owner_2', 'city_patna', 'area_patliputra', 'Patliputra Smash & Turf Arena', 'patliputra-smash-turf-patna', 'Road No. 2, Near Patliputra Park, Patliputra Colony, Patna', 25.6208, 85.1123, '+919876543211', 'info@patliputrasmash.com', 'VERIFIED', 7.0, '${venue1Images}', '${venue1Facilities}', '06:00', '23:00'),
    ('venue_2', 'user_owner_1', 'city_patna', 'area_kankarbagh', 'Kankarbagh Sports & Astro Turf Hub', 'kankarbagh-sports-astro-turf', 'Near Central Park, Main Road, Kankarbagh, Patna', 25.5941, 85.1611, '+919876543210', 'contact@kankarbaghturf.com', 'VERIFIED', 7.0, '${venue2Images}', '${venue2Facilities}', '06:00', '23:30'),
    ('venue_3', 'user_owner_1', 'city_patna', 'area_boring_road', 'Boring Road Pro Cricket Nets & Badminton', 'boring-road-pro-cricket-nets', 'Opp. Women''s College, Boring Road, Patna', 25.6121, 85.1205, '+919876543210', 'info@boringroadsports.in', 'VERIFIED', 8.0, '${venue3Images}', '${venue3Facilities}', '07:00', '22:00'),
    ('venue_4', 'user_owner_2', 'city_patna', 'area_bailey_road', 'Bailey Road Indoor Badminton Hub', 'bailey-road-badminton-hub', 'Near Saguna More, Bailey Road, Patna', 25.6080, 85.0500, '+919876543211', 'baileyroadhub@gmail.com', 'PENDING', 7.0, '${venue1Images}', '${venue1Facilities}', '06:00', '22:00');`);

  // 7. Courts
  await execute(`INSERT INTO courts (id, venue_id, sport_id, name, type, hourly_rate_offpeak, hourly_rate_peak, is_active) VALUES
    ('court_v1_1', 'venue_1', 'sport_badminton', 'Yonex Court 1 (Teak Wood)', 'Wooden Court', 350, 450, 1),
    ('court_v1_2', 'venue_1', 'sport_badminton', 'Yonex Court 2 (Synthetic Mat)', 'Synthetic Court', 300, 400, 1),
    ('court_v1_3', 'venue_1', 'sport_football', '5-a-Side Astro Turf Arena A', 'AstroTurf', 900, 1200, 1),
    ('court_v2_1', 'venue_2', 'sport_football', 'Champion 7-a-Side Football Pitch', 'Monofilament Turf', 1400, 1800, 1),
    ('court_v2_2', 'venue_2', 'sport_badminton', 'Apex Synthetic Court 1', 'Synthetic Court', 280, 380, 1),
    ('court_v3_1', 'venue_3', 'sport_cricket', 'Cricket Net Pitch A (Fast Bowling)', 'Box Net', 400, 500, 1),
    ('court_v3_2', 'venue_3', 'sport_cricket', 'Cricket Net Pitch B (Bowling Machine)', 'Machine Pitch', 550, 700, 1);`);

  // 8. Coupons
  await execute(`INSERT INTO coupons (id, code, discount_type, discount_value, min_booking_amount, max_discount, usage_limit, is_active) VALUES
    ('coupon_1', 'KHEL100', 'FIXED', 100, 300, 100, 500, 1),
    ('coupon_2', 'PATNA20', 'PERCENTAGE', 20, 400, 200, 300, 1),
    ('coupon_3', 'SMASH50', 'FIXED', 50, 250, 50, 200, 1);`);

  // 9. Games (Joinable Games / Player Community)
  const todayStr = new Date().toISOString().split('T')[0];

  await execute(`INSERT INTO games (id, share_code, host_id, venue_id, court_id, sport_id, date, start_time, end_time, price_per_player, max_players, current_players, skill_level, title, description, status) VALUES
    ('game_1', 'JOIN-BDM-8PM', 'user_player_1', 'venue_1', 'court_v1_1', 'sport_badminton', '${todayStr}', '20:00', '21:00', 120, 4, 2, 'Intermediate', 'Evening Doubles Badminton Smash', 'Looking for 2 intermediate players for friendly doubles match at Patliputra Arena. Cork shuttle provided.', 'OPEN'),
    ('game_2', 'JOIN-FTB-9PM', 'user_player_2', 'venue_2', 'court_v2_1', 'sport_football', '${todayStr}', '21:00', '22:00', 180, 10, 7, 'Open', 'Late Night 5v5 Turf Friendly', 'Fast-paced friendly football match in Kankarbagh. Bibs and match ball provided.', 'OPEN');`);

  await execute(`INSERT INTO game_participants (id, game_id, user_id, status) VALUES
    ('gp_1', 'game_1', 'user_player_1', 'JOINED'),
    ('gp_2', 'game_1', 'user_player_3', 'JOINED'),
    ('gp_3', 'game_2', 'user_player_2', 'JOINED');`);

  // 10. Sample Completed Booking & Ledger Entry
  const bookingCode = 'BK-PAT-' + Math.floor(100000 + Math.random() * 900000);
  await execute(`INSERT INTO bookings (id, booking_code, user_id, venue_id, court_id, date, start_time, end_time, court_price, discount_amount, platform_fee, tax_amount, total_amount, commission_rate, commission_amount, venue_payable, status, payment_method, qr_code_data, checked_in_at) VALUES
    ('booking_sample_1', '${bookingCode}', 'user_player_1', 'venue_1', 'court_v1_1', '${todayStr}', '18:00', '19:00', 450, 50, 15, 0, 415, 7.0, 31.5, 383.5, 'CONFIRMED', 'UPI_RAZORPAY', 'QR_${bookingCode}', CURRENT_TIMESTAMP);`);

  await execute(`INSERT INTO commission_ledgers (id, booking_id, venue_id, booking_amount, commission_rate, platform_commission, platform_fee, venue_payable) VALUES
    ('ledger_1', 'booking_sample_1', 'venue_1', 415, 7.0, 31.5, 15.0, 383.5);`);

  await execute(`INSERT INTO reviews (id, venue_id, booking_id, user_id, rating, comment) VALUES
    ('review_1', 'venue_1', 'booking_sample_1', 'user_player_1', 5, 'Excellent wooden badminton court! Good lighting and clean changing rooms in Patliputra.');`);

  await execute(`INSERT INTO audit_logs (actor_id, actor_role, action, resource, resource_id, metadata) VALUES
    ('user_admin', 'SUPER_ADMIN', 'SYSTEM_INIT', 'DATABASE', 'khelarena_db', '{"message": "Database successfully seeded with Patna initial marketplace data"}');`);

  await execute(`INSERT INTO system_settings (key, value, description) VALUES
    ('platform_commission_default', '7.0', 'Default platform commission percentage'),
    ('hold_duration_minutes', '5', 'Temporary slot reservation lock time in minutes'),
    ('support_phone', '+91 612 250 0000', 'KhelArena Patna Helpline');`);

  console.log('Seed completed successfully!');
}
