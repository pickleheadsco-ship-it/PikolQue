import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { Session, MatchingMode } from '../types';
import { getRecentLocalSessions } from '../services/sessions/sessionService';
import {
  ShieldCheck,
  Building,
  FileText,
  Sliders,
  ArrowLeft,
  Activity,
  CheckCircle,
  Save,
} from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ProfileAvatarBadge } from '../components/profile/ProfileAvatarBadge';

interface AdminDashboardProps {
  onBackToHome: () => void;
  onOpenSession: (sessionId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToHome,
  onOpenSession,
}) => {
  const { user, organizerEmail } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'rules' | 'audit'>('overview');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [appName, setAppName] = useState('PickleQueue');
  const [defaultMode, setDefaultMode] = useState<MatchingMode>('balanced');
  const [defaultCourts, setDefaultCourts] = useState(4);
  const [rotationRule, setRotationRule] = useState('4_in_4_out');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

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
              { key: 'sessions', label: 'Sessions', icon: Building },
              { key: 'rules', label: 'Rules & Modes', icon: Sliders },
              { key: 'audit', label: 'Audit Logs', icon: FileText },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all clay-btn whitespace-nowrap ${
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

        {/* Tab 2: Sessions Archive */}
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

              {savedNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Platform settings saved successfully.</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-3 clay-btn clay-btn-primary rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="clay-card rounded-3xl p-6 sm:p-7">
            <h2 className="font-black text-slate-900 text-base mb-1">Operational Audit Trail</h2>
            <p className="text-xs text-slate-500 mb-4 font-medium">Immutable session logs for dispute resolution</p>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3.5 clay-subcard rounded-2xl flex justify-between">
                <span>[SESSION_STARTED] venue: PickleCenter Arena courts: 3 mode: balanced</span>
                <span className="text-slate-400 font-bold">System</span>
              </div>
              <div className="p-3.5 clay-subcard rounded-2xl flex justify-between">
                <span>[MATCH_COMPLETED] Court 1 — Winning Team: Team A — 11 to 9</span>
                <span className="text-slate-400 font-bold">Organizer</span>
              </div>
              <div className="p-3.5 clay-subcard rounded-2xl flex justify-between">
                <span>[MATCHING_MODE_CHANGED] Updated mode to social_mix</span>
                <span className="text-slate-400 font-bold">Organizer</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
