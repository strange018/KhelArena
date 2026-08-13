-- KhelArena Database Schema (Normalized Relational SQL)

CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pincode TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('PLAYER', 'VENUE_OWNER', 'VENUE_MANAGER', 'ADMIN', 'SUPER_ADMIN')),
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'BLOCKED')),
  reliability_score INTEGER DEFAULT 100,
  avatar_url TEXT,
  city_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  PRIMARY KEY (role, permission_code)
);

CREATE TABLE IF NOT EXISTS sports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  city_id TEXT NOT NULL,
  area_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  verification_status TEXT DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'VERIFICATION', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REJECTED')),
  commission_rate REAL DEFAULT 7.0,
  images TEXT NOT NULL, -- JSON array of image URLs
  facilities TEXT NOT NULL, -- JSON array of strings
  opening_time TEXT DEFAULT '06:00',
  closing_time TEXT DEFAULT '23:00',
  bank_account_no TEXT,
  bank_ifsc TEXT,
  bank_account_holder TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (city_id) REFERENCES cities(id),
  FOREIGN KEY (area_id) REFERENCES areas(id)
);

CREATE TABLE IF NOT EXISTS courts (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL,
  sport_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Standard',
  hourly_rate_offpeak REAL NOT NULL,
  hourly_rate_peak REAL NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
  FOREIGN KEY (sport_id) REFERENCES sports(id)
);

CREATE TABLE IF NOT EXISTS availability_blocks (
  id TEXT PRIMARY KEY,
  court_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL, -- HH:MM
  reason TEXT NOT NULL, -- 'MAINTENANCE', 'EXTERNAL_BOOKING', 'WALK_IN', 'OWNER_RESERVED'
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_code TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  court_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL, -- HH:MM
  court_price REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  platform_fee REAL DEFAULT 15,
  tax_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  commission_rate REAL NOT NULL,
  commission_amount REAL NOT NULL,
  venue_payable REAL NOT NULL,
  status TEXT DEFAULT 'HELD' CHECK(status IN ('HELD', 'PAYMENT_PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  held_until DATETIME,
  payment_method TEXT,
  qr_code_data TEXT UNIQUE,
  checked_in_at DATETIME,
  cancellation_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (court_id) REFERENCES courts(id)
);

-- Index & Unique Constraint for Concurrency & Double Booking Protection
CREATE UNIQUE INDEX IF NOT EXISTS idx_court_active_slot 
ON bookings (court_id, date, start_time) 
WHERE status IN ('HELD', 'PAYMENT_PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED');

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  razorpay_order_id TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'CREATED' CHECK(status IN ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  signature TEXT,
  gateway_fee REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commission_ledgers (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,
  venue_id TEXT NOT NULL,
  booking_amount REAL NOT NULL,
  commission_rate REAL NOT NULL,
  platform_commission REAL NOT NULL,
  platform_fee REAL NOT NULL,
  venue_payable REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  settlement_code TEXT UNIQUE NOT NULL,
  venue_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_bookings_count INTEGER NOT NULL,
  total_gmv REAL NOT NULL,
  total_commission REAL NOT NULL,
  total_refunds_deducted REAL DEFAULT 0,
  net_payable REAL NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'ON_HOLD')),
  bank_reference_no TEXT,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED')),
  processed_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  share_code TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  court_id TEXT NOT NULL,
  booking_id TEXT,
  sport_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  price_per_player REAL NOT NULL,
  max_players INTEGER NOT NULL,
  current_players INTEGER DEFAULT 1,
  skill_level TEXT DEFAULT 'Intermediate' CHECK(skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'Open')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'FULL', 'COMPLETED', 'CANCELLED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (court_id) REFERENCES courts(id),
  FOREIGN KEY (sport_id) REFERENCES sports(id)
);

CREATE TABLE IF NOT EXISTS game_participants (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'JOINED' CHECK(status IN ('JOINED', 'LEFT', 'REMOVED')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(game_id, user_id)
);

CREATE TABLE IF NOT EXISTS waitlists (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL,
  court_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'WAITING' CHECK(status IN ('WAITING', 'NOTIFIED', 'CLAIMED', 'EXPIRED')),
  reserved_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (court_id) REFERENCES courts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value REAL NOT NULL,
  min_booking_amount REAL DEFAULT 0,
  max_discount REAL,
  sport_id TEXT,
  venue_id TEXT,
  usage_limit INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  expires_at DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  booking_id TEXT UNIQUE NOT NULL,
  discount_applied REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL,
  booking_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_no TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  booking_id TEXT,
  subject TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED')),
  priority TEXT DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,
  complainant_id TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence TEXT,
  venue_response TEXT,
  status TEXT DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED', 'UNDER_REVIEW', 'RESOLVED_REFUND', 'RESOLVED_REJECTED')),
  admin_decision TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (complainant_id) REFERENCES users(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  metadata TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
