import React from 'react';
import { Court, Slot } from '../types';
import { Clock, Zap, Lock, AlertCircle, CheckCircle, Calendar, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface SlotPickerProps {
  courts: Court[];
  selectedCourtId: string;
  selectedDate: string;
  slots: Slot[];
  selectedSlot: Slot | null;
  loading: boolean;
  onSelectCourt: (courtId: string) => void;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: Slot) => void;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  courts,
  selectedCourtId,
  selectedDate,
  slots,
  selectedSlot,
  loading,
  onSelectCourt,
  onSelectDate,
  onSelectSlot
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Generate next 7 days for quick date presets
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return { dateStr, dayName, formatted };
  });

  const isPresetDate = dates.some(d => d.dateStr === selectedDate);

  // Format friendly display date
  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts.map(Number);
    const dateObj = new Date(y, m - 1, d);
    
    if (dateStr === todayStr) {
      return `Today (${dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    }
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d - 1);
    const prevStr = dateObj.toISOString().split('T')[0];
    if (prevStr >= todayStr) {
      onSelectDate(prevStr);
    }
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + 1);
    onSelectDate(dateObj.toISOString().split('T')[0]);
  };

  const selectedCourtObj = courts.find(c => c.id === selectedCourtId) || courts[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
      <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
        <Clock className="w-5 h-5 text-blue-600" />
        <span>Select Court & Booking Date</span>
      </h3>

      {/* 1. Court Selector Tabs */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Court</label>
        <div className="flex flex-wrap gap-2">
          {courts.map((court) => (
            <button
              key={court.id}
              onClick={() => onSelectCourt(court.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border ${court.id === selectedCourtId ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
            >
              <span>{court.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${court.id === selectedCourtId ? 'bg-slate-800 text-blue-400' : 'bg-slate-200 text-slate-600'}`}>
                {court.type}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Calendar Date Picker Control Bar */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Booking Date
          </label>

          {/* Date Selector Header & Controls */}
          <div className="flex items-center space-x-2">
            {/* Step Previous Day Button */}
            <button
              onClick={handlePrevDay}
              disabled={selectedDate <= todayStr}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Step Next Day Button */}
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Native Calendar Picker Input Trigger */}
            <div className="relative inline-flex items-center">
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) onSelectDate(e.target.value);
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
              />
              <button
                type="button"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 shadow-2xs transition"
              >
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>Choose Date</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selected Date Summary Banner */}
        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Selected: <span className="text-blue-600 font-extrabold">{formatFriendlyDate(selectedDate)}</span></span>
          </div>
          {selectedDate !== todayStr && (
            <button
              onClick={() => onSelectDate(todayStr)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
            >
              Reset to Today
            </button>
          )}
        </div>

        {/* Quick Date Presets Strip */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {dates.map((item) => (
            <button
              key={item.dateStr}
              onClick={() => onSelectDate(item.dateStr)}
              className={`p-2.5 rounded-xl text-center border transition-all ${item.dateStr === selectedDate ? 'bg-blue-600 text-white border-blue-600 shadow-md font-bold' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'}`}
            >
              <div className="text-[11px] uppercase tracking-wider opacity-90">{item.dayName}</div>
              <div className="text-xs font-bold">{item.formatted}</div>
            </button>
          ))}

          {/* Custom Date Chip if picked outside initial 7 days */}
          {!isPresetDate && (
            <button
              onClick={() => onSelectDate(selectedDate)}
              className="p-2.5 rounded-xl text-center border transition-all bg-blue-600 text-white border-blue-600 shadow-md font-bold col-span-2 sm:col-span-1"
            >
              <div className="text-[11px] uppercase tracking-wider opacity-90">Custom</div>
              <div className="text-xs font-bold">
                {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* 3. Slot Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-b border-slate-100 py-3">
        <div className="flex items-center space-x-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <span>Peak Hours</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            <span>Booked / Locked</span>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-[11px] font-bold text-slate-500 bg-slate-100/80 p-1 rounded-xl">
          <Zap className="w-3.5 h-3.5 text-blue-600 ml-1.5" />
          <span>Real-time Slot Protection Active</span>
        </div>
      </div>

      {/* 4. Slot Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs animate-pulse">Loading court availability...</div>
      ) : slots.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No slot schedule available for selected date ({selectedDate}). Try another date.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {slots.map((slot, index) => {
            const isSelected = selectedSlot?.start_time === slot.start_time;
            const isBooked = slot.status === 'BOOKED' || slot.status === 'BLOCKED' || slot.status === 'HELD';

            return (
              <button
                key={index}
                disabled={isBooked}
                onClick={() => onSelectSlot(slot)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isBooked 
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70' 
                    : isSelected 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg ring-2 ring-blue-500 ring-offset-1' 
                      : slot.is_peak 
                        ? 'bg-amber-50/60 hover:bg-amber-100/80 border-amber-200 text-slate-900' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold tracking-tight">
                    {slot.start_time} - {slot.end_time}
                  </span>
                  {slot.is_peak && !isBooked && (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'}`}>
                      PEAK
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={`font-extrabold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    ₹{slot.price}
                  </span>

                  {isBooked ? (
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>{slot.block_reason || 'Booked'}</span>
                    </span>
                  ) : isSelected ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-[10px] font-bold text-blue-600">Available</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

