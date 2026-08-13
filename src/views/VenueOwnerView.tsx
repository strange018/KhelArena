import React, { useState, useEffect } from 'react';
import { Venue, Court, User } from '../types';
import { api } from '../lib/api';
import { QRScannerModal } from '../components/QRScannerModal';
import { Building, ShieldCheck, DollarSign, Calendar, Lock, Unlock, QrCode, Plus, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface VenueOwnerViewProps {
  currentUser: User | null;
  venues: Venue[];
  onRefreshVenues: () => void;
}

export const VenueOwnerView: React.FC<VenueOwnerViewProps> = ({
  currentUser,
  venues,
  onRefreshVenues
}) => {
  const ownerVenues = venues.filter(v => v.owner_id === currentUser?.id) || venues.slice(0, 2);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(ownerVenues[0]?.id || '');

  const currentVenue = ownerVenues.find(v => v.id === selectedVenueId) || ownerVenues[0] || venues[0];

  const [financials, setFinancials] = useState<any>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);

  // New Court Form state
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtType, setNewCourtType] = useState('Wooden Court');
  const [offPeakRate, setOffPeakRate] = useState(300);
  const [peakRate, setPeakRate] = useState(450);

  // Manual Inventory Block state
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [blockStartTime, setBlockStartTime] = useState('18:00');
  const [blockEndTime, setBlockEndTime] = useState('19:00');
  const [blockReason, setBlockReason] = useState('EXTERNAL_BOOKING');

  useEffect(() => {
    if (currentVenue) {
      fetchFinancials();
    }
  }, [currentVenue?.id]);

  const fetchFinancials = async () => {
    if (!currentVenue) return;
    setLoadingFinancials(true);
    try {
      const data = await api.getVenueFinancials(currentVenue.id);
      setFinancials(data);
    } catch (err) {
      console.error('Failed to fetch financials:', err);
    } finally {
      setLoadingFinancials(false);
    }
  };

  const handleAddCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVenue || !newCourtName) return;
    try {
      await api.addCourt(currentVenue.id, {
        name: newCourtName,
        sport_id: 'sport_badminton',
        type: newCourtType,
        hourly_rate_offpeak: offPeakRate,
        hourly_rate_peak: peakRate
      });
      alert('Court added successfully!');
      setShowAddCourtModal(false);
      onRefreshVenues();
    } catch (err: any) {
      alert(err.message || 'Failed to add court');
    }
  };

  const handleBlockInventory = async (courtId: string, action: 'BLOCK' | 'UNBLOCK') => {
    if (!currentVenue) return;
    try {
      const res = await api.blockInventorySlot(currentVenue.id, {
        court_id: courtId,
        date: blockDate,
        start_time: blockStartTime,
        end_time: blockEndTime,
        reason: blockReason,
        action
      });
      alert(res.message);
      fetchFinancials();
    } catch (err: any) {
      alert(err.message || 'Inventory control failed');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner & Venue Selector */}
      <div className="bg-gradient-to-br from-amber-50/90 via-white to-slate-50 text-slate-900 rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Building className="w-6 h-6 text-amber-600" />
            <h1 className="text-2xl font-black font-display text-slate-900">Venue Partner Portal</h1>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Manage courts, inventory availability, walk-in locks, check-in players with QR Scanner, and track earnings & settlements.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowQRScanner(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition flex items-center space-x-2"
          >
            <QrCode className="w-4 h-4" />
            <span>Launch Player Check-in Scanner</span>
          </button>
        </div>
      </div>

      {/* Verification Status Alert */}
      {currentVenue && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
          currentVenue.verification_status === 'VERIFIED' || currentVenue.verification_status === 'ACTIVE' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Venue Verification Status: <strong>{currentVenue.verification_status}</strong></span>
          </div>
          <span className="text-[11px] font-normal text-slate-600">Commission Rate: {currentVenue.commission_rate}%</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Total Bookings</div>
          <div className="text-2xl font-black text-slate-900">{financials?.summary?.total_bookings || 0}</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Gross Revenue (GMV)</div>
          <div className="text-2xl font-black text-slate-900">₹{financials?.summary?.total_gmv || 0}</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase">Platform Commission</div>
          <div className="text-2xl font-black text-slate-900">₹{financials?.summary?.total_commission || 0}</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-1 bg-emerald-50/50 border-emerald-200">
          <div className="text-xs font-bold text-emerald-800 uppercase">Net Owner Payable</div>
          <div className="text-2xl font-black text-emerald-700">₹{financials?.summary?.net_earnings || 0}</div>
        </div>
      </div>

      {/* Courts & Inventory Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Court Inventory & Manual Slot Blocks</h2>
            <p className="text-xs text-slate-500">Block slots for walk-in players, phone calls, or court maintenance.</p>
          </div>

          <button
            onClick={() => setShowAddCourtModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Court</span>
          </button>
        </div>

        {/* List of Courts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentVenue?.courts?.map((court) => (
            <div key={court.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
                <span>{court.name}</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">{court.type}</span>
              </div>

              <div className="text-slate-600 flex justify-between">
                <span>Off-Peak: ₹{court.hourly_rate_offpeak}/hr</span>
                <span>Peak (6-10 PM): ₹{court.hourly_rate_peak}/hr</span>
              </div>

              {/* Quick Block Controls */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <div className="font-bold text-slate-800 text-[11px]">Manual Slot Lock (Phone/Walk-in/Maintenance):</div>
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    type="date"
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-[11px]"
                  />
                  <input 
                    type="time"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-[11px]"
                  />
                  <select
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-[11px]"
                  >
                    <option value="EXTERNAL_BOOKING">Walk-in / Phone</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>

                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => handleBlockInventory(court.id, 'BLOCK')}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] py-1.5 rounded-lg transition flex items-center justify-center space-x-1"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Block Slot</span>
                  </button>

                  <button
                    onClick={() => handleBlockInventory(court.id, 'UNBLOCK')}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] py-1.5 rounded-lg transition flex items-center justify-center space-x-1"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Unblock Slot</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Settlements History */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Payout Settlements History</h2>

        {financials?.settlements && financials.settlements.length > 0 ? (
          <div className="space-y-2">
            {financials.settlements.map((stl: any) => (
              <div key={stl.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-slate-900">{stl.settlement_code}</div>
                  <div className="text-slate-500 text-[11px]">Period: {stl.period_start} to {stl.period_end}</div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-emerald-700 text-sm">₹{stl.net_payable}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stl.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {stl.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No bank settlements generated yet.</p>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onCheckInSuccess={() => fetchFinancials()}
        />
      )}

      {/* Add Court Modal */}
      {showAddCourtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">Add Court / Turf Pitch</h3>
            <form onSubmit={handleAddCourt} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Court Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Yonex Synthetic Court 3"
                  value={newCourtName}
                  onChange={(e) => setNewCourtName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Flooring / Surface Type</label>
                <input 
                  type="text"
                  placeholder="Teak Wood, Synthetic Mat, AstroTurf, Box Net"
                  value={newCourtType}
                  onChange={(e) => setNewCourtType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Off-Peak Rate (₹/hr)</label>
                  <input 
                    type="number"
                    value={offPeakRate}
                    onChange={(e) => setOffPeakRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peak Rate (6-10 PM) (₹/hr)</label>
                  <input 
                    type="number"
                    value={peakRate}
                    onChange={(e) => setPeakRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourtModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl shadow-md"
                >
                  Save Court
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
