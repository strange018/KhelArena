import React from 'react';
import { useNotifications, ToastAlert } from '../context/NotificationContext';
import { CheckCircle2, Users, Bell, Sparkles, X, ArrowRight, Trophy } from 'lucide-react';

interface ToastAlertsContainerProps {
  onNavigateTab?: (tab: 'MARKETPLACE' | 'VENUE_DETAIL' | 'GAMES' | 'MY_BOOKINGS' | 'OWNER_PORTAL' | 'ADMIN_PANEL') => void;
}

export const ToastAlertsContainer: React.FC<ToastAlertsContainerProps> = ({ onNavigateTab }) => {
  const { toasts, dismissToast, markAsRead } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map((toast) => {
        const isBooking = toast.type === 'BOOKING_CONFIRMED';
        const isInvite = toast.type === 'GAME_INVITATION';

        return (
          <div
            key={toast.toastId}
            className="pointer-events-auto bg-white/98 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 transition-all duration-300 animate-slide-up flex flex-col space-y-2.5 relative group"
          >
            {/* Top Bar with Icon & Dismiss */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isBooking 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                    : isInvite 
                    ? 'bg-blue-100 text-blue-800 border-blue-200' 
                    : 'bg-purple-100 text-purple-800 border-purple-200'
                }`}>
                  {isBooking ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : isInvite ? (
                    <Users className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Trophy className="w-5 h-5 text-purple-600" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                      {isBooking ? 'Pass Confirmed' : isInvite ? 'Game Invite' : 'Notification'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-400 font-medium">{toast.timestamp}</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{toast.title}</h4>
                </div>
              </div>

              <button
                onClick={() => dismissToast(toast.toastId)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                title="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <p className="text-xs text-slate-600 leading-relaxed pl-11 font-medium">
              {toast.message}
            </p>

            {/* Action CTA Button */}
            {toast.actionTab && (
              <div className="pl-11 pt-1">
                <button
                  onClick={() => {
                    markAsRead(toast.id);
                    dismissToast(toast.toastId);
                    if (onNavigateTab && toast.actionTab) {
                      onNavigateTab(toast.actionTab);
                    }
                  }}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-2xs transition ${
                    isBooking 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                      : isInvite 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{isBooking ? 'View Pass & QR' : isInvite ? 'View Game Match' : 'Open Details'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
