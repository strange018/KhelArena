import React, { useState } from 'react';
import { User, City } from '../types';
import { NotificationPopover } from './NotificationPopover';
import { Trophy, MapPin, Users, Calendar, ShieldCheck, UserCheck, ChevronDown, Sparkles, LogOut, Check } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeCity: string;
  cities: City[];
  activeTab: 'MARKETPLACE' | 'GAMES' | 'MY_BOOKINGS' | 'OWNER_PORTAL' | 'ADMIN_PANEL';
  onSelectCity: (cityId: string) => void;
  onSelectTab: (tab: 'MARKETPLACE' | 'GAMES' | 'MY_BOOKINGS' | 'OWNER_PORTAL' | 'ADMIN_PANEL') => void;
  onSwitchDemoRole: (role: 'PLAYER' | 'VENUE_OWNER' | 'SUPER_ADMIN') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeCity,
  cities,
  activeTab,
  onSelectCity,
  onSelectTab,
  onSwitchDemoRole,
  onLogout
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showCityMenu, setShowCityMenu] = useState(false);

  const currentCityObj = cities.find(c => c.id === activeCity || c.name === activeCity) || cities[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Location Dropdown */}
          <div className="flex items-center space-x-5">
            <button 
              onClick={() => onSelectTab('MARKETPLACE')}
              className="flex items-center space-x-2.5 text-xl font-black tracking-tight text-slate-900 group focus:outline-none"
            >
              <div className="w-9 h-9 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 font-display">
                Khel<span className="text-blue-600">Arena</span>
              </span>
            </button>

            {/* City Selector Pill */}
            <div className="relative">
              <button
                onClick={() => setShowCityMenu(!showCityMenu)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-slate-700 border border-slate-200 transition"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-slate-800">{currentCityObj?.name || 'Patna'}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showCityMenu && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fade-in">
                  <div className="px-3.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Select Location</div>
                  {cities.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCity(c.id);
                        setShowCityMenu(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${c.id === activeCity ? 'text-blue-700 font-bold bg-blue-50/60' : 'text-slate-700'}`}
                    >
                      <span>{c.name}, {c.state}</span>
                      {c.id === 'city_patna' && (
                        <span className="text-[9px] bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded-full font-bold">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onSelectTab('MARKETPLACE')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'MARKETPLACE' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              Book Courts
            </button>

            <button
              onClick={() => onSelectTab('GAMES')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'GAMES' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Join Games</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded-full font-bold">Community</span>
            </button>

            {currentUser && (
              <button
                onClick={() => onSelectTab('MY_BOOKINGS')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'MY_BOOKINGS' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>My Bookings</span>
              </button>
            )}

            {(currentUser?.role === 'VENUE_OWNER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => onSelectTab('OWNER_PORTAL')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'OWNER_PORTAL' 
                    ? 'bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>Venue Partner</span>
              </button>
            )}

            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => onSelectTab('ADMIN_PANEL')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 ${
                  activeTab === 'ADMIN_PANEL' 
                    ? 'bg-purple-50 text-purple-800 border border-purple-200/80 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Right Controls: Role Switcher, Notifications & Account */}
          <div className="flex items-center space-x-3">
            
            {/* Notification Bell Popover */}
            <NotificationPopover onNavigateTab={onSelectTab} />

            {/* Demo Quick Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs"
                title="Switch persona for live demo testing"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-500 hidden sm:inline font-medium">Role:</span>
                <span className="font-extrabold text-slate-900">{currentUser?.role || 'Guest'}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fade-in divide-y divide-slate-100">
                  <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demo Persona Switcher</div>
                  
                  <button
                    onClick={() => {
                      onSwitchDemoRole('PLAYER');
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-blue-700">Player Mode</div>
                      <div className="text-[10px] text-slate-500">Book courts, join games & QR passes</div>
                    </div>
                    {currentUser?.role === 'PLAYER' && <Check className="w-4 h-4 text-blue-600" />}
                  </button>

                  <button
                    onClick={() => {
                      onSwitchDemoRole('VENUE_OWNER');
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-amber-700">Venue Owner Mode</div>
                      <div className="text-[10px] text-slate-500">Manage courts, inventory blocks & scanner</div>
                    </div>
                    {currentUser?.role === 'VENUE_OWNER' && <Check className="w-4 h-4 text-amber-600" />}
                  </button>

                  <button
                    onClick={() => {
                      onSwitchDemoRole('SUPER_ADMIN');
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-purple-700">Super Admin Mode</div>
                      <div className="text-[10px] text-slate-500">Venue approvals, GMV & audit log ledger</div>
                    </div>
                    {currentUser?.role === 'SUPER_ADMIN' && <Check className="w-4 h-4 text-purple-600" />}
                  </button>
                </div>
              )}
            </div>

            {/* Current User Info */}
            {currentUser && (
              <div className="flex items-center space-x-2.5 border-l border-slate-200 pl-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-extrabold flex items-center justify-center text-xs shadow-2xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{currentUser.phone}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};

