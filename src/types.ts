export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'PLAYER' | 'VENUE_OWNER' | 'VENUE_MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  reliability_score?: number;
  avatar_url?: string;
  city_id?: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  areas: Area[];
}

export interface Area {
  id: string;
  city_id: string;
  name: string;
  pincode?: string;
}

export interface Sport {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Court {
  id: string;
  venue_id: string;
  sport_id: string;
  sport_name?: string;
  sport_icon?: string;
  name: string;
  type: string;
  hourly_rate_offpeak: number;
  hourly_rate_peak: number;
  is_active: number;
}

export interface Venue {
  id: string;
  owner_id: string;
  city_id: string;
  area_id: string;
  city_name?: string;
  area_name?: string;
  owner_name?: string;
  owner_phone?: string;
  name: string;
  slug: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
  verification_status: 'PENDING' | 'VERIFICATION' | 'VERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  commission_rate: number;
  images: string[];
  facilities: string[];
  opening_time: string;
  closing_time: string;
  min_price?: number;
  avg_rating?: number;
  review_count?: number;
  courts?: Court[];
  reviews?: Review[];
}

export interface Slot {
  start_time: string;
  end_time: string;
  price: number;
  is_peak: boolean;
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'HELD';
  block_reason?: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  user_id: string;
  venue_id: string;
  court_id: string;
  venue_name?: string;
  venue_address?: string;
  court_name?: string;
  sport_name?: string;
  sport_icon?: string;
  date: string;
  start_time: string;
  end_time: string;
  court_price: number;
  discount_amount: number;
  platform_fee: number;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  venue_payable: number;
  status: 'HELD' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  held_until?: string;
  payment_method?: string;
  qr_code_data?: string;
  qr_image?: string;
  checked_in_at?: string;
  cancellation_reason?: string;
  created_at: string;
}

export interface GameParticipant {
  user_id: string;
  name: string;
  reliability_score?: number;
  joined_at?: string;
}

export interface Game {
  id: string;
  share_code: string;
  host_id: string;
  host_name?: string;
  host_reliability?: number;
  venue_id: string;
  venue_name?: string;
  venue_address?: string;
  area_name?: string;
  court_id: string;
  court_name?: string;
  sport_id: string;
  sport_name?: string;
  sport_icon?: string;
  date: string;
  start_time: string;
  end_time: string;
  price_per_player: number;
  max_players: number;
  current_players: number;
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Open';
  title: string;
  description?: string;
  status: 'OPEN' | 'FULL' | 'COMPLETED' | 'CANCELLED';
  participants?: GameParticipant[];
  created_at?: string;
}

export interface Review {
  id: string;
  venue_id: string;
  booking_id: string;
  user_id: string;
  reviewer_name?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_role?: string;
  action: string;
  resource: string;
  resource_id?: string;
  metadata?: string;
  ip_address?: string;
  created_at: string;
}
