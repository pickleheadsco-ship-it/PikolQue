import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { Session, MatchingMode } from '../types';
import {
  getRecentLocalSessions,
  isAuditLoggingEnabled,
  setAuditLoggingEnabled,
} from '../services/sessions/sessionService';
import {
  ShieldCheck,
  Building,
  FileText,
  Sliders,
  ArrowLeft,
  Activity,
  CheckCircle,
  Save,
  Lock,
  Compass,
  AlertCircle,
  Home,
  Users,
  Play,
  Trophy,
  QrCode,
} from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ProfileAvatarBadge } from '../components/profile/ProfileAvatarBadge';

interface AdminDashboardProps {
  onBackToHome: () => void;
  onOpenSession: (sessionId: string) => void;
  onNavigateToView?: (view: string, sessionId?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToHome,
  onOpenSession,
  onNavigateToView,
}) => {
  const { user, isAdmin, organizerEmail, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'navigator' | 'sessions' | 'rules' | 'audit'>('overview');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [appName, setAppName] = useState('PickleQueue');
  const [defaultMode, setDefaultMode] = useState<MatchingMode>('balanced');
  const [defaultCourts, setDefaultCourts] = useState(4);
  const [rotationRule, setRotationRule] = useState('4_in_4_out');
  const [savedNotice, setSavedNotice] = useState(false);
  const [auditLogEnabled, setAuditLogEnabled] = useState<boolean>(() => isAuditLoggingEnabled());

  const handleToggleAuditLog = (newVal: boolean) => {
    setAuditLogEnabled(newVal);
    setAuditLoggingEnabled(newVal);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (!authLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="clay-card rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-xl border-2 border-rose-300">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto clay-subcard">
            <Lock className="w-7 h-7 text-rose-600" />
          </div>
          <h2 className="font-black text-xl text-slate-900">Admin Authentication Required</h2>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            This administrator console is restricted to verified platform administrators. Please sign in with authorized administrator credentials.
          </p>
          <button
            onClick={onBackToHome}
            className="w-full py-3 clay-btn clay-btn-primary rounded-2xl text-xs font-black shadow-md cursor-pointer"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'sessions'), limit(20));
      const snap = await getDocs(q);
      const list: Session[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Session));
      const localRecent = getRecentLocalSessions();
      for (const loc of localRecent) {
        if (!list.some((s) => s.id === loc.id)) {
          list.push(loc);
        }
      }
      setSessions(list);
    } catch (err) {
      console.warn('Could not load sessions from Firestore, using local cache:', err);
      const localRecent = getRecentLocalSessions();
      setSessions(localRecent);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditLoggingEnabled(auditLogEnabled);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const totalCourtsConfigured = sessions.reduce((acc, s) => acc + (s.numberOfCourts || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Admin Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors clay-btn"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <BrandLogo size="xs" />
            <ProfileAvatarBadge size="xs" />
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base tracking-tight text-white">Administrator Console</h1>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono hidden sm:inline">
            Admin: {user?.email || organizerEmail || 'SuperAdmin'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Navigation Tabs (Mobile Responsive Horizontal Scroll) */}
        <div className="flex clay-inset rounded-2xl p-1 gap-1 text-xs font-black uppercase tracking-wider overflow-x-auto max-w-full">
          {(
            [
              { key: 'overview', label: 'Overview', icon: Activity },
              { key: 'navigator', label: 'Navigator', icon: Compass },
              { key: 'sessions', label: 'Sessions', icon: Building },
              { key: 'rules', label: 'Settings & Rules', icon: Sliders },
              { key: 'audit', label: 'Audit Logs', icon: FileText },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all clay-btn whitespace-nowrap cursor-pointer ${
                  activeTab === tab.key
                    ? 'clay-btn-secondary text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="clay-card rounded-2xl p-4 sm:p-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Total Sessions
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1 block">
                  {sessions.length}
                </span>
              </div>
              <div className="clay-card rounded-2xl p-4 sm:p-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Active Queues
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-1 block">
                  {sessions.filter((s) => s.status === 'active').length}
                </span>
              </div>
              <div className="clay-card rounded-2xl p-4 sm:p-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Total Courts
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1 block">
                  {totalCourtsConfigured}
                </span>
              </div>
              <div className="clay-card rounded-2xl p-4 sm:p-5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Fairness Rule
                </span>
                <span className="text-xs sm:text-sm font-black text-purple-700 mt-2 block">
                  4 In / 4 Out
                </span>
              </div>
            </div>

            <div className="clay-card rounded-3xl p-6 sm:p-7">
              <h2 className="font-black text-base text-slate-900 mb-1">Venue Health & Real-Time Sync</h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed font-medium">
                PickleQueue manages live court rotations via Cloud Firestore transactional authority and sub-second onSnapshot distribution.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                <div className="p-4 clay-subcard rounded-2xl border border-slate-200/60">
                  <div className="font-black text-slate-900 mb-1 text-sm">Matching Engine</div>
                  <div className="text-slate-500">
                    4 deterministic algorithms: Balanced, Social Mix, Skill Tiers, Win/Loss brackets.
                  </div>
                </div>
                <div className="p-4 clay-subcard rounded-2xl border border-slate-200/60">
                  <div className="font-black text-slate-900 mb-1 text-sm">Voice Announcer</div>
                  <div className="text-slate-500">
                    Web Speech synthesis runs on organizer devices without requiring companion apps.
                  </div>
                </div>
                <div className="p-4 clay-subcard rounded-2xl border border-slate-200/60">
                  <div className="font-black text-slate-900 mb-1 text-sm">Zero-Friction QR</div>
                  <div className="text-slate-500">
                    No forced login for players. Browser localStorage ensures reconnection state.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Navigator (QA & Route Hub) */}
        {activeTab === 'navigator' && (
          <div className="space-y-6">
            <div className="clay-card rounded-3xl p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-slate-900 text-lg">System Route Navigator</h2>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 clay-pill">
                      All Views
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Direct routing to any terminal, queue, public view, or club tool</p>
                </div>
                <div className="text-xs font-mono font-bold text-slate-400">
                  {sessions.length} Active/Recent Sessions Found
                </div>
              </div>

              {/* Grid of Platform Routes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div
                  onClick={onBackToHome}
                  className="p-4 rounded-2xl clay-subcard hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-700">Home & Landing Portal</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Public club landing page, hero, book demo</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700 border-t border-slate-100 pt-2">
                    <span className="font-mono text-[10px] text-slate-400">Route: /</span>
                    <span className="flex items-center gap-1">Open ➔</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (onNavigateToView) onNavigateToView('club');
                    else window.history.pushState({}, '', '/club');
                  }}
                  className="p-4 rounded-2xl clay-subcard hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 group-hover:text-teal-700">Club Member Management</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Reclub URL sync, DUPR ratings & roster deletions</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-teal-700 border-t border-slate-100 pt-2">
                    <span className="font-mono text-[10px] text-slate-400">Route: /club</span>
                    <span className="flex items-center gap-1">Open ➔</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (onNavigateToView) onNavigateToView('leaderboard');
                    else window.history.pushState({}, '', '/leaderboard');
                  }}
                  className="p-4 rounded-2xl clay-subcard hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 group-hover:text-amber-700">Pickleheads Standings</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Court-themed leaderboard & top 3 podium highlights</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-amber-700 border-t border-slate-100 pt-2">
                    <span className="font-mono text-[10px] text-slate-400">Route: /leaderboard</span>
                    <span className="flex items-center gap-1">Open ➔</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (sessions.length > 0) onOpenSession(sessions[0].id);
                    else onBackToHome();
                  }}
                  className="p-4 rounded-2xl clay-subcard hover:border-sky-300 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Play className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 group-hover:text-sky-700">Organizer Live Terminal</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Real-time court dispatcher, rotations & announcer</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-sky-700 border-t border-slate-100 pt-2">
                    <span className="font-mono text-[10px] text-slate-400">Route: /organizer/:id</span>
                    <span className="flex items-center gap-1">Launch ➔</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (onNavigateToView) onNavigateToView('profile');
                    else window.history.pushState({}, '', '/profile');
                  }}
                  className="p-4 rounded-2xl clay-subcard hover:border-rose-300 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <ProfileAvatarBadge size="sm" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 group-hover:text-rose-700">Profile & Player Identity</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Avatar photo uploads, skill level, and personal stats</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-rose-700 border-t border-slate-100 pt-2">
                    <span className="font-mono text-[10px] text-slate-400">Route: /profile</span>
                    <span className="flex items-center gap-1">Open ➔</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (onNavigateToView) onNavigateToView('join');
                    else window.history.pushState({}, '', '/join');
                  }}
                  className="p-4 rounded-2xl clay-subcard hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 group-hover:text-indigo-700">Player Check-In & Join Portal</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">QR scanner & 6-character code check-in</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-700 border-t border-slate-100 pt-2">
                    <span className="font-mono text-[10px] text-slate-400">Route: /join</span>
                    <span className="flex items-center gap-1">Open ➔</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Session Launch Panel */}
            <div className="clay-card rounded-3xl p-6 sm:p-7">
              <h3 className="font-black text-slate-900 text-base mb-1">Direct Session Terminal Switcher</h3>
              <p className="text-xs text-slate-500 mb-4 font-medium">Instant launch into any session terminal or player queue</p>

              {sessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No sessions created yet. Return to Home to launch a new session.
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 clay-subcard rounded-2xl flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-mono font-black text-xs">
                          {s.joinCode}
                        </span>
                        <div>
                          <span className="font-black text-xs text-slate-900 block">{s.venueName || s.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">
                            {s.numberOfCourts} Courts • {s.matchingMode} • Status: {s.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenSession(s.id)}
                          className="px-3 py-1.5 clay-btn clay-btn-primary rounded-xl text-xs font-black shadow-xs cursor-pointer"
                        >
                          Organizer Terminal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToView) onNavigateToView('player', s.id);
                            else window.history.pushState({}, '', `/player/${s.id}`);
                          }}
                          className="px-3 py-1.5 clay-btn clay-btn-secondary rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          Player Queue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Sessions Archive */}
        {activeTab === 'sessions' && (
          <div className="clay-card rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-black text-slate-900 text-sm">Sessions Archive</h2>
              <span className="text-xs text-slate-500 font-bold">{sessions.length} recorded</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="p-3">Session</th>
                    <th className="p-3">Venue</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Courts</th>
                    <th className="p-3">Join Code</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-900">{s.name}</td>
                      <td className="p-3">{s.venueName}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-700 clay-pill">
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold">{s.numberOfCourts}</td>
                      <td className="p-3 font-mono font-black text-emerald-700">{s.joinCode}</td>
                      <td className="p-3 capitalize">{s.matchingMode.replace('_', ' ')}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => onOpenSession(s.id)}
                          className="px-3 py-1.5 clay-btn clay-btn-secondary text-purple-700 rounded-xl font-bold"
                        >
                          Open Terminal
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: System Rules & Matching Config */}
        {activeTab === 'rules' && (
          <div className="clay-card rounded-3xl p-6 sm:p-7 max-w-xl">
            <h2 className="font-black text-base text-slate-900 mb-1">Queue & System Rules</h2>
            <p className="text-xs text-slate-500 mb-5 font-medium">Configure platform defaults for upcoming sessions</p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  App Name
                </label>
                <div className="clay-inset rounded-2xl px-3.5 py-2">
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Default Matching Mode
                </label>
                <div className="clay-inset rounded-2xl px-3.5 py-2">
                  <select
                    value={defaultMode}
                    onChange={(e) => setDefaultMode(e.target.value as MatchingMode)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  >
                    <option value="balanced">Balanced (Skill differential minimized)</option>
                    <option value="social_mix">Social Mix (Partner/Opponent novelty)</option>
                    <option value="skill_separated">Skill Separated (Tiered pools)</option>
                    <option value="winners_losers">Winners / Losers (Brackets)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Default Courts Per Venue
                </label>
                <div className="clay-inset rounded-2xl px-3.5 py-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={defaultCourts}
                    onChange={(e) => setDefaultCourts(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Rotation Rule
                </label>
                <div className="clay-inset rounded-2xl px-3.5 py-2">
                  <select
                    value={rotationRule}
                    onChange={(e) => setRotationRule(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  >
                    <option value="4_in_4_out">4 In / 4 Out (Fairness standard — all 4 cycle off)</option>
                    <option value="winners_stay_1">Winners stay (King of Court — 2 stay, 2 out)</option>
                  </select>
                </div>
              </div>

              {/* Operational Audit Logging Toggle Switch */}
              <div className="pt-2 border-t border-slate-200">
                <div className="p-4 rounded-2xl clay-subcard border-2 border-slate-200/80 transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Operational Audit Logging
                        </label>
                        {auditLogEnabled ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 clay-pill">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 clay-pill">
                            Stopped
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Toggle to stop or resume recording session logs, match outcomes, and operational events.
                      </p>
                    </div>

                    {/* Interactive Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={auditLogEnabled}
                      onClick={() => handleToggleAuditLog(!auditLogEnabled)}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        auditLogEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          auditLogEnabled ? 'translate-x-7' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {!auditLogEnabled ? (
                    <div className="mt-3 p-2.5 bg-rose-50 rounded-xl text-xs font-bold text-rose-800 border border-rose-200 flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Audit logging is stopped. Operational session events will not be logged.</span>
                    </div>
                  ) : (
                    <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-2 animate-in fade-in">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Audit logging is active. Operational events are recorded for transparency.</span>
                    </div>
                  )}
                </div>
              </div>

              {savedNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
                  <CheckCircle className="w-4 h-4" />
                  <span>Platform settings saved successfully.</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-3 clay-btn clay-btn-primary rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 5: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="clay-card rounded-3xl p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-black text-slate-900 text-base mb-1">Operational Audit Trail</h2>
                <p className="text-xs text-slate-500 font-medium">Session logs for dispute resolution, queue fairness and transparency</p>
              </div>
              <div className="flex items-center gap-2">
                {auditLogEnabled ? (
                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 clay-pill flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Logging Active</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 clay-pill flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Logging Stopped</span>
                  </span>
                )}
              </div>
            </div>

            {!auditLogEnabled && (
              <div className="mb-4 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-rose-900 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Audit logging is currently stopped in Settings. No new operational events will be stored.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAuditLog(true)}
                  className="px-3.5 py-1.5 rounded-xl clay-btn clay-btn-primary text-xs font-black shadow-xs cursor-pointer"
                >
                  Resume Audit Logging
                </button>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No system audit logs recorded yet. Operational events and match resolutions are logged automatically during live sessions.
              </div>
            ) : (
              <div className="space-y-2.5 text-xs font-mono">
                {sessions.map((s) => (
                  <div key={s.id} className="p-3.5 clay-subcard rounded-2xl flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-800">
                      [SESSION_{s.status.toUpperCase()}] venue: {s.venueName || 'Facility'} • courts: {s.numberOfCourts} • mode: {s.matchingMode} • code: {s.joinCode}
                    </span>
                    <span className="text-slate-400 font-bold text-[11px]">
                      {s.organizerEmail || 'Admin'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
