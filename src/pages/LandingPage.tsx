import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { Session, MatchingMode } from '../types';
import { createSession, getSessionByJoinCode, getRecentLocalSessions, getCachedSession } from '../services/sessions/sessionService';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  PlusCircle,
  Users,
  Search,
  LogIn,
  LogOut,
  ShieldCheck,
  Activity,
  Play,
  RotateCcw,
  Sparkles,
  Award,
} from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ProfileAvatarBadge } from '../components/profile/ProfileAvatarBadge';
import { ProfileModal } from '../components/profile/ProfileModal';
import { FloatingClayIcons } from '../components/ui/FloatingClayIcons';
import { firePickleballBurst } from '../services/fx/pickleballBurst';
import { OrganizerLoginModal } from '../components/auth/OrganizerLoginModal';

interface LandingPageProps {
  onSelectSession: (sessionId: string, mode: 'organizer' | 'player') => void;
  onOpenAdmin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectSession, onOpenAdmin }) => {
  const { user, isAdmin, isOrganizer, organizerEmail, logout, signInAsAnonymousPlayer } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Organizer Login Modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // New Session Creation Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionName, setSessionName] = useState('Friday Night Open Play');
  const [venueName, setVenueName] = useState('PickleCenter Arena');
  const [courtCount, setCourtCount] = useState(3);
  const [matchMode, setMatchMode] = useState<MatchingMode>('balanced');
  const [isCreating, setIsCreating] = useState(false);
  const [createSessionError, setCreateSessionError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  // Helper to open the best matching organizer terminal without collapsing
  const handleOpenTerminal = async () => {
    const activeId = localStorage.getItem('picklequeue_active_session_id');
    if (activeId) {
      const matched = sessions.find((s) => s.id === activeId);
      if (matched) {
        onSelectSession(matched.id, 'organizer');
        return;
      }
      const cached = getCachedSession(activeId);
      if (cached && cached.session && cached.session.status !== 'completed') {
        onSelectSession(cached.session.id, 'organizer');
        return;
      }
    }

    if (sessions.length > 0) {
      onSelectSession(sessions[0].id, 'organizer');
      return;
    }

    const localRecent = getRecentLocalSessions();
    if (localRecent.length > 0) {
      onSelectSession(localRecent[0].id, 'organizer');
      return;
    }

    if (loading) {
      try {
        const q = query(collection(db, 'sessions'), where('status', 'in', ['active', 'paused']), limit(5));
        const snap = await getDocs(q);
        if (!snap.empty) {
          onSelectSession(snap.docs[0].id, 'organizer');
          return;
        }
      } catch {}
    }

    setShowCreateModal(true);
  };

  const fetchActiveSessions = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'sessions'),
        where('status', 'in', ['active', 'paused']),
        limit(10)
      );
      const snap = await getDocs(q);
      const list: Session[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Session));

      // Also merge any recently created active sessions from local cache
      const localRecent = getRecentLocalSessions();
      for (const loc of localRecent) {
        if (!list.some((s) => s.id === loc.id) && loc.status !== 'completed') {
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

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setIsJoining(true);
    setJoinCodeError(null);
    try {
      const found = await getSessionByJoinCode(joinCodeInput);
      if (found) {
        onSelectSession(found.id, 'player');
      } else {
        setJoinCodeError('Session code not found. Please verify the 6-character code.');
      }
    } catch (err) {
      setJoinCodeError('Error checking join code.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    setCreateSessionError(null);
    try {
      let currentUser = user;
      if (!currentUser) {
        try {
          currentUser = await Promise.race([
            signInAsAnonymousPlayer(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
          ]);
        } catch {
          // Gracefully continue even if anonymous auth is restricted
        }
      }
      const effectiveOrganizerEmail = user?.email || organizerEmail || 'organizer@picklequeue.internal';
      const effectiveOrganizerId = currentUser?.uid || `org-${Date.now()}`;
      const sessionId = await createSession({
        name: sessionName.trim() || 'Open Play Session',
        venueName: venueName.trim() || 'PickleCenter Arena',
        numberOfCourts: courtCount || 3,
        matchingMode: matchMode || 'balanced',
        organizerId: effectiveOrganizerId,
        organizerEmail: effectiveOrganizerEmail,
      });

      if (!sessionId) {
        throw new Error('Unable to generate session terminal ID.');
      }

      setShowCreateModal(false);
      onSelectSession(sessionId, 'organizer');

      // Refresh background active sessions list silently
      fetchActiveSessions().catch(() => {});
    } catch (err: any) {
      console.error('Session creation error:', err);
      setCreateSessionError(err?.message || 'Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickDemoSession = async () => {
    setIsCreating(true);
    try {
      let currentUser = user;
      if (!currentUser) {
        try {
          currentUser = await signInAsAnonymousPlayer();
        } catch {}
      }
      const effectiveOrganizerEmail = user?.email || organizerEmail || 'organizer@picklequeue.internal';
      const effectiveOrganizerId = currentUser?.uid || `org-${Date.now()}`;
      const sessionId = await createSession({
        name: 'PickleQueue Open Play (Demo)',
        venueName: 'Sunset Club Courts',
        numberOfCourts: 3,
        matchingMode: 'balanced',
        organizerId: effectiveOrganizerId,
        organizerEmail: effectiveOrganizerEmail,
      });
      if (sessionId) {
        fetchActiveSessions();
        onSelectSession(sessionId, 'organizer');
      }
    } catch (err) {
      console.error('Demo session creation error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between relative overflow-x-hidden">
      {/* Background Floating 3D Clay Icons Layer */}
      <FloatingClayIcons />

      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/60 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <BrandLogo size="md" />
            <div>
              <span className="font-black text-lg tracking-tight text-slate-900">PickleQueue</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-bold px-2 py-0.5 rounded-xl bg-emerald-100 text-emerald-800 clay-pill">
                Live Open-Play
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAdmin}
                  className="px-3 py-2 rounded-2xl clay-btn clay-btn-secondary text-purple-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span className="hidden sm:inline">Admin Console</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-2 rounded-2xl clay-btn clay-btn-primary text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Host Session</span>
                </button>
                <button
                  onClick={handleOpenTerminal}
                  className="px-3 py-2 rounded-2xl clay-btn clay-btn-primary bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Terminal</span>
                </button>
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-purple-50 text-purple-800 text-xs font-bold clay-subcard">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="truncate max-w-[150px]">{user?.email || organizerEmail || 'Admin'}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-2xl clay-btn clay-btn-secondary text-slate-600 text-xs"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <ProfileAvatarBadge
                  size="sm"
                  onClick={() => setShowProfileModal(true)}
                />
              </div>
            ) : isOrganizer ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold clay-subcard">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="hidden sm:inline">Organizer:</span>
                  <span className="truncate max-w-[140px]">{user?.email || organizerEmail || 'Staff'}</span>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-2 rounded-2xl clay-btn clay-btn-primary text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Host Session</span>
                </button>
                <button
                  onClick={handleOpenTerminal}
                  className="px-3 py-2 rounded-2xl clay-btn clay-btn-primary bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Terminal</span>
                </button>
                <button
                  onClick={logout}
                  className="p-2 rounded-2xl clay-btn clay-btn-secondary text-slate-600 text-xs"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <ProfileAvatarBadge
                  size="sm"
                  onClick={() => setShowProfileModal(true)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-2 rounded-2xl clay-btn clay-btn-primary text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Host Session</span>
                </button>
                <button
                  onClick={handleOpenTerminal}
                  className="px-3 py-2 rounded-2xl clay-btn clay-btn-secondary text-slate-800 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Open Terminal</span>
                </button>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-3.5 py-2 rounded-2xl clay-btn clay-btn-secondary text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-xs hover:border-emerald-300 transition-all"
                >
                  <LogIn className="w-4 h-4 text-emerald-600" />
                  <span>Organizer Login</span>
                </button>
                <ProfileAvatarBadge
                  size="sm"
                  onClick={() => setShowProfileModal(true)}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 flex-1 w-full relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 relative z-20">
          {/* Interactive Brand Logo Highlight with Pickleball Burst */}
          <div className="flex justify-center mb-5">
            <div
              className="relative group cursor-pointer"
              onClick={(e) => firePickleballBurst(e.clientX, e.clientY)}
              title="Click to burst pickleballs! 🎾"
            >
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden clay-card p-2.5 transform transition-all group-hover:scale-105 active:scale-95 bg-white">
                <img
                  src="/logo.png"
                  alt="Pickleheads Brand Logo"
                  className="w-full h-full object-contain rounded-2xl"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-2xl bg-emerald-100 text-emerald-900 text-xs font-black mb-4 clay-pill">
            <span>Fair Play • Clear Queues • More Games</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            The modern queue system for pickleball open-play.
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            Real-time court rotations, frictionless QR joining, 4-in/4-out fairness, and multiple
            smart matching algorithms.
          </p>

          {/* Quick Join By Code Bar */}
          <div className="mt-6 sm:mt-8 max-w-md mx-auto">
            <div className="clay-card rounded-3xl p-2.5">
              <form onSubmit={handleJoinByCode} className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 clay-inset rounded-2xl px-4 py-2.5 flex items-center">
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="ENTER 6-CHAR CODE"
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-transparent font-mono font-black text-center sm:text-left text-slate-900 tracking-widest uppercase focus:outline-hidden text-sm sm:text-base placeholder:text-slate-400 placeholder:font-sans placeholder:tracking-normal placeholder:font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isJoining || !joinCodeInput.trim()}
                  className="clay-btn clay-btn-primary px-6 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <span>{isJoining ? 'Entering...' : 'Join Queue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
            {joinCodeError && (
              <p className="text-xs text-rose-600 font-bold mt-2.5">{joinCodeError}</p>
            )}
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-10 sm:mb-12 relative z-20">
          {/* Card 1: Start New Session */}
          <div className="clay-card rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 clay-subcard">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Host an Open-Play Session</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Configure courts, set matching mode (Balanced, Social Mix, or Skill Separated), and project the queue.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 w-full py-3.5 clay-btn clay-btn-primary rounded-2xl text-xs font-black flex items-center justify-center gap-2"
            >
              <span>Create Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Quick Demo Run */}
          <div className="clay-card rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4 clay-subcard">
                <Play className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">1-Click Live Simulation</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Launch an active 3-court session with automated queue mechanics to preview live tournament rotation.
              </p>
            </div>
            <button
              onClick={handleQuickDemoSession}
              disabled={isCreating}
              className="mt-6 w-full py-3.5 clay-btn clay-btn-sky rounded-2xl text-xs font-black flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <span>{isCreating ? 'Creating...' : 'Launch Demo Session'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: Feature Highlights */}
          <div className="clay-card-dark rounded-3xl text-white p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Core Principles</span>
              </div>
              <h2 className="text-lg font-black text-white">4 In / 4 Out Fairness</h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-medium">
                No king-of-the-court monopolization. Every player receives fair turns, tracked wait times, and clear rotation.
              </p>
            </div>
            <div className="mt-6 text-[11px] text-slate-300 border-t border-slate-800 pt-3 flex items-center justify-between font-bold">
              <span>Multi-Algorithm Engine</span>
              <span className="text-emerald-400">Voice Announcer</span>
            </div>
          </div>
        </div>

        {/* Live Active Sessions Section */}
        <div className="clay-card rounded-3xl p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Venue Sessions</h2>
              <p className="text-xs text-slate-500 font-medium">Currently open queues you can join or manage</p>
            </div>
            <button
              onClick={fetchActiveSessions}
              className="px-3 py-2 rounded-2xl clay-btn clay-btn-secondary text-slate-600 text-xs font-bold flex items-center gap-1.5"
              title="Refresh Sessions"
              aria-label="Refresh sessions"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">Loading active sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-10 text-center clay-subcard rounded-2xl border-2 border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-extrabold text-slate-800">No sessions currently active.</p>
              <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">Click below to start the first session.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="clay-btn clay-btn-primary px-5 py-2.5 rounded-2xl text-xs font-black shadow-md"
              >
                Create First Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-5 rounded-2xl clay-subcard flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl clay-pill font-mono">
                        Code: {sess.joinCode}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase">
                        {sess.numberOfCourts} Courts
                      </span>
                    </div>
                    <h3 className="font-black text-slate-900 text-base">{sess.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{sess.venueName}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      onClick={() => onSelectSession(sess.id, 'player')}
                      className="w-full sm:flex-1 py-2.5 rounded-xl clay-btn clay-btn-secondary text-slate-800 text-xs font-black text-center"
                    >
                      Join as Player
                    </button>
                    <button
                      onClick={() => onSelectSession(sess.id, 'organizer')}
                      className="w-full sm:flex-1 py-2.5 rounded-xl clay-btn clay-btn-primary text-white text-xs font-black text-center shadow-md"
                    >
                      Organizer Terminal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 border-t border-slate-200/60 py-6 relative z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            <strong className="text-slate-800 font-bold">PickleQueue</strong> — Fair play open-play live rotation system.
          </div>
          <div>Everyone always knows whose turn it is.</div>
        </div>
      </footer>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="clay-card rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black text-slate-900">Create Open-Play Session</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Setup courts and queue matching mode</p>

            {createSessionError && (
              <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-in fade-in">
                {createSessionError}
              </div>
            )}

            <form onSubmit={handleCreateNewSession} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Session Name
                </label>
                <div className="clay-inset rounded-2xl px-3 py-2">
                  <input
                    type="text"
                    required
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Venue Name
                </label>
                <div className="clay-inset rounded-2xl px-3 py-2">
                  <input
                    type="text"
                    required
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Available Courts
                </label>
                <div className="clay-inset rounded-2xl px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    max="16"
                    required
                    value={courtCount}
                    onChange={(e) => setCourtCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Matching Mode
                </label>
                <div className="clay-inset rounded-2xl px-3 py-2">
                  <select
                    value={matchMode}
                    onChange={(e) => setMatchMode(e.target.value as MatchingMode)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  >
                    <option value="balanced">Balanced Teams (Default)</option>
                    <option value="social_mix">Social Mix (Rotate Partners & Opponents)</option>
                    <option value="skill_separated">Skill Separated (Tiered Pools)</option>
                    <option value="winners_losers">Winners / Losers (Split Results)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isCreating ? 'Launching Terminal...' : 'Create & Open Terminal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Organizer & Staff Login Modal */}
      <OrganizerLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(action) => {
          setShowLoginModal(false);
          if (action === 'admin') {
            onOpenAdmin();
          } else if (action === 'create_session') {
            setShowCreateModal(true);
          } else {
            // Default: if active sessions exist, open the first session's terminal; otherwise prompt to create one!
            if (sessions.length > 0) {
              onSelectSession(sessions[0].id, 'organizer');
            } else {
              setShowCreateModal(true);
            }
          }
        }}
      />

      {/* Player Profile & Photo Upload Modal */}
      {showProfileModal && (
        <ProfileModal
          isOpen={true}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
};
