import React, { useState } from 'react';
import { Venue, Sport, City } from '../types';
import { VenueCard } from '../components/VenueCard';
import { VenueMap } from '../components/VenueMap';
import { Search, MapPin, Trophy, Sparkles, Filter, ShieldCheck, Zap, X, Map as MapIcon, LayoutGrid, Columns, Heart, Check } from 'lucide-react';

interface MarketplaceViewProps {
  venues: Venue[];
  sports: Sport[];
  cities: City[];
  activeCityId: string;
  favoriteVenueIds: string[];
  onToggleFavorite: (venueId: string) => void;
  onSelectVenue: (venue: Venue) => void;
  onSelectTab: (tab: any) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  venues,
  sports,
  cities,
  activeCityId,
  favoriteVenueIds,
  onToggleFavorite,
  onSelectVenue,
  onSelectTab
}) => {
  const [selectedSportSlugs, setSelectedSportSlugs] = useState<string[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'GRID' | 'MAP'>('SPLIT');
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);

  const currentCityObj = cities.find(c => c.id === activeCityId || c.name === activeCityId) || cities[0];
  const areas = currentCityObj?.areas || [];

  const handleToggleSport = (slug: string) => {
    setShowSavedOnly(false);
    setSelectedSportSlugs(prev => {
      if (prev.includes(slug)) {
        return prev.filter(s => s !== slug);
      } else {
        return [...prev, slug];
      }
    });
  };

  const handleSelectAllSports = () => {
    setSelectedSportSlugs([]);
    setShowSavedOnly(false);
  };

  // Filter Venues
  const filteredVenues = venues.filter(venue => {
    // Saved filter
    if (showSavedOnly && !favoriteVenueIds.includes(venue.id)) return false;

    // Multi-sport match: matches if no sports selected OR venue has court matching ANY selected sport
    const matchesSport = selectedSportSlugs.length === 0 || venue.courts?.some(c => 
      selectedSportSlugs.includes(c.sport_slug) || selectedSportSlugs.includes(c.sport_id)
    );

    // Area match
    const matchesArea = selectedAreaId === 'ALL' || venue.area_id === selectedAreaId;
    
    // Text search match (by venue name, address, area name, city name, facility, or sport/court name)
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      venue.name.toLowerCase().includes(query) || 
      venue.address.toLowerCase().includes(query) ||
      (venue.area_name && venue.area_name.toLowerCase().includes(query)) ||
      (venue.city_name && venue.city_name.toLowerCase().includes(query)) ||
      venue.facilities?.some(f => f.toLowerCase().includes(query)) ||
      venue.courts?.some(c => (c.sport_name && c.sport_name.toLowerCase().includes(query)) || c.name.toLowerCase().includes(query));

    return matchesSport && matchesArea && matchesSearch;
  });

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedSportSlugs([]);
    setSelectedAreaId('ALL');
    setShowSavedOnly(false);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Header Banner */}
      <section className="relative bg-gradient-to-br from-blue-50/90 via-sky-50/30 to-slate-50 text-slate-900 rounded-3xl p-8 sm:p-12 overflow-hidden shadow-sm border border-blue-100/80">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-blue-100/80 border border-blue-200/80 text-blue-800 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Patna's Premier Sports Booking Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight font-display text-slate-900">
            Book Courts. <br />
            <span className="text-blue-600">Join Players. Play On.</span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
            Instant booking for Badminton courts, Football turfs, and Cricket nets across Kankarbagh, Patliputra, Boring Road & Bailey Road with instant slot confirmation and local player matchmaking.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button 
              onClick={() => onSelectTab('GAMES')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all flex items-center space-x-2 font-display"
            >
              <Trophy className="w-4 h-4" />
              <span>Join Community Games</span>
            </button>

            <a 
              href="#venues"
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 font-bold text-xs sm:text-sm px-5 py-3.5 rounded-2xl shadow-2xs transition"
            >
              Browse Patna Venues
            </a>
          </div>

          {/* Quick Stats Trust Bar */}
          <div className="pt-4 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-xs font-semibold text-slate-600 max-w-lg">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Verified Venues</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Instant Pass</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Trophy className="w-4 h-4 text-blue-600 shrink-0" />
              <span>No Double Bookings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sport Category Pills - Multi-Select Toggleable Chips */}
      <section className="space-y-3 bg-white/70 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
              Filter Sports
            </h2>
            {selectedSportSlugs.length > 0 && (
              <span className="bg-blue-100 text-blue-800 font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-blue-200">
                {selectedSportSlugs.length} selected
              </span>
            )}
          </div>

          {selectedSportSlugs.length > 0 && (
            <button
              onClick={handleSelectAllSports}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
            >
              Clear sports selection
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {/* All Sports Chip */}
          <button
            onClick={handleSelectAllSports}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
              selectedSportSlugs.length === 0 && !showSavedOnly
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Sports
          </button>

          {/* Saved / Favorites Filter Pill */}
          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center space-x-1.5 cursor-pointer ${
              showSavedOnly 
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-white text-white' : 'text-rose-500'}`} />
            <span>Saved Venues ({favoriteVenueIds.length})</span>
          </button>

          {/* Individual Toggleable Sport Chips */}
          {sports.map(sport => {
            const isSelected = selectedSportSlugs.includes(sport.slug);

            return (
              <button
                key={sport.id}
                onClick={() => handleToggleSport(sport.slug)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center space-x-2 cursor-pointer ${
                  isSelected && !showSavedOnly
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
                title={isSelected ? `Deselect ${sport.name}` : `Select ${sport.name}`}
              >
                {isSelected && !showSavedOnly && (
                  <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                )}
                <span>{sport.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Search & Location Filter Bar */}
      <section id="venues" className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Text-based Search Input for Venue Name or Location */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search venues by name, area (e.g. Kankarbagh, Boring Road), or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition"
                title="Clear search text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Area Filter Dropdown */}
          <div className="w-full md:w-64">
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer transition-all"
              >
                <option value="ALL">All Patna Areas</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Active Search & Filter Indicators */}
        {(searchQuery || selectedAreaId !== 'ALL' || selectedSportSlugs.length > 0 || showSavedOnly) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-500">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-bold">
                  <span>Search: "{searchQuery}"</span>
                  <button onClick={handleClearSearch} className="hover:text-blue-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedAreaId !== 'ALL' && (
                <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-bold">
                  <span>Area: {areas.find(a => a.id === selectedAreaId)?.name}</span>
                  <button onClick={() => setSelectedAreaId('ALL')} className="hover:text-slate-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {showSavedOnly && (
                <span className="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg font-bold">
                  <span>Saved Venues Only</span>
                  <button onClick={() => setShowSavedOnly(false)} className="hover:text-rose-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedSportSlugs.map(slug => {
                const sportObj = sports.find(s => s.slug === slug);
                return (
                  <span key={slug} className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-bold">
                    <span>Sport: {sportObj?.name || slug}</span>
                    <button onClick={() => handleToggleSport(slug)} className="hover:text-blue-950 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>

            <button
              onClick={resetAllFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline transition"
            >
              Reset all filters
            </button>
          </div>
        )}
      </section>

      {/* Venue Section Header & View Controls */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center space-x-2">
            <span>Available Venues</span>
            <span className="bg-blue-100 text-blue-800 font-black text-xs px-2.5 py-0.5 rounded-full">
              {filteredVenues.length}
            </span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto text-xs font-bold">
            <button
              onClick={() => setViewMode('SPLIT')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'SPLIT' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Split View (Map + Cards)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>

            <button
              onClick={() => setViewMode('MAP')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'MAP' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Full Map View"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map Only</span>
            </button>

            <button
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'GRID' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid Only</span>
            </button>
          </div>
        </div>

        {filteredVenues.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm space-y-3">
            <Filter className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800 font-display">No venues match your search criteria</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any courts matching "{searchQuery}". Try searching for another name, area (e.g., Kankarbagh, Patliputra), or clear your active filters.
            </p>
            <button
              onClick={resetAllFilters}
              className="mt-2 inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <span>Reset Search & Filters</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Map Only Mode */}
            {viewMode === 'MAP' && (
              <VenueMap 
                venues={filteredVenues}
                selectedVenueId={hoveredVenueId}
                onSelectVenue={(id) => {
                  const target = venues.find(v => v.id === id);
                  if (target) onSelectVenue(target);
                }}
                height="h-[560px]"
              />
            )}

            {/* Split View Mode (Map + Grid) */}
            {viewMode === 'SPLIT' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Map Column */}
                <div className="lg:col-span-5 lg:sticky lg:top-20">
                  <VenueMap 
                    venues={filteredVenues}
                    selectedVenueId={hoveredVenueId}
                    onSelectVenue={(id) => {
                      const target = venues.find(v => v.id === id);
                      if (target) onSelectVenue(target);
                    }}
                    height="h-[480px]"
                  />
                </div>

                {/* Cards Column */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredVenues.map(venue => (
                    <div 
                      key={venue.id}
                      onMouseEnter={() => setHoveredVenueId(venue.id)}
                      onMouseLeave={() => setHoveredVenueId(null)}
                      className={`transition-all duration-200 rounded-2xl ${
                        hoveredVenueId === venue.id ? 'ring-2 ring-blue-500/80 shadow-md scale-[1.01]' : ''
                      }`}
                    >
                      <VenueCard 
                        venue={venue} 
                        isFavorite={favoriteVenueIds.includes(venue.id)}
                        onToggleFavorite={onToggleFavorite}
                        onSelectVenue={onSelectVenue} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid Only Mode */}
            {viewMode === 'GRID' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVenues.map(venue => (
                  <VenueCard 
                    key={venue.id} 
                    venue={venue} 
                    isFavorite={favoriteVenueIds.includes(venue.id)}
                    onToggleFavorite={onToggleFavorite}
                    onSelectVenue={onSelectVenue} 
                  />
                ))}
              </div>
            )}

          </div>
        )}
      </section>

    </div>
  );
};


