import React, { useState } from 'react';
import { Venue, Sport, Game } from '../types';
import { api } from '../lib/api';
import { X, Users, Trophy, Calendar, Clock, Sparkles } from 'lucide-react';

interface HostGameModalProps {
  venues: Venue[];
  sports: Sport[];
  onClose: () => void;
  onGameCreated: (game: Game) => void;
}

export const HostGameModal: React.FC<HostGameModalProps> = ({
  venues,
  sports,
  onClose,
  onGameCreated
}) => {
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id || '');
  const [selectedSportId, setSelectedSportId] = useState(sports[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('20:00');
  const [pricePerPlayer, setPricePerPlayer] = useState(150);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Open'>('Intermediate');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVenue = venues.find(v => v.id === selectedVenueId) || venues[0];
  const courts = selectedVenue?.courts || [];
  const [selectedCourtId, setSelectedCourtId] = useState(courts[0]?.id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Game title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createGame({
        venue_id: selectedVenueId,
        court_id: selectedCourtId || courts[0]?.id || 'court_v1_1',
        sport_id: selectedSportId,
        date,
        start_time: startTime,
        end_time: endTime,
        title,
        description,
        price_per_player: Number(pricePerPlayer),
        max_players: Number(maxPlayers),
        skill_level: skillLevel
      });

      // Fetch newly created game
      const newGame = await api.getGameByShareCode(res.share_code);
      onGameCreated(newGame);
    } catch (err: any) {
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        
        <div className="bg-slate-50 text-slate-900 border-b border-slate-200/80 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-slate-900 font-display">Host a Game & Find Players</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Game Title</label>
            <input 
              type="text"
              placeholder="e.g. 2v2 Evening Badminton Doubles or 5v5 Turf Football"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sport</label>
              <select
                value={selectedSportId}
                onChange={(e) => setSelectedSportId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                {sports.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Skill Level Required</label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value="Open">Open (All Levels)</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Venue (Patna)</label>
              <select
                value={selectedVenueId}
                onChange={(e) => {
                  setSelectedVenueId(e.target.value);
                  const v = venues.find(v => v.id === e.target.value);
                  if (v && v.courts && v.courts.length > 0) {
                    setSelectedCourtId(v.courts[0].id);
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.area_name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Court</label>
              <select
                value={selectedCourtId}
                onChange={(e) => setSelectedCourtId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                {courts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date</label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Time</label>
              <input 
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">End Time</label>
              <input 
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Price / Player (₹)</label>
              <input 
                type="number"
                value={pricePerPlayer}
                onChange={(e) => setPricePerPlayer(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Total Max Players Needed</label>
              <input 
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
            <textarea 
              rows={2}
              placeholder="e.g. Shuttle cock provided, bringing 2 spare rackets. Looking for friendly players!"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Creating Game...' : 'Host Game & Generate WhatsApp Share Link'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
