import React, { useState, useEffect } from 'react';
import { Game, Venue, Sport, User } from '../types';
import { api } from '../lib/api';
import { GameCard } from '../components/GameCard';
import { HostGameModal } from '../components/HostGameModal';
import { useNotifications } from '../context/NotificationContext';
import { Users, Plus, Sparkles, Filter, Share2, Bell } from 'lucide-react';

interface JoinGamesViewProps {
  currentUser: User | null;
  venues: Venue[];
  sports: Sport[];
  initialShareCode?: string;
}

export const JoinGamesView: React.FC<JoinGamesViewProps> = ({
  currentUser,
  venues,
  sports
}) => {
  const { notifyGameJoined, notifyGameInvitation } = useNotifications();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHostModal, setShowHostModal] = useState(false);

  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [selectedSkill, setSelectedSkill] = useState<string>('ALL');

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchGames();
  }, [selectedSport, selectedSkill]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedSport !== 'ALL') params.sport = selectedSport;
      if (selectedSkill !== 'ALL') params.skill = selectedSkill;

      const data = await api.getGames(params);
      setGames(data);
    } catch (err) {
      console.error('Failed to fetch games:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!currentUser) {
      alert('Please select a demo persona from the top navigation to join games!');
      return;
    }

    try {
      const res = await api.joinGame(gameId);
      const targetGame = games.find(g => g.id === gameId);

      setNotification(res.message);
      setTimeout(() => setNotification(null), 4000);

      // Trigger notification toast & unread badge
      if (targetGame) {
        notifyGameJoined(targetGame);
      } else {
        notifyGameJoined({ title: 'Community Sports Game' });
      }

      fetchGames();
    } catch (err: any) {
      alert(err.message || 'Failed to join game');
    }
  };

  const handleSendSimulatedInvite = (game: Game) => {
    notifyGameInvitation({
      gameTitle: game.title,
      hostName: game.host_name || 'Community Host',
      shareCode: game.share_code,
      venueName: game.venue_name || 'Patna Sports Arena',
      sportName: game.sport_name
    });
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Banner */}
      <section className="bg-gradient-to-br from-blue-50/90 via-white to-sky-50/50 text-slate-900 rounded-3xl p-8 border border-blue-100/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-blue-100/80 text-blue-800 font-bold text-xs px-3.5 py-1.5 rounded-full border border-blue-200/80 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Community Game Matchmaking</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-display leading-tight text-slate-900">
            Need Extra Players? <br />
            <span className="text-blue-600">Host or Join Open Games in Patna</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            Find badminton doubles partners, 5v5 football squads, and box cricket players. Share a simple link on WhatsApp to fill open slots instantly!
          </p>
        </div>

        <button
          onClick={() => setShowHostModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-md transition flex items-center space-x-2 shrink-0 font-display"
        >
          <Plus className="w-5 h-5" />
          <span>Host a Game</span>
        </button>
      </section>

      {notification && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs font-bold shadow-sm animate-fade-in">
          {notification}
        </div>
      )}

      {/* Filter Controls Bar */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Games:</span>
          </div>

          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Sports</option>
            {sports.map(s => (
              <option key={s.id} value={s.slug}>{s.name}</option>
            ))}
          </select>

          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Skill Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Open">Open</option>
          </select>
        </div>

        <div className="text-xs font-bold text-slate-600">
          Open Public Matches: <span className="text-blue-600 font-extrabold">{games.length}</span>
        </div>
      </section>

      {/* Games Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs animate-pulse">Loading active public games...</div>
      ) : games.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-slate-800 font-display">No open games matching your filters</h4>
          <p className="text-xs text-slate-400 mt-1 mb-4">Be the first to host a game and invite players in Patna!</p>
          <button
            onClick={() => setShowHostModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
          >
            Host Game Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onJoinGame={handleJoinGame}
              currentUserId={currentUser?.id}
            />
          ))}
        </div>
      )}

      {/* Host Game Modal */}
      {showHostModal && (
        <HostGameModal
          venues={venues}
          sports={sports}
          onClose={() => setShowHostModal(false)}
          onGameCreated={(game) => {
            setShowHostModal(false);
            setNotification(`Game "${game.title}" created! Share code: ${game.share_code}`);
            fetchGames();
          }}
        />
      )}

    </div>
  );
};

