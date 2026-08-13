import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Venue, Sport, City, Booking } from './types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from './lib/api';
import { NotificationProvider } from './context/NotificationContext';
import { ToastAlertsContainer } from './components/ToastAlertsContainer';
import { Navbar } from './components/Navbar';
import { MarketplaceView } from './views/MarketplaceView';
import { VenueDetailView } from './views/VenueDetailView';
import { JoinGamesView } from './views/JoinGamesView';
import { PlayerDashboardView } from './views/PlayerDashboardView';
import { VenueOwnerView } from './views/VenueOwnerView';
import { AdminView } from './views/AdminView';
import { Trophy, Phone, ShieldCheck, Heart } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  const [activeCityId, setActiveCityId] = useState<string>('city_patna');
  const [activeTab, setActiveTab] = useState<'MARKETPLACE' | 'VENUE_DETAIL' | 'GAMES' | 'MY_BOOKINGS' | 'OWNER_PORTAL' | 'ADMIN_PANEL'>('MARKETPLACE');

  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  // Favorites state with localStorage persistence
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('khelarena_favorite_venues');
      return saved ? JSON.parse(saved) : ['ven_patliputra'];
    } catch {
      return ['ven_patliputra'];
    }
  });

  const handleToggleFavorite = (venueId: string) => {
    setFavoriteVenueIds(prev => {
      const isFav = prev.includes(venueId);
      const updated = isFav ? prev.filter(id => id !== venueId) : [...prev, venueId];
      try {
        localStorage.setItem('khelarena_favorite_venues', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update localStorage favorites:', e);
      }
      return updated;
    });
  };

  // Initialize App state
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      // 1. Check existing session token or quick demo login as Player
      let token = getAuthToken();
      if (!token) {
        const demoRes = await api.demoLogin('PLAYER');
        setAuthToken(demoRes.token);
        setCurrentUser(demoRes.user);
      } else {
        try {
          const me = await api.getMe();
          setCurrentUser(me.user);
        } catch {
          const demoRes = await api.demoLogin('PLAYER');
          setAuthToken(demoRes.token);
          setCurrentUser(demoRes.user);
        }
      }

      // 2. Fetch Cities, Sports, Venues
      const [citiesData, sportsData, venuesData] = await Promise.all([
        api.getCities(),
        api.getSports(),
        api.getVenues({ city: 'city_patna' })
      ]);

      setCities(citiesData);
      setSports(sportsData);
      setVenues(venuesData);

      // Check URL for deep link query param (?venue=ID)
      const params = new URLSearchParams(window.location.search);
      const deepLinkVenueId = params.get('venue') || params.get('venue_id');
      if (deepLinkVenueId) {
        const matchedVenue = venuesData.find(v => v.id === deepLinkVenueId);
        if (matchedVenue) {
          setSelectedVenue(matchedVenue);
          setActiveTab('VENUE_DETAIL');
        }
      }
    } catch (err) {
      console.error('Failed to initialize KhelArena:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchDemoRole = async (role: 'PLAYER' | 'VENUE_OWNER' | 'SUPER_ADMIN') => {
    try {
      const res = await api.demoLogin(role);
      setAuthToken(res.token);
      setCurrentUser(res.user);

      if (role === 'VENUE_OWNER') {
        setActiveTab('OWNER_PORTAL');
      } else if (role === 'SUPER_ADMIN') {
        setActiveTab('ADMIN_PANEL');
      } else {
        setActiveTab('MARKETPLACE');
      }
    } catch (err) {
      console.error('Failed to switch demo role:', err);
    }
  };

  const handleSelectVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setActiveTab('VENUE_DETAIL');
    try {
      window.history.replaceState({}, '', `${window.location.pathname}?venue=${venue.id}`);
    } catch {
      // Ignore if iframe origin restricts history replace
    }
  };

  const handleBookingComplete = (booking: Booking, qrImage: string) => {
    setActiveTab('MY_BOOKINGS');
  };

  const refreshVenues = async () => {
    const venuesData = await api.getVenues({ city: activeCityId });
    setVenues(venuesData);
  };

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
        
        {/* Floating Toast Alerts Stack */}
        <ToastAlertsContainer onNavigateTab={setActiveTab} />

        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          activeCity={activeCityId}
          cities={cities}
          activeTab={activeTab === 'VENUE_DETAIL' ? 'MARKETPLACE' : activeTab}
          onSelectCity={(cityId) => {
            setActiveCityId(cityId);
            api.getVenues({ city: cityId }).then(setVenues);
          }}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'MARKETPLACE') setSelectedVenue(null);
          }}
          onSwitchDemoRole={handleSwitchDemoRole}
          onLogout={() => {
            removeAuthToken();
            setCurrentUser(null);
            handleSwitchDemoRole('PLAYER');
          }}
        />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1">
        
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Trophy className="w-10 h-10 text-blue-600 animate-bounce mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading KhelArena Patna Platform...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              {activeTab === 'MARKETPLACE' && (
                <MarketplaceView
                  venues={venues}
                  sports={sports}
                  cities={cities}
                  activeCityId={activeCityId}
                  favoriteVenueIds={favoriteVenueIds}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectVenue={handleSelectVenue}
                  onSelectTab={setActiveTab}
                />
              )}

              {activeTab === 'VENUE_DETAIL' && selectedVenue && (
                <VenueDetailView
                  venue={selectedVenue}
                  currentUser={currentUser}
                  isFavorite={favoriteVenueIds.includes(selectedVenue.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onBack={() => {
                    setActiveTab('MARKETPLACE');
                    try {
                      window.history.replaceState({}, '', window.location.pathname);
                    } catch {}
                  }}
                  onBookingComplete={handleBookingComplete}
                  onVenueUpdated={(updatedVenue) => {
                    setSelectedVenue(updatedVenue);
                    setVenues(prev => prev.map(v => v.id === updatedVenue.id ? updatedVenue : v));
                  }}
                />
              )}

              {activeTab === 'GAMES' && (
                <JoinGamesView
                  currentUser={currentUser}
                  venues={venues}
                  sports={sports}
                />
              )}

              {activeTab === 'MY_BOOKINGS' && (
                <PlayerDashboardView
                  currentUser={currentUser}
                  venues={venues}
                  favoriteVenueIds={favoriteVenueIds}
                  onSelectVenue={handleSelectVenue}
                  onToggleFavorite={handleToggleFavorite}
                  onExploreVenues={() => setActiveTab('MARKETPLACE')}
                />
              )}

              {activeTab === 'OWNER_PORTAL' && (
                <VenueOwnerView
                  currentUser={currentUser}
                  venues={venues}
                  onRefreshVenues={refreshVenues}
                />
              )}

              {activeTab === 'ADMIN_PANEL' && (
                <AdminView />
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white text-slate-600 text-xs border-t border-slate-200/90 py-10 mt-16 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="font-extrabold text-slate-900 text-base flex items-center justify-center md:justify-start space-x-2 font-display">
              <Trophy className="w-4 h-4 text-blue-600" />
              <span>KhelArena • Patna, Bihar</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              The premier sports court booking & community game platform for Patna.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-semibold text-slate-600">
            <span className="hover:text-slate-900 cursor-pointer">Cancellation Policy</span>
            <span className="hover:text-slate-900 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-900 cursor-pointer">Privacy Policy</span>
            <span className="flex items-center space-x-1 text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/80">
              <Phone className="w-3 h-3 text-blue-600" />
              <span>Patna Helpline: +91 612 250 0000</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            © 2026 KhelArena Technologies Inc. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
    </NotificationProvider>
  );
}

export default App;
