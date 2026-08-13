import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, CheckCircle2, Users, Trophy, Sparkles, Check, Trash2, ArrowRight, ExternalLink } from 'lucide-react';

interface NotificationPopoverProps {
  onNavigateTab?: (tab: 'MARKETPLACE' | 'VENUE_DETAIL' | 'GAMES' | 'MY_BOOKINGS' | 'OWNER_PORTAL' | 'ADMIN_PANEL') => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onNavigateTab }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    notifyBookingConfirmed,
    notifyGameInvitation
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = notifications.filter(n => filter === 'ALL' || !n.read);

  // Quick Mock Simulators for Demo
  const handleSimulateBooking = () => {
    notifyBookingConfirmed({
      id: 'bk_sim_' + Date.now(),
      booking_code: 'KA-' + Math.floor(1000 + Math.random() * 9000),
      user_id: 'usr_player',
      venue_id: 'ven_patliputra',
      court_id: 'crt_1',
      venue_name: 'Patliputra Indoor Badminton Arena',
      venue_address: 'Patliputra Colony, Patna',
      court_name: 'Synthetic Court 1',
      sport_name: 'Badminton',
      date: '2026-08-15',
      start_time: '06:00 PM',
      end_time: '07:00 PM',
      court_price: 450,
      discount_amount: 0,
      platform_fee: 15,
      total_amount: 465,
      commission_rate: 10,
      commission_amount: 45,
      venue_payable: 405,
      status: 'CONFIRMED',
      created_at: new Date().toISOString()
    });
  };

  const handleSimulateInvite = () => {
    notifyGameInvitation({
      gameTitle: '5v5 Weekend Football Frenzy',
      hostName: 'Rahul Verma',
      shareCode: 'FOOTBALL5V5',
      venueName: 'Patna Turf Club, Kankarbagh',
      sportName: 'Football'
    });
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition shadow-2xs ${
          isOpen || unreadCount > 0 
            ? 'bg-blue-50 text-blue-700 border-blue-200' 
            : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200'
        }`}
        title="Notifications & Invites"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col max-h-[520px]">
          
          {/* Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-900 font-display">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Quick Demo Test Buttons */}
          <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Simulate Alert:</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleSimulateBooking}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition"
              >
                + Booking Pass
              </button>
              <button
                onClick={handleSimulateInvite}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition"
              >
                + Game Invite
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 bg-white">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filter === 'ALL' ? 'bg-slate-100 text-slate-900 font-extrabold' : 'hover:text-slate-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('UNREAD')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filter === 'UNREAD' ? 'bg-slate-100 text-slate-900 font-extrabold' : 'hover:text-slate-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No notifications to display.
              </div>
            ) : (
              filtered.map((notif) => {
                const isBooking = notif.type === 'BOOKING_CONFIRMED';
                const isInvite = notif.type === 'GAME_INVITATION';

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (onNavigateTab && notif.actionTab) {
                        onNavigateTab(notif.actionTab);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start space-x-3 ${
                      !notif.read ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isBooking 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : isInvite 
                        ? 'bg-blue-100 text-blue-800 border-blue-200' 
                        : 'bg-purple-100 text-purple-800 border-purple-200'
                    }`}>
                      {isBooking ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isInvite ? (
                        <Users className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Trophy className="w-4 h-4 text-purple-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className={`text-xs truncate ${!notif.read ? 'font-extrabold text-slate-900' : 'font-bold text-slate-700'}`}>
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ml-2"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                        {notif.message}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{notif.timestamp}</span>
                        {notif.actionTab && (
                          <span className="text-blue-600 font-bold hover:underline flex items-center space-x-0.5">
                            <span>Open</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
};
