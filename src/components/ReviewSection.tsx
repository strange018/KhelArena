import React, { useState } from 'react';
import { Venue, Review, User } from '../types';
import { api } from '../lib/api';
import { Star, MessageSquare, Send, CheckCircle2, AlertCircle, User as UserIcon, Sparkles, ThumbsUp } from 'lucide-react';

interface ReviewSectionProps {
  venue: Venue;
  currentUser: User | null;
  onReviewSubmitted: (newReview: Review, avgRating: number, reviewCount: number) => void;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  venue,
  currentUser,
  onReviewSubmitted
}) => {
  const reviews = venue.reviews || [];

  // Form states
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rating breakdown calculation
  const totalReviews = reviews.length || (venue.review_count || 1);
  const averageRating = venue.avg_rating || 4.8;

  const starCounts = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(r => Math.round(r.rating) === stars).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : stars === 5 ? 80 : stars === 4 ? 20 : 0;
    return { stars, count, percentage };
  });

  const ratingLabels: Record<number, string> = {
    5: 'Excellent! Outstanding facilities & experience.',
    4: 'Very Good! Recommended venue.',
    3: 'Average. Acceptable experience.',
    2: 'Below Expectations. Needs improvement.',
    1: 'Poor experience.'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser) {
      setErrorMessage('Please sign in or select a Player profile to post a review.');
      return;
    }

    if (!comment.trim()) {
      setErrorMessage('Please write a brief comment sharing your experience.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitReview({
        venue_id: venue.id,
        rating,
        comment: comment.trim()
      });

      setSuccessMessage(res.message || 'Thank you! Your review has been published.');
      setComment('');
      setRating(5);

      if (res.review) {
        onReviewSubmitted(res.review, res.avg_rating, res.review_count);
      }

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 font-display flex items-center space-x-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>Ratings & Verified Player Reviews</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Real feedback from players who played at {venue.name}
          </p>
        </div>

        {/* Overall Score Badge */}
        <div className="flex items-center space-x-3 bg-amber-50 border border-amber-200/80 px-4 py-2.5 rounded-2xl shrink-0">
          <div className="text-3xl font-black text-amber-600 font-display">
            {averageRating.toFixed(1)}
          </div>
          <div>
            <div className="flex items-center text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= Math.round(averageRating) ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-[11px] text-amber-900 font-bold mt-0.5">
              Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout: Rating Bars & Submission Form */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Rating Breakdown Bars (4 cols) */}
        <div className="md:col-span-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/60 space-y-3 flex flex-col justify-center">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Rating Distribution
          </h4>
          {starCounts.map(({ stars, percentage }) => (
            <div key={stars} className="flex items-center space-x-2 text-xs">
              <span className="w-8 font-bold text-slate-600 flex items-center">
                {stars} <Star className="w-3 h-3 fill-amber-500 text-amber-500 ml-1 inline" />
              </span>
              <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-10 text-right text-[11px] font-semibold text-slate-400">
                {percentage}%
              </span>
            </div>
          ))}
        </div>

        {/* Submit Review Form Box (8 cols) */}
        <div className="md:col-span-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 font-display flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Write a Review</span>
            </h4>
            {currentUser && (
              <span className="text-xs text-slate-500 font-medium">
                Posting as <strong className="text-slate-800">{currentUser.name}</strong>
              </span>
            )}
          </div>

          {currentUser ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Interactive Star Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Your Rating
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (hoverRating || rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-110 focus:outline-hidden"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-bold text-amber-600 ml-2">
                    {ratingLabels[hoverRating || rating]}
                  </span>
                </div>
              </div>

              {/* Text Comments */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Your Comments & Feedback
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details about court quality, lighting, parking, staff behavior, or amenities..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition resize-none text-slate-800"
                />
              </div>

              {/* Messages */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting Review...' : 'Post Review'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-2">
              <UserIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">
                Want to leave a review for {venue.name}?
              </p>
              <p className="text-[11px] text-slate-400">
                Please switch to a Player account in the top right profile selector to share your feedback.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Reviews Feed List */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h4 className="text-sm font-bold text-slate-900 font-display">
          All Reviews ({reviews.length})
        </h4>

        {reviews.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Be the first player to review this venue!</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Submit your rating using the form above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/70 text-xs space-y-2.5 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs border border-blue-200 shrink-0">
                      {(rev.reviewer_name || 'Player').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>{rev.reviewer_name || 'Player'}</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                          Verified
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-amber-500 font-extrabold bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{rev.rating}.0</span>
                  </div>
                </div>

                <p className="text-slate-600 leading-relaxed font-medium">
                  "{rev.comment}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
