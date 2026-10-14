import React from 'react';
import { Participant, Court, Match } from '../../types';
import { SkillBadge } from '../ui/Badge';
import {
  Bell,
  Sparkles,
  Trophy,
  CheckCircle,
  Volume2,
  X,
  Play,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { notificationService } from '../../services/notifications/notificationService';

import { GroupMatchProposal } from '../../types';

interface NextPlayModalProps {
  isOpen: boolean;
  type: 'playing' | 'on_deck';
  participant: Participant;
  court?: Court | null;
  match?: Match | null;
  proposal?: GroupMatchProposal | null;
  allParticipants: Participant[];
  onAcknowledge: () => void;
  onEnableNotifications?: () => void;
  notificationsEnabled?: boolean;
}

export const NextPlayModal: React.FC<NextPlayModalProps> = ({
  isOpen,
  type,
  participant,
  court,
  match,
  proposal,
  allParticipants,
  onAcknowledge,
  onEnableNotifications,
  notificationsEnabled = false,
}) => {
  if (!isOpen) return null;

  const isPlaying = type === 'playing';

  const getPlayer = (id: string) => allParticipants.find((p) => p.participantId === id);

  const teamAPlayers: Participant[] = match?.teamA
    ? (match.teamA.map(getPlayer).filter(Boolean) as Participant[])
    : proposal?.teamA && proposal.teamA.length > 0
    ? proposal.teamA
    : [];

  const teamBPlayers: Participant[] = match?.teamB
    ? (match.teamB.map(getPlayer).filter(Boolean) as Participant[])
    : proposal?.teamB && proposal.teamB.length > 0
    ? proposal.teamB
    : [];

  const handleTestChime = () => {
    notificationService.playChime(isPlaying ? 'urgent' : 'alert');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="clay-card rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-emerald-400 animate-in zoom-in-95 duration-150">
        {/* Banner Top */}
        <div
          className={`p-6 text-white text-center relative ${
            isPlaying
              ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800'
              : 'bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700'
          }`}
        >
          <button
            onClick={onAcknowledge}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-black uppercase tracking-wider mb-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>{isPlaying ? 'Match Called' : "You're On Deck"}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-1">
            {isPlaying ? 'YOUR TURN TO PLAY!' : "GET READY — YOU'RE NEXT!"}
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-white/90 max-w-xs mx-auto">
            {isPlaying
              ? `Grab your paddle and head over to ${court?.name || 'your assigned court'} right now!`
              : 'You are in the next rotation group. The next available court is yours!'}
          </p>

          {/* Court Badge */}
          {court && (
            <div className="mt-4 inline-block bg-white text-slate-900 font-black text-sm px-4 py-2 rounded-2xl shadow-lg">
              📍 {court.name}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 bg-white">
          {/* Player details */}
          <div className="clay-subcard rounded-2xl p-3.5 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                🎾
              </span>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Player
                </span>
                <span className="text-sm font-black text-slate-900">{participant.name}</span>
              </div>
            </div>
            <SkillBadge skill={participant.skillLevel} />
          </div>

          {/* Match Roster / Upcoming Rotation Roster */}
          {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                {isPlaying ? 'Matchup Roster' : 'Upcoming Rotation Lineup'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="clay-inset rounded-xl p-2.5">
                  <span className="text-[10px] font-black text-emerald-700 block mb-1">TEAM A</span>
                  <div className="space-y-1 font-bold text-slate-800">
                    {teamAPlayers.map((p) => (
                      <div key={p.participantId} className="truncate">
                        {p.participantId === participant.participantId ? '★ YOU' : p.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="clay-inset rounded-xl p-2.5">
                  <span className="text-[10px] font-black text-sky-700 block mb-1">TEAM B</span>
                  <div className="space-y-1 font-bold text-slate-800">
                    {teamBPlayers.map((p) => (
                      <div key={p.participantId} className="truncate">
                        {p.participantId === participant.participantId ? '★ YOU' : p.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Notification Permission Callout if not enabled */}
          {!notificationsEnabled && onEnableNotifications && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-amber-900">
                  Enable device push alerts
                </span>
              </div>
              <button
                type="button"
                onClick={onEnableNotifications}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black tracking-wider uppercase shadow-xs transition-colors"
              >
                Allow
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={onAcknowledge}
              className={`w-full py-4 rounded-2xl text-sm font-black shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer ${
                isPlaying ? 'clay-btn clay-btn-primary' : 'clay-btn clay-btn-amber text-white'
              }`}
            >
              <CheckCircle className="w-5 h-5 fill-current" />
              <span>{isPlaying ? 'Got It — Heading to Court Now!' : "I'm Ready & On Deck!"}</span>
            </button>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestChime}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1"
                title="Play audible whistle chime"
              >
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Test Sound Chime</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
