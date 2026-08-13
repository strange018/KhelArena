import React, { createContext, useContext, useState, useEffect } from 'react';
import { Booking, Game } from '../types';

export interface NotificationItem {
  id: string;
  type: 'BOOKING_CONFIRMED' | 'GAME_INVITATION' | 'GAME_JOINED' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionTab?: 'MARKETPLACE' | 'VENUE_DETAIL' | 'GAMES' | 'MY_BOOKINGS' | 'OWNER_PORTAL' | 'ADMIN_PANEL';
  metadata?: {
    bookingCode?: string;
    venueName?: string;
    gameTitle?: string;
    shareCode?: string;
    sportName?: string;
  };
}

export interface ToastAlert extends NotificationItem {
  toastId: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  toasts: ToastAlert[];
  unreadCount: number;
  notifyBookingConfirmed: (booking: Booking) => void;
  notifyGameInvitation: (invite: { gameTitle?: string; hostName?: string; shareCode?: string; venueName?: string; sportName?: string }) => void;
  notifyGameJoined: (game: Partial<Game>) => void;
  notifyCustom: (payload: { title: string; message: string; type?: NotificationItem['type']; actionTab?: NotificationItem['actionTab']; metadata?: NotificationItem['metadata'] }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissToast: (toastId: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Initial mock notifications for rich initial demo
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_init_1',
    type: 'GAME_INVITATION',
    title: 'Match Invitation Received',
    message: 'Amit invited you to join "Badminton Doubles Smash" at Patliputra Sports Complex!',
    timestamp: '10 mins ago',
    read: false,
    actionTab: 'GAMES',
    metadata: {
      gameTitle: 'Badminton Doubles Smash',
      shareCode: 'SMASH2026',
      venueName: 'Patliputra Sports Complex',
      sportName: 'Badminton'
    }
  },
  {
    id: 'notif_init_2',
    type: 'BOOKING_CONFIRMED',
    title: 'Court Booking Confirmed',
    message: 'Your slot at Patna Turf Arena for 7:00 PM - 8:00 PM is locked. Pass #KA-9812 ready.',
    timestamp: '2 hours ago',
    read: false,
    actionTab: 'MY_BOOKINGS',
    metadata: {
      bookingCode: 'KA-9812',
      venueName: 'Patna Turf Arena',
      sportName: 'Box Cricket'
    }
  }
];

export const NotificationProvider: React.FC<{ children: React.ReactNode; onNavigateTab?: (tab: any) => void }> = ({
  children,
  onNavigateTab
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const pushNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    const formattedTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newNotif: NotificationItem = {
      ...item,
      id: newId,
      timestamp: `Today at ${formattedTime}`,
      read: false
    };

    setNotifications(prev => [newNotif, ...prev]);

    // Active Toast Alert
    const newToast: ToastAlert = {
      ...newNotif,
      toastId
    };

    setToasts(prev => [newToast, ...prev]);

    // Play subtle audio beep if browser permissions allow
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio context might be restricted before user interaction
    }

    // Auto-dismiss toast after 6 seconds
    setTimeout(() => {
      dismissToast(toastId);
    }, 6000);
  };

  const dismissToast = (toastId: string) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  };

  const notifyBookingConfirmed = (booking: Booking) => {
    pushNotification({
      type: 'BOOKING_CONFIRMED',
      title: '🎉 Booking Confirmed!',
      message: `Pass #${booking.booking_code || 'KA-8810'} for ${booking.venue_name || 'Court Venue'} on ${booking.date} (${booking.start_time}) is ready.`,
      actionTab: 'MY_BOOKINGS',
      metadata: {
        bookingCode: booking.booking_code,
        venueName: booking.venue_name,
        sportName: booking.sport_name
      }
    });
  };

  const notifyGameInvitation = (invite: { gameTitle?: string; hostName?: string; shareCode?: string; venueName?: string; sportName?: string }) => {
    pushNotification({
      type: 'GAME_INVITATION',
      title: '⚽ New Game Invitation!',
      message: `${invite.hostName || 'A player'} invited you to join "${invite.gameTitle || 'Match Session'}" at ${invite.venueName || 'Patna Arena'}.`,
      actionTab: 'GAMES',
      metadata: {
        gameTitle: invite.gameTitle,
        shareCode: invite.shareCode,
        venueName: invite.venueName,
        sportName: invite.sportName
      }
    });
  };

  const notifyGameJoined = (game: Partial<Game>) => {
    pushNotification({
      type: 'GAME_JOINED',
      title: '🏆 Joined Community Match!',
      message: `You are officially on the squad for "${game.title || 'Community Game'}". Check details in Join Games tab.`,
      actionTab: 'GAMES',
      metadata: {
        gameTitle: game.title,
        shareCode: game.share_code,
        venueName: game.venue_name,
        sportName: game.sport_name
      }
    });
  };

  const notifyCustom = (payload: { title: string; message: string; type?: NotificationItem['type']; actionTab?: NotificationItem['actionTab']; metadata?: NotificationItem['metadata'] }) => {
    pushNotification({
      type: payload.type || 'SYSTEM',
      title: payload.title,
      message: payload.message,
      actionTab: payload.actionTab || 'MARKETPLACE',
      metadata: payload.metadata
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        unreadCount,
        notifyBookingConfirmed,
        notifyGameInvitation,
        notifyGameJoined,
        notifyCustom,
        markAsRead,
        markAllAsRead,
        dismissToast,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};
