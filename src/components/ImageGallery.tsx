import React, { useState, useEffect } from 'react';
import { ShieldCheck, Heart, Star, Images, X, ChevronLeft, ChevronRight, Maximize2, Share2, Check } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  venueName: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onShare?: () => void;
  isCopied?: boolean;
  avgRating?: number;
  reviewCount?: number;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  venueName,
  isFavorite = false,
  onToggleFavorite,
  onShare,
  isCopied = false,
  avgRating = 4.8,
  reviewCount = 18
}) => {
  // Ensure we always have at least a few photos for a rich visual layout
  const fallbackImages = [
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80'
  ];

  const galleryImages = Array.isArray(images) && images.length > 0 
    ? (images.length === 1 ? [images[0], ...fallbackImages.slice(1, 4)] : images)
    : fallbackImages;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, galleryImages.length]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs relative">
      
      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 bg-slate-900 rounded-3xl relative">
        
        {/* Main Hero Photo (Spans 2 or 3 cols) */}
        <div 
          onClick={() => openLightbox(0)}
          className="md:col-span-2 h-72 sm:h-96 relative group cursor-pointer overflow-hidden rounded-2xl"
        >
          <img 
            src={galleryImages[0]} 
            alt={`${venueName} - Main photo`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />

          {/* Badges Overlays */}
          <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md text-blue-400 font-bold text-xs px-3 py-1.5 rounded-full border border-slate-700/60 shadow-md flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Verified Patna Venue</span>
          </div>

          <div className="absolute bottom-4 left-4 text-white text-xs font-semibold drop-shadow-md hidden sm:block">
            Click to expand photo
          </div>
        </div>

        {/* Side Thumbnails Grid (2 cols) */}
        <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2 h-72 sm:h-96">
          {galleryImages.slice(1, 5).map((imgUrl, idx) => {
            const actualIndex = idx + 1;
            const isLast = idx === 3 && galleryImages.length > 5;
            const remainingCount = galleryImages.length - 5;

            return (
              <div 
                key={actualIndex}
                onClick={() => openLightbox(actualIndex)}
                className="relative h-full group cursor-pointer overflow-hidden rounded-2xl bg-slate-800"
              >
                <img 
                  src={imgUrl} 
                  alt={`${venueName} photo ${actualIndex + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition-colors" />

                {/* Remaining count overlay on last thumbnail */}
                {isLast && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-1">
                    <Images className="w-6 h-6 text-amber-400" />
                    <span className="text-sm font-extrabold font-display">+{remainingCount} Photos</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Action Buttons over Gallery */}
        <div className="absolute top-5 right-5 flex items-center space-x-2 z-10">
          {/* Share Button */}
          {onShare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className={`p-2.5 rounded-full backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-110 flex items-center space-x-1.5 font-bold text-xs cursor-pointer ${
                isCopied
                  ? 'bg-emerald-600 text-white border border-emerald-600'
                  : 'bg-white/95 text-slate-700 hover:text-blue-600 hover:bg-white border border-slate-200/80'
              }`}
              title="Share Venue Deep Link"
            >
              {isCopied ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4 text-blue-600" />}
              <span className="hidden sm:inline">{isCopied ? 'Copied!' : 'Share'}</span>
            </button>
          )}

          {/* Favorite Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`p-2.5 rounded-full backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-110 flex items-center space-x-1.5 font-bold text-xs cursor-pointer ${
                isFavorite
                  ? 'bg-rose-500 text-white border border-rose-600'
                  : 'bg-white/95 text-slate-700 hover:text-rose-600 hover:bg-white border border-slate-200/80'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white text-white' : 'text-rose-500'}`} />
              <span className="hidden sm:inline">{isFavorite ? 'Saved' : 'Save Venue'}</span>
            </button>
          )}

          {/* Rating Badge */}
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5 text-slate-900 font-bold text-xs">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{avgRating.toFixed(1)}</span>
            <span className="text-slate-400 font-normal">({reviewCount})</span>
          </div>
        </div>

        {/* Bottom Right Floating "View All Photos" Button */}
        <button
          onClick={() => openLightbox(0)}
          className="absolute bottom-5 right-5 z-10 bg-white/95 hover:bg-white text-slate-900 px-4 py-2 rounded-2xl shadow-xl font-bold text-xs flex items-center space-x-2 backdrop-blur-md border border-slate-200/80 transition-all hover:scale-105 cursor-pointer"
        >
          <Images className="w-4 h-4 text-blue-600" />
          <span>View Gallery ({galleryImages.length})</span>
        </button>

      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          
          {/* Lightbox Top Bar */}
          <div className="flex items-center justify-between text-white z-20 max-w-7xl mx-auto w-full">
            <div>
              <h3 className="font-bold text-base sm:text-lg font-display text-slate-100">
                {venueName}
              </h3>
              <p className="text-xs text-slate-400">
                Photo {currentIndex + 1} of {galleryImages.length}
              </p>
            </div>

            <button
              onClick={closeLightbox}
              className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer border border-slate-700"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lightbox Main Image Viewport */}
          <div className="relative flex-1 flex items-center justify-center my-4 max-w-7xl mx-auto w-full overflow-hidden">
            
            {/* Previous Arrow Button */}
            <button
              onClick={prevImage}
              className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white transition border border-slate-800 shadow-xl cursor-pointer hover:scale-110"
              title="Previous Photo (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Active Image */}
            <img
              src={galleryImages[currentIndex]}
              alt={`${venueName} - Large View ${currentIndex + 1}`}
              className="max-h-[72vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300"
              referrerPolicy="no-referrer"
            />

            {/* Next Arrow Button */}
            <button
              onClick={nextImage}
              className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white transition border border-slate-800 shadow-xl cursor-pointer hover:scale-110"
              title="Next Photo (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Bottom Thumbnail Ribbon */}
          <div className="max-w-4xl mx-auto w-full overflow-x-auto pb-2 scrollbar-none z-20">
            <div className="flex items-center justify-center space-x-2">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    currentIndex === idx 
                      ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/20' 
                      : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
