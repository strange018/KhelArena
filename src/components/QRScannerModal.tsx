import React, { useState } from 'react';
import { api } from '../lib/api';
import { X, QrCode, CheckCircle2, AlertCircle, Search, ShieldCheck } from 'lucide-react';

interface QRScannerModalProps {
  onClose: () => void;
  onCheckInSuccess: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ onClose, onCheckInSuccess }) => {
  const [bookingCodeInput, setBookingCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerifyCheckIn = async (codeToVerify?: string) => {
    const code = codeToVerify || bookingCodeInput;
    if (!code) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.checkInPlayer({ booking_code: code.trim().toUpperCase() });
      setResult(res);
      onCheckInSuccess();
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        
        <div className="bg-slate-50 text-slate-900 border-b border-slate-200/80 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-base text-slate-900 font-display">Venue Counter Check-In</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          
          {/* Simulated Camera Viewfinder */}
          <div className="bg-slate-950 rounded-2xl p-6 text-center text-slate-400 relative border border-slate-800 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent animate-pulse pointer-events-none"></div>
            <QrCode className="w-16 h-16 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-[11px] font-semibold text-slate-300">Web Camera Scanner Active</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Scan player booking QR pass or enter code below</p>
          </div>

          {/* Manual Booking Code Entry */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Enter Booking Code (e.g. BK-PAT-123456)</label>
            <div className="flex space-x-2">
              <input 
                type="text"
                placeholder="BK-PAT-..."
                value={bookingCodeInput}
                onChange={(e) => setBookingCodeInput(e.target.value.toUpperCase())}
                className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm uppercase font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={() => handleVerifyCheckIn()}
                disabled={loading || !bookingCodeInput}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl transition shadow-md flex items-center space-x-1"
              >
                <Search className="w-4 h-4" />
                <span>Verify</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-700 font-extrabold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{result.message}</span>
              </div>
              <div className="text-xs space-y-1 text-slate-700 pt-2 border-t border-emerald-200/60 font-medium">
                <div><strong className="text-slate-900">Booking:</strong> {result.booking.booking_code}</div>
                <div><strong className="text-slate-900">Court:</strong> {result.booking.court_id}</div>
                <div><strong className="text-slate-900">Time:</strong> {result.booking.date} ({result.booking.start_time} - {result.booking.end_time})</div>
                <div><strong className="text-slate-900">Status:</strong> <span className="bg-emerald-200 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full">CHECKED IN</span></div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
