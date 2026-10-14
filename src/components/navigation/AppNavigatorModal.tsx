import React from 'react';
import {
  Compass,
  Home,
  Play,
  Users,
  Trophy,
  ShieldCheck,
  User,
  QrCode,
  FileSpreadsheet,
  X,
  ExternalLink,
  Sliders,
  Activity,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { Session } from '../../types';

interface AppNavigatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, sessionId?: string) => void;
  activeSessionId?: string | null;
  sessions?: Session[];
}

export const AppNavigatorModal: React.FC<AppNavigatorModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  activeSessionId,
  sessions = [],
}) => {
  if (!isOpen) return null;

  const routes = [
    {
      id: 'landing',
      title: 'Home & Public Portal',
      desc: 'Main landing page, club overview, and demo booking',
      icon: Home,
      color: 'emerald',
      badge: 'Public',
      path: '/',
    },
    {
      id: 'organizer',
      title: 'Organizer Live Terminal',
      desc: 'Court dispatcher, 4-in/4-out queues, speech announcements',
      icon: Play,
      color: 'sky',
      badge: 'Admin',
      path: activeSessionId ? `/organizer/${activeSessionId}` : '/organizer',
    },
    {
      id: 'club',
      title: 'Club Member Management',
      desc: 'Reclub URL import, DUPR ratings, and player roster deletions',
      icon: Users,
      color: 'teal',
      badge: 'Roster',
      path: '/club',
    },
    {
      id: 'leaderboard',
      title: 'Pickleheads Standings',
      desc: 'Pickleball court themed leaderboard & top 3 seed highlights',
      icon: Trophy,
      color: 'amber',
      badge: 'Live',
      path: '/leaderboard',
    },
    {
      id: 'admin',
      title: 'Administrator Console',
      desc: 'Platform settings, audit log toggle, venue configuration',
      icon: ShieldCheck,
      color: 'purple',
      badge: 'Settings',
      path: '/admin',
    },
    {
      id: 'join',
      title: 'Player Join Portal',
      desc: 'Enter 6-char session code or camera QR code join',
      icon: QrCode,
      color: 'indigo',
      badge: 'Player',
      path: activeSessionId ? `/join/${activeSessionId}` : '/join',
    },
    {
      id: 'player',
      title: 'Player Queue & Wait View',
      desc: 'Personal queue tracker, match alerts, resting toggle',
      icon: Radio,
      color: 'blue',
      badge: 'Player',
      path: activeSessionId ? `/player/${activeSessionId}` : '/player',
    },
    {
      id: 'profile',
      title: 'User Profile & Identity',
      desc: 'Player avatar photo upload, DUPR and skill settings',
      icon: User,
      color: 'rose',
      badge: 'Account',
      path: '/profile',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="clay-card rounded-3xl max-w-2xl w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center clay-subcard">
              <Compass className="w-5 h-5 text-purple-600 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg">System Navigator</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 clay-pill">
                  QA & Route Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Quickly test and navigate between all platform views</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Routes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {routes.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onNavigate(r.id, activeSessionId || undefined);
                  onClose();
                }}
                className="p-3 rounded-2xl clay-subcard hover:border-purple-300 text-left transition-all flex items-start gap-3 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-black text-xs text-slate-900 truncate group-hover:text-purple-700">
                      {r.title}
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 shrink-0">
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">{r.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Sessions Quick Launcher */}
        {sessions.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-2">
              Active Sessions Quick Switcher ({sessions.length})
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto clay-inset rounded-2xl p-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-2 bg-white/80 rounded-xl flex items-center justify-between text-xs font-medium gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {s.joinCode}
                    </span>
                    <span className="font-bold text-slate-800 truncate">{s.venueName || s.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('organizer', s.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg clay-btn clay-btn-primary text-[10px] font-black cursor-pointer"
                    >
                      Terminal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('player', s.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg clay-btn clay-btn-secondary text-[10px] font-bold cursor-pointer"
                    >
                      Player
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Click any destination to switch instantly</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl clay-btn clay-btn-secondary text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
