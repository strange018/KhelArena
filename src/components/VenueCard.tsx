import React from 'react';
import { Venue } from '../types';
import { Star, MapPin, Check, ShieldCheck, ArrowRight, Heart } from 'lucide-react';

interface VenueCardProps {
  venue: Venue;
  isFavorite?: boolean;
  onToggleFavorite?: (venueId: string) => void;
  onSelectVenue: (venue: Venue) => void;
}

export const VenueCard: React.FC<VenueCardProps> = ({
  venue,
  isFavorite = false,
  onToggleFavorite,
  onSelectVenue
}) => {
  const mainImage = venue.images && venue.images.length > 0
    ? venue.images[0]
    : 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80';

  return (
    <div 
      onClick={() => onSelectVenue(venue)}
      className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between relative"
    >
      <div>
        {/* Venue Image Frame */}
        <div className="relative h-52 w-full overflow-hidden bg-slate-900">
          <img 
            src={mainImage} 
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

          {/* Top Left Verified Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-slate-950/80 backdrop-blur-md text-blue-400 font-bold text-[11px] px-2.5 py-1 rounded-full shadow-sm border border-slate-700/60 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Verified Partner</span>
            </span>
          </div>

          {/* Top Right Actions: Favorite Heart + Rating Badge */}
          <div className="absolute top-3 right-3 flex items-center space-x-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleFavorite) onToggleFavorite(venue.id);
              }}
              className={`p-2 rounded-full backdrop-blur-md shadow-md transition-all duration-200 hover:scale-110 ${
                isFavorite 
                  ? 'bg-rose-500 text-white border border-rose-600' 
                  : 'bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-white border border-slate-200/60'
              }`}
              title={isFavorite ? 'Remove from Saved Venues' : 'Save to Favorites'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-white text-white' : ''}`} />
            </button>

            <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md flex items-center space-x-1 text-slate-900 font-bold text-xs">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{venue.avg_rating || 4.8}</span>
              <span className="text-slate-400 font-normal text-[11px]">({venue.review_count || 18})</span>
            </div>
          </div>

          {/* Bottom Overlay Location Tag */}
          <div className="absolute bottom-3 left-3 flex items-center space-x-1 text-white text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="line-clamp-1">{venue.area_name || 'Patna'}, Patna</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1.5 font-display">
            {venue.name}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {venue.address}
          </p>

          {/* Facility Pills */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {venue.facilities.slice(0, 3).map((f, i) => (
              <span key={i} className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center space-x-1">
                <Check className="w-3 h-3 text-blue-600 shrink-0" />
                <span>{f}</span>
              </span>
            ))}
            {venue.facilities.length > 3 && (
              <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-1 rounded-lg">
                +{venue.facilities.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Pricing & CTA */}
      <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between mt-auto">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Starting From</div>
          <div className="text-base font-extrabold text-slate-900 font-display">
            ₹{venue.min_price || 300}<span className="text-xs text-slate-500 font-normal"> / hour</span>
          </div>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSelectVenue(venue);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center space-x-1.5 group-hover:translate-x-0.5"
        >
          <span>View Availability</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

