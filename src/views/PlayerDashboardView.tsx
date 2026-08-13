import React, { useState, useEffect } from 'react';
import { Booking, User, Venue } from '../types';
import { api } from '../lib/api';
import { VenueCard } from '../components/VenueCard';
import { Calendar, QrCode, ShieldCheck, Trophy, AlertTriangle, CheckCircle2, Clock, Share2, Award, Heart, ArrowRight } from 'lucide-react';

interface PlayerDashboardViewProps {
  currentUser: User | null;
  venues?: Venue[];
  favoriteVenueIds?: string[];
  onSelectVenue?: (venue: Venue) => void;
  onToggleFavorite?: (venueId: string) => void;
  onExploreVenues?: () => void;
}

export const PlayerDashboardView: React.FC<PlayerDashboardViewProps> = ({
  currentUser,
  venues = [],
  favoriteVenueIds = [],
  onSelectVenue,
  onToggleFavorite,
  onExploreVenues
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForQR, setSelectedBookingForQR] = useState<Booking | null>(null);

  const savedVenues = venues.filter(v => favoriteVenueIds.includes(v.id));

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getMyBookings();
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? Refund policy will be applied.')) return;
    try {
      const res = await api.cancelBooking(bookingId, 'Player requested cancellation');
      alert(`Booking cancelled. Refund amount: ₹${res.refund_amount} (${res.refund_policy_applied})`);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Profile Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Card */}
        <div className="bg-gradient-to-br from-blue-50/90 via-white to-sky-50/40 rounded-3xl p-6 shadow-sm border border-blue-100/90 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
              {currentUser?.name.charAt(0) || 'P'}
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 font-display">{currentUser?.name || 'Player'}</h2>
              <p className="text-xs text-slate-500 font-mono">{currentUser?.phone}</p>
            </div>
          </div>
          <div className="text-[11px] text-blue-800 font-bold bg-blue-100/80 px-3 py-1 rounded-xl border border-blue-200 inline-block shadow-2xs">
            Role: {currentUser?.role} • Active Account
          </div>
        </div>

        {/* Reliability Score Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reliability Score</span>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {currentUser?.reliability_score || 98}<span className="text-sm font-normal text-slate-400"> / 100</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Based on check-ins, timely arrivals, and no-show history across Patna venues.
          </p>
        </div>

        {/* Referral Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referral Code</span>
            <Share2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-xl font-mono font-extrabold text-blue-600">
            PATNA-REF-{currentUser?.name.substring(0, 3).toUpperCase() || 'KHEL'}
          </div>
          <p className="text-[11px] text-slate-500">
            Share code with friends. They get ₹100 off, you earn ₹50 platform credit after their first completed booking!
          </p>
        </div>

      </div>

      {/* Saved / Favorited Sports Venues Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 font-display">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <span>Saved Sports Venues</span>
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {savedVenues.length} Saved
          </span>
        </div>

        {savedVenues.length === 0 ? (
          <div className="py-10 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <Heart className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">No saved venues yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Tap the heart icon on any venue card in Patna Marketplace to save your favorite turfs and courts for fast access here!
              </p>
            </div>
            {onExploreVenues && (
              <button
                onClick={onExploreVenues}
                className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
              >
                <span>Browse Venues</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedVenues.map(venue => (
              <VenueCard
                key={venue.id}
                venue={venue}
                isFavorite={true}
                onToggleFavorite={onToggleFavorite}
                onSelectVenue={(v) => {
                  if (onSelectVenue) onSelectVenue(v);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* My Bookings List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>My Court Bookings</span>
          </h2>
          <span className="text-xs text-slate-500 font-semibold">{bookings.length} Total Bookings</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs animate-pulse">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <p className="font-bold text-slate-800">No bookings yet</p>
            <p className="text-slate-400">Book your first court or turf in Patna today!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const isConfirmed = b.status === 'CONFIRMED' || b.status === 'CHECKED_IN';
              const isCheckedIn = b.status === 'CHECKED_IN';
              const isCancelled = b.status === 'CANCELLED';

              return (
                <div key={b.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-slate-900 text-sm">{b.booking_code}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isCheckedIn ? 'bg-purple-100 text-purple-800' :
                        isConfirmed ? 'bg-blue-100 text-blue-800' :
                        isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="font-extrabold text-slate-900 text-sm">{b.venue_name}</div>
                    <div className="text-slate-600">{b.court_name} • {b.date} ({b.start_time} - {b.end_time})</div>
                    <div className="text-slate-400 text-[11px]">{b.venue_address}</div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2 md:pt-0 border-t md:border-0 border-slate-200 justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Amount Paid</div>
                      <div className="text-base font-extrabold text-slate-900">₹{b.total_amount}</div>
                    </div>

                    {b.qr_image && (
                      <button
                        onClick={() => setSelectedBookingForQR(b)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-1.5"
                      >
                        <QrCode className="w-4 h-4 text-white" />
                        <span>View QR Pass</span>
                      </button>
                    )}

                    {isConfirmed && !isCheckedIn && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-2.5 rounded-xl border border-rose-200 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Pass View Modal */}
      {selectedBookingForQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Entry QR Code Pass</h3>
            <p className="text-xs text-slate-500">Booking Code: <strong>{selectedBookingForQR.booking_code}</strong></p>

            {selectedBookingForQR.qr_image && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
                <img src={selectedBookingForQR.qr_image} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>
            )}

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl text-left space-y-1">
              <div><strong>Venue:</strong> {selectedBookingForQR.venue_name}</div>
              <div><strong>Date & Time:</strong> {selectedBookingForQR.date} ({selectedBookingForQR.start_time} - {selectedBookingForQR.end_time})</div>
            </div>

            <button
              onClick={() => setSelectedBookingForQR(null)}
              className="w-full bg-slate-900 text-white font-bold py-2.5 text-xs rounded-xl"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
