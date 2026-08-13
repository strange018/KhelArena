import React, { useState, useEffect } from 'react';
import { Venue, Slot, Booking, User, Review } from '../types';
import { api } from '../lib/api';
import { SlotPicker } from '../components/SlotPicker';
import { BookingModal } from '../components/BookingModal';
import { ReviewSection } from '../components/ReviewSection';
import { ImageGallery } from '../components/ImageGallery';
import { Star, MapPin, Phone, Check, ShieldCheck, ArrowLeft, Info, Calendar, Heart, Share2 } from 'lucide-react';

interface VenueDetailViewProps {
  venue: Venue;
  currentUser: User | null;
  isFavorite?: boolean;
  onToggleFavorite?: (venueId: string) => void;
  onBack: () => void;
  onBookingComplete: (booking: Booking, qrImage: string) => void;
  onVenueUpdated?: (updatedVenue: Venue) => void;
}

export const VenueDetailView: React.FC<VenueDetailViewProps> = ({
  venue,
  currentUser,
  isFavorite = false,
  onToggleFavorite,
  onBack,
  onBookingComplete,
  onVenueUpdated
}) => {
  const courts = venue.courts || [];
  const [selectedCourtId, setSelectedCourtId] = useState<string>(courts[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [currentVenue, setCurrentVenue] = useState<Venue>(venue);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCurrentVenue(venue);
  }, [venue]);

  const handleShare = async () => {
    const deepLink = `${window.location.origin}${window.location.pathname}?venue=${currentVenue.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentVenue.name,
          text: `Book sports courts at ${currentVenue.name} in Patna on KhelArena!`,
          url: deepLink,
        });
        return;
      } catch (err) {
        // User cancelled native share, fall back to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = deepLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Fetch slots whenever Court or Date changes
  useEffect(() => {
    if (!selectedCourtId) return;
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const res = await api.getCourtSlots(currentVenue.id, selectedCourtId, selectedDate);
        setSlots(res.slots);
      } catch (err) {
        console.error('Failed to fetch slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [currentVenue.id, selectedCourtId, selectedDate]);

  const handleReviewSubmitted = (newReview: Review, newAvgRating: number, newReviewCount: number) => {
    const updatedReviews = [newReview, ...(currentVenue.reviews || [])];
    const updatedVenue: Venue = {
      ...currentVenue,
      reviews: updatedReviews,
      avg_rating: newAvgRating,
      review_count: newReviewCount
    };
    setCurrentVenue(updatedVenue);
    if (onVenueUpdated) {
      onVenueUpdated(updatedVenue);
    }
  };

  const selectedCourtObj = courts.find(c => c.id === selectedCourtId) || courts[0];

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Header Navigation & Share bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200/90 px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Courts</span>
        </button>

        <button
          onClick={handleShare}
          className={`inline-flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl border shadow-xs transition-all duration-200 cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/90'
          }`}
        >
          {copied ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4 text-blue-600" />}
          <span>{copied ? 'Deep Link Copied!' : 'Share Venue'}</span>
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Photos, Details, Amenities & Reviews */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Interactive Multi-photo Image Gallery */}
          <ImageGallery
            images={currentVenue.images}
            venueName={currentVenue.name}
            isFavorite={isFavorite}
            onToggleFavorite={() => {
              if (onToggleFavorite) onToggleFavorite(venue.id);
            }}
            onShare={handleShare}
            isCopied={copied}
            avgRating={currentVenue.avg_rating || 4.8}
            reviewCount={currentVenue.review_count || (currentVenue.reviews?.length || 18)}
          />

          {/* Main Details Frame */}
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs p-6 space-y-4">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-semibold mb-1">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>{currentVenue.area_name || 'Patna'}, Patna, Bihar</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                    {currentVenue.name}
                  </h1>
                </div>

                {/* Inline Share CTA Button */}
                <button
                  onClick={handleShare}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition cursor-pointer ${
                    copied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-blue-600" />}
                  <span>{copied ? 'Link Copied!' : 'Share'}</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                {currentVenue.address}
              </p>

              {/* Operating Hours & Contact */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Open: {currentVenue.opening_time} - {currentVenue.closing_time}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span>{currentVenue.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amenities & Features */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 font-display">Amenities & Facilities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {currentVenue.facilities.map((fac, i) => (
                <div key={i} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{fac}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Customer Reviews Component */}
          <ReviewSection
            venue={currentVenue}
            currentUser={currentUser}
            onReviewSubmitted={handleReviewSubmitted}
          />

        </div>

        {/* Right Column: Slot Picker & Booking Summary */}
        <div className="space-y-6">
          
          <SlotPicker
            courts={courts}
            selectedCourtId={selectedCourtId}
            selectedDate={selectedDate}
            slots={slots}
            selectedSlot={selectedSlot}
            loading={loadingSlots}
            onSelectCourt={(id) => {
              setSelectedCourtId(id);
              setSelectedSlot(null);
            }}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setSelectedSlot(null);
            }}
            onSelectSlot={(slot) => setSelectedSlot(slot)}
          />

          {/* Slot Selection Summary Bar */}
          {selectedSlot && selectedCourtObj && (
            <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Selected Slot</div>
                  <div className="text-sm font-bold text-white font-display">
                    {selectedCourtObj.name} ({selectedSlot.start_time} - {selectedSlot.end_time})
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-blue-400 font-display">₹{selectedSlot.price}</div>
                  <div className="text-[10px] text-slate-400">+ ₹15 Platform Fee</div>
                </div>
              </div>

              <button
                onClick={() => setShowCheckoutModal(true)}
                className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-sm py-3.5 rounded-2xl shadow-lg transition font-display"
              >
                Proceed to Checkout
              </button>
            </div>
          )}

          {/* Cancellation Policy Box */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 text-xs space-y-2">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5 font-display">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Cancellation & Refund Policy</span>
            </div>
            <ul className="text-slate-500 space-y-1 list-disc pl-4 text-[11px]">
              <li><strong>24+ hours prior:</strong> 100% refund</li>
              <li><strong>6 - 24 hours prior:</strong> 50% refund</li>
              <li><strong>Under 6 hours:</strong> Non-refundable</li>
            </ul>
          </div>

        </div>

      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && selectedSlot && selectedCourtObj && (
        <BookingModal
          venue={venue}
          court={selectedCourtObj}
          date={selectedDate}
          slot={selectedSlot}
          onClose={() => setShowCheckoutModal(false)}
          onBookingComplete={onBookingComplete}
        />
      )}

    </div>
  );
};

