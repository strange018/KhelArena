import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Venue } from '../types';
import { MapPin, Navigation, Compass, Phone, Calendar, ArrowRight, ExternalLink, Zap, Layers } from 'lucide-react';

interface VenueMapProps {
  venues: Venue[];
  selectedVenueId?: string | null;
  onSelectVenue: (venueId: string) => void;
  height?: string;
  className?: string;
}

// Patna Default Coordinates
const PATNA_CENTER: [number, number] = [25.6022, 85.1220];

// Helper to calculate distance in KM between two lat/lng points
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const VenueMap: React.FC<VenueMapProps> = ({
  venues,
  selectedVenueId,
  onSelectVenue,
  height = 'h-[460px]',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [activeVenue, setActiveVenue] = useState<Venue | null>(null);
  const [tileProvider, setTileProvider] = useState<'carto' | 'osm'>('carto');

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: PATNA_CENTER,
        zoom: 12,
        zoomControl: false, // We render custom clean controls
      });

      // CartoDB Voyager Clean Tiles
      const tileUrl = tileProvider === 'carto'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileAttribution = tileProvider === 'carto'
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; OpenStreetMap contributors';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: tileAttribution,
      }).addTo(map);

      // Store group for markers
      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer if provider changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    const tileUrl = tileProvider === 'carto'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(mapInstanceRef.current);
  }, [tileProvider]);

  // Update Venue Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    const bounds = L.latLngBounds([]);
    let validVenueCount = 0;

    venues.forEach((venue) => {
      const lat = venue.latitude || (PATNA_CENTER[0] + (Math.random() - 0.5) * 0.05);
      const lng = venue.longitude || (PATNA_CENTER[1] + (Math.random() - 0.5) * 0.05);

      bounds.extend([lat, lng]);
      validVenueCount++;

      const isSelected = selectedVenueId === venue.id || activeVenue?.id === venue.id;

      // Find lowest rate among courts
      const minPrice = venue.courts?.length 
        ? Math.min(...venue.courts.map(c => c.hourly_rate_offpeak || 300))
        : 300;

      // Create Custom Pill Div Icon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="group relative cursor-pointer flex flex-col items-center">
            <div class="px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-md border transition-all duration-200 flex items-center space-x-1 whitespace-nowrap ${
              isSelected 
                ? 'bg-blue-600 text-white border-blue-700 scale-110 ring-4 ring-blue-500/30 shadow-lg z-50' 
                : 'bg-white text-slate-900 border-slate-300 hover:border-blue-500 hover:text-blue-600 hover:scale-105'
            }">
              <span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'} inline-block"></span>
              <span>₹${minPrice}</span>
              <span class="text-[9px] opacity-80">/hr</span>
            </div>
            <div class="w-2 h-2 rotate-45 -mt-1 shadow-xs border-r border-b ${
              isSelected ? 'bg-blue-600 border-blue-700' : 'bg-white border-slate-300'
            }"></div>
          </div>
        `,
        iconSize: [80, 36],
        iconAnchor: [40, 36],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Click event
      marker.on('click', () => {
        setActiveVenue(venue);
        map.panTo([lat, lng], { animate: true, duration: 0.5 });
      });

      markersGroup.addLayer(marker);
    });

    // Auto-fit map to venue pins if there are venues
    if (validVenueCount > 0) {
      if (validVenueCount === 1) {
        const single = venues[0];
        map.setView([single.latitude || PATNA_CENTER[0], single.longitude || PATNA_CENTER[1]], 14);
      } else {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [venues, selectedVenueId, activeVenue]);

  // Handle User Geolocation
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserLocation([userLat, userLng]);
        setLocatingUser(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 14, { duration: 1.2 });

          // Add User Location Pulse Marker
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
              <div class="relative flex items-center justify-center w-6 h-6">
                <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
                <div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          L.marker([userLat, userLng], { icon: userIcon })
            .bindTooltip('Your Current Location', { permanent: true, direction: 'top', offset: [0, -10] })
            .addTo(mapInstanceRef.current);
        }
      },
      (err) => {
        setLocatingUser(false);
        console.warn('Geolocation error:', err.message);
        alert('Could not determine your exact location. Defaulting to Patna city center.');
      },
      { timeout: 8000 }
    );
  };

  const handleRecenterPatna = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(PATNA_CENTER, 12, { duration: 1 });
    }
  };

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden border border-slate-200/90 shadow-md ${className}`}>
      
      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-100" />

      {/* Floating Header Banner */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-md flex items-center space-x-2 text-xs font-bold text-slate-800">
        <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
        <span>Patna Venues Map</span>
        <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
          {venues.length} Locations
        </span>
      </div>

      {/* Top Right Controls (Zoom, Recenter, My Location, Tile Toggle) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col space-y-1.5">
        <button
          onClick={handleLocateUser}
          disabled={locatingUser}
          className="p-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 rounded-xl border border-slate-200 shadow-md transition flex items-center justify-center font-bold text-xs"
          title="Find My Location"
        >
          <Navigation className={`w-4 h-4 ${locatingUser ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        <button
          onClick={handleRecenterPatna}
          className="p-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 rounded-xl border border-slate-200 shadow-md transition flex items-center justify-center"
          title="Recenter Patna"
        >
          <Compass className="w-4 h-4" />
        </button>

        <button
          onClick={() => setTileProvider(prev => prev === 'carto' ? 'osm' : 'carto')}
          className="p-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 rounded-xl border border-slate-200 shadow-md transition flex items-center justify-center"
          title="Toggle Map Style"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Active Venue Bottom Preview Card */}
      {activeVenue && (
        <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/98 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <img 
              src={activeVenue.images?.[0] || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=300&q=80'} 
              alt={activeVenue.name}
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 text-xs text-blue-600 font-bold mb-0.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{activeVenue.area_name || 'Patna'}</span>
                {userLocation && activeVenue.latitude && activeVenue.longitude && (
                  <span className="text-slate-400 font-medium">
                    • {calculateDistanceKm(userLocation[0], userLocation[1], activeVenue.latitude, activeVenue.longitude)} km away
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 truncate">{activeVenue.name}</h4>
              <p className="text-[11px] text-slate-500 truncate">{activeVenue.address}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <button
              onClick={() => onSelectVenue(activeVenue.id)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5"
            >
              <span>View & Book Slots</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveVenue(null)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
