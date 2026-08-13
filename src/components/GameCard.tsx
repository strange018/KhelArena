import React, { useState } from 'react';
import { Game } from '../types';
import { Users, Calendar, Clock, MapPin, Share2, Check, UserPlus, Trophy } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onJoinGame: (gameId: string) => void;
  currentUserId?: string;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onJoinGame, currentUserId }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/join/${game.share_code}`;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isJoined = game.participants?.some(p => p.user_id === currentUserId);
  const isFull = game.current_players >= game.max_players;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between">
      <div>
        {/* Top Header & Skill Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
            <Trophy className="w-3 h-3 text-blue-600" />
            <span>{game.sport_name || 'Sport'} • {game.skill_level}</span>
          </span>

          <button
            onClick={handleShare}
            className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center space-x-1 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition"
            title="Copy shareable link for WhatsApp"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-extrabold text-slate-900 mb-2 line-clamp-1">
          {game.title}
        </h3>

        {game.description && (
          <p className="text-xs text-slate-500 mb-4 line-clamp-2">
            {game.description}
          </p>
        )}

        {/* Venue & Time Details */}
        <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center space-x-2 font-semibold text-slate-800">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{game.venue_name} ({game.area_name || 'Patna'})</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{game.date} • {game.start_time} - {game.end_time}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Hosted by <strong className="text-slate-700">{game.host_name || 'Player'}</strong></span>
          </div>
        </div>

        {/* Participant Avatars */}
        <div className="flex items-center justify-between text-xs mb-4">
          <div className="flex items-center space-x-1.5">
            <div className="flex -space-x-2 overflow-hidden">
              {game.participants?.slice(0, 4).map((p, i) => (
                <div 
                  key={i} 
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center"
                  title={p.name}
                >
                  {p.name.charAt(0)}
                </div>
              ))}
            </div>
            <span className="text-slate-600 font-bold ml-1">
              {game.current_players}/{game.max_players} Players
            </span>
          </div>

          <div className="font-black text-slate-900 text-sm">
            ₹{game.price_per_player}<span className="text-[10px] font-normal text-slate-500"> / player</span>
          </div>
        </div>
      </div>

      {/* Join Action CTA */}
      <button
        disabled={isJoined || isFull}
        onClick={() => onJoinGame(game.id)}
        className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm ${
          isJoined 
            ? 'bg-slate-100 text-slate-500 cursor-default' 
            : isFull 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <UserPlus className="w-4 h-4" />
        <span>{isJoined ? 'Already Joined' : isFull ? 'Game Full' : 'Join Game (₹' + game.price_per_player + ')'}</span>
      </button>
    </div>
  );
};
