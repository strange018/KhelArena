import { User, City, Sport, Venue, Slot, Booking, Game, Review, AuditLog } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('khelarena_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('khelarena_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('khelarena_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  demoLogin: (role: string) => request<{ token: string; user: User }>('/auth/demo-login', { method: 'POST', body: JSON.stringify({ role }) }),
  getMe: () => request<{ user: User }>('/auth/me'),

  // Venues
  getCities: () => request<City[]>('/venues/cities'),
  getSports: () => request<Sport[]>('/venues/sports'),
  getVenues: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<Venue[]>(`/venues?${query}`);
  },
  getVenueDetail: (id: string) => request<Venue>(`/venues/${id}`),
  getCourtSlots: (venueId: string, courtId: string, date: string) => 
    request<{ court: any; date: string; slots: Slot[] }>(`/venues/${venueId}/courts/${courtId}/slots?date=${date}`),
  createVenue: (body: any) => request<{ id: string; message: string }>('/venues', { method: 'POST', body: JSON.stringify(body) }),
  addCourt: (venueId: string, body: any) => request<{ id: string; message: string }>(`/venues/${venueId}/courts`, { method: 'POST', body: JSON.stringify(body) }),
  blockInventorySlot: (venueId: string, body: any) => request<{ id: string; message: string }>(`/venues/${venueId}/inventory-block`, { method: 'POST', body: JSON.stringify(body) }),

  // Bookings
  holdSlot: (body: any) => request<{
    booking_id: string;
    booking_code: string;
    held_until: string;
    court_price: number;
    discount_amount: number;
    platform_fee: number;
    total_amount: number;
    razorpay_order_id: string;
  }>('/bookings/hold', { method: 'POST', body: JSON.stringify(body) }),

  confirmPayment: (body: any) => request<{
    success: boolean;
    booking: Booking;
    qr_image: string;
  }>('/bookings/confirm-payment', { method: 'POST', body: JSON.stringify(body) }),

  cancelBooking: (booking_id: string, reason?: string) => request<{
    message: string;
    refund_amount: number;
    refund_policy_applied: string;
  }>('/bookings/cancel', { method: 'POST', body: JSON.stringify({ booking_id, reason }) }),

  checkInPlayer: (body: { qr_code_data?: string; booking_code?: string }) => 
    request<{ success: boolean; message: string; booking: Booking }>('/bookings/check-in', { method: 'POST', body: JSON.stringify(body) }),

  getMyBookings: () => request<Booking[]>('/bookings/my-bookings'),

  // Games (Find Players / Community)
  createGame: (body: any) => request<{ game_id: string; share_code: string; message: string }>('/games', { method: 'POST', body: JSON.stringify(body) }),
  getGames: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<Game[]>(`/games?${query}`);
  },
  getGameByShareCode: (shareCode: string) => request<Game>(`/games/by-share-code/${shareCode}`),
  joinGame: (gameId: string) => request<{ success: boolean; message: string }>(`/games/${gameId}/join`, { method: 'POST' }),

  // Community & Extras
  validateCoupon: (code: string, amount?: number) => request<{
    valid: boolean;
    code: string;
    discount_type: string;
    discount_value: number;
    discount_calculated: number;
  }>('/community/coupons/validate', { method: 'POST', body: JSON.stringify({ code, amount }) }),

  submitReview: (body: any) => request<{ success: boolean; message: string; review?: Review; avg_rating?: number; review_count?: number }>('/community/reviews', { method: 'POST', body: JSON.stringify(body) }),
  joinWaitlist: (body: any) => request<{ success: boolean; message: string }>('/community/waitlist/join', { method: 'POST', body: JSON.stringify(body) }),
  submitSupportTicket: (body: any) => request<{ ticket_no: string; message: string }>('/community/support/tickets', { method: 'POST', body: JSON.stringify(body) }),
  submitDispute: (body: any) => request<{ dispute_id: string; message: string }>('/community/disputes', { method: 'POST', body: JSON.stringify(body) }),

  // Financials
  getVenueFinancials: (venueId: string) => request<{
    summary: { total_bookings: number; total_gmv: number; total_commission: number; net_earnings: number };
    recent_transactions: any[];
    settlements: any[];
  }>(`/financials/venue-summary/${venueId}`),

  // Admin
  getAdminDashboard: () => request<{
    kpis: {
      total_gmv: number;
      total_commission: number;
      total_platform_fees: number;
      take_rate: string;
      total_bookings: number;
      active_venues: number;
      pending_venues: number;
      total_players: number;
      venue_utilization: string;
    };
    sport_breakdown: any[];
  }>('/admin/dashboard'),

  getPendingVenues: () => request<Venue[]>('/admin/venues/pending'),
  verifyVenue: (id: string, body: any) => request<{ success: boolean; message: string }>(`/admin/venues/${id}/verify`, { method: 'POST', body: JSON.stringify(body) }),
  getAuditLogs: () => request<AuditLog[]>('/admin/audit-logs'),
  getSystemSettings: () => request<any[]>('/admin/settings'),
  updateSystemSetting: (key: string, value: string) => request<{ success: boolean; message: string }>('/admin/settings', { method: 'POST', body: JSON.stringify({ key, value }) })
};
