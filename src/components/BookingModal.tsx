import React, { useState, useEffect } from 'react';
import { Venue, Court, Slot, Booking } from '../types';
import { api } from '../lib/api';
import { useNotifications } from '../context/NotificationContext';
import { X, ShieldCheck, Clock, Tag, CreditCard, CheckCircle2, QrCode, AlertTriangle } from 'lucide-react';

interface BookingModalProps {
  venue: Venue;
  court: Court;
  date: string;
  slot: Slot;
  onClose: () => void;
  onBookingComplete: (booking: Booking, qrImage: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  venue,
  court,
  date,
  slot,
  onClose,
  onBookingComplete
}) => {
  const [step, setStep] = useState<'HOLDING' | 'PAYMENT' | 'SUCCESS'>('HOLDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const [holdData, setHoldData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);

  // 5 Minute Hold Countdown Timer
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    let timer: any;
    if (step === 'PAYMENT' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && step === 'PAYMENT') {
      setError('Hold timer expired. Please select a court slot again.');
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Step 1: Hold Slot on Mount
  useEffect(() => {
    async function initHold() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.holdSlot({
          venue_id: venue.id,
          court_id: court.id,
          date,
          start_time: slot.start_time,
          end_time: slot.end_time
        });
        setHoldData(res);
        setStep('PAYMENT');
      } catch (err: any) {
        setError(err.message || 'Failed to lock slot. It may have been booked.');
      } finally {
        setLoading(false);
      }
    }
    initHold();
  }, [venue.id, court.id, date, slot.start_time]);

  // Apply Coupon Code
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await api.validateCoupon(couponCode, slot.price);
      setAppliedCoupon(res);
      // Re-hold or update total
    } catch (err: any) {
      setError(err.message);
    }
  };

  const { notifyBookingConfirmed } = useNotifications();

  // Step 2: Confirm Payment
  const handleConfirmPayment = async () => {
    if (!holdData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.confirmPayment({
        booking_id: holdData.booking_id,
        razorpay_order_id: holdData.razorpay_order_id,
        razorpay_payment_id: 'pay_rzp_mock_' + Date.now(),
        payment_method: paymentMethod
      });

      setConfirmedBooking(res.booking);
      setQrImage(res.qr_image);
      setStep('SUCCESS');
      
      // Trigger Toast Alert & Badge Notification
      notifyBookingConfirmed(res.booking);

      onBookingComplete(res.booking, res.qr_image);
    } catch (err: any) {
      setError(err.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const courtPrice = slot.price;
  const discount = appliedCoupon ? appliedCoupon.discount_calculated : 0;
  const platformFee = 15;
  const totalPayable = Math.max(0, courtPrice - discount + platformFee);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-50 text-slate-900 border-b border-slate-200/80 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-slate-900 font-display">Secure Court Checkout</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'HOLDING' && (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Clock className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="font-bold text-slate-800">Locking Court Slot...</p>
              <p className="text-[11px] text-slate-400 mt-1">Securing double-booking protection on database ledger</p>
            </div>
          )}

          {step === 'PAYMENT' && (
            <div>
              {/* Hold Clock Alert */}
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs font-semibold text-amber-800">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>Slot Held Temporarily</span>
                </div>
                <div className="font-extrabold text-amber-900 font-mono text-sm bg-amber-100 px-2 py-0.5 rounded">
                  {formatTimer(timeLeft)}
                </div>
              </div>

              {/* Booking Item Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5 text-xs space-y-2">
                <div className="flex justify-between font-bold text-slate-900 text-sm">
                  <span>{venue.name}</span>
                  <span className="text-blue-600">{court.name}</span>
                </div>
                <div className="text-slate-500">
                  {date} ({slot.start_time} - {slot.end_time})
                </div>
                <div className="text-slate-400 text-[11px]">
                  {venue.address}
                </div>
              </div>

              {/* Coupon Code Input */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Apply Discount Coupon</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input 
                      type="text"
                      placeholder="Enter KHEL100 or PATNA20"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs uppercase font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button 
                    onClick={handleApplyCoupon}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
                  >
                    Apply
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="mt-1 text-[11px] text-blue-600 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Coupon {appliedCoupon.code} applied! Saved ₹{appliedCoupon.discount_calculated}</span>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-slate-200 pt-3 mb-5 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Court Fee ({slot.is_peak ? 'Peak Rate' : 'Standard Rate'})</span>
                  <span>₹{courtPrice}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-blue-600 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Platform & Processing Fee</span>
                  <span>₹{platformFee}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total Amount Payable</span>
                  <span className="text-blue-600">₹{totalPayable}</span>
                </div>
              </div>

              {/* Payment Method Selector (Razorpay Mock) */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 mb-2">Select Payment Method (Razorpay India)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition ${paymentMethod === 'UPI' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>BHIM / PhonePe UPI</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition ${paymentMethod === 'CARD' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    <CreditCard className="w-4 h-4 text-slate-600" />
                    <span>Debit/Credit Card</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('NETBANKING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition ${paymentMethod === 'NETBANKING' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    <CreditCard className="w-4 h-4 text-slate-600" />
                    <span>Net Banking</span>
                  </button>
                </div>
              </div>

              {/* Pay CTA */}
              <button
                onClick={handleConfirmPayment}
                disabled={loading || timeLeft === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Verifying Payment...</span>
                ) : (
                  <>
                    <span>Pay ₹{totalPayable} & Confirm Booking</span>
                    <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'SUCCESS' && confirmedBooking && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Booking Confirmed!</h3>
                <p className="text-xs text-slate-500">Booking Code: <span className="font-bold text-slate-800">{confirmedBooking.booking_code}</span></p>
              </div>

              {qrImage && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mx-auto">
                  <img src={qrImage} alt="Booking QR Code" className="w-40 h-40 mx-auto" />
                  <p className="text-[11px] text-slate-500 font-semibold mt-2">Show this QR at Venue Counter</p>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-200 text-left space-y-1">
                <div><span className="font-bold text-slate-800">Venue:</span> {venue.name}</div>
                <div><span className="font-bold text-slate-800">Court:</span> {court.name}</div>
                <div><span className="font-bold text-slate-800">Time:</span> {date} ({slot.start_time} - {slot.end_time})</div>
                <div><span className="font-bold text-slate-800">Amount Paid:</span> ₹{confirmedBooking.total_amount}</div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl shadow-md transition"
              >
                View My Bookings
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
