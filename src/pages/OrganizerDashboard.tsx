import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Court, Match, Participant, GroupMatchProposal, MatchingMode } from '../types';
import { CourtCard } from '../components/courts/CourtCard';
import { NextGroupCard } from '../components/queue/NextGroupCard';
import { QueueTable } from '../components/queue/QueueTable';
import { LiveLeaderboard } from '../components/leaderboard/LiveLeaderboard';
import { MatchResultModal } from '../components/matches/MatchResultModal';
import { ManualMatchModal } from '../components/matches/ManualMatchModal';
import { AddPlayerModal } from '../components/players/AddPlayerModal';
import { SpeechSettingsModal } from '../components/announcements/SpeechSettingsModal';
import { EndSessionModal } from '../components/shared/EndSessionModal';
import { QRCodeDisplay } from '../components/qr/QRCodeDisplay';
import { MatchTimer } from '../components/ui/WaitTimeTracker';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ProfileAvatarBadge } from '../components/profile/ProfileAvatarBadge';
import { ProfileModal } from '../components/profile/ProfileModal';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { speechService } from '../services/speech/speechService';
import {
  startMatchOnCourt,
  completeMatch,
  updateCourtState,
  updateParticipantRestStatus,
  leaveSession,
  updateSessionMode,
  addCourtToSession,
  forceResetCourt,
  createSession,
} from '../services/sessions/sessionService';
import {
  QrCode,
  Volume2,
  Users,
  Plus,
  Play,
  RotateCcw,
  Trophy,
  AlertTriangle,
  WifiOff,
  Home,
  ChevronDown,
  Layers,
  Activity,
  ListOrdered,
} from 'lucide-react';

interface OrganizerDashboardProps {
  onBackToHome: () => void;
  onViewSummary: () => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  onBackToHome,
  onViewSummary,
}) => {
  const {
    sessionId,
    session,
    courts,
    participants,
    waitingQueue,
    playingParticipants,
    activeMatches,
    matches,
    nextProposal,
    isOnline,
    loading,
    error,
    setSessionId,
  } = useSession();

  // Mobile section tab (Courts | Queue | Next | Leaderboard)
  const [mobileSection, setMobileSection] = useState<'all' | 'courts' | 'next' | 'queue' | 'leaderboard'>('all');

  // Modals state
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showSpeechModal, setShowSpeechModal] = useState(false);
  const [showManualMatchModal, setShowManualMatchModal] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isAutoCreating, setIsAutoCreating] = useState(false);

  // Result Modal State
  const [activeEndingCourt, setActiveEndingCourt] = useState<{ court: Court; match: Match } | null>(null);

  // Selected participant IDs for manual operations
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);

  const handleLaunchEmergencySession = async () => {
    setIsAutoCreating(true);
    try {
      const newId = await createSession({
        name: 'PickleQueue Open Play',
        venueName: 'Sunset Club Courts',
        numberOfCourts: 3,
        matchingMode: 'balanced',
        organizerId: 'org-instant',
      });
      if (newId) {
        setSessionId(newId);
        window.history.pushState({}, '', `/organizer/${newId}`);
      }
    } catch (err) {
      console.error('Failed to quick start session:', err);
    } finally {
      setIsAutoCreating(false);
    }
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="clay-card rounded-3xl p-8 text-center max-w-xs w-full">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-800">Connecting to Queue...</p>
        </div>
      </div>
    );
  }

  if (!session || !sessionId) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="clay-card rounded-3xl p-8 text-center max-w-md w-full">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-black text-slate-900 text-lg">Terminal Connecting</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            {error || 'The session is connecting or no active terminal is currently selected.'}
          </p>
          <div className="space-y-2.5">
            <button
              onClick={handleLaunchEmergencySession}
              disabled={isAutoCreating}
              className="w-full py-3 clay-btn clay-btn-primary rounded-2xl text-xs font-black shadow-md cursor-pointer"
            >
              {isAutoCreating ? 'Starting Terminal...' : 'Launch Active Terminal Session'}
            </button>
            <button
              onClick={onBackToHome}
              className="w-full py-3 clay-btn clay-btn-secondary text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure courts exist seamlessly even if initial snapshot is synchronizing
  const activeCourtsList: Court[] =
    courts.length > 0
      ? courts
      : Array.from({ length: session?.numberOfCourts || 3 }, (_, i) => ({
          courtId: `court-${i + 1}`,
          name: `Court ${i + 1}`,
          status: 'available' as const,
          currentMatchId: null,
          available: true,
          order: i + 1,
        }));

  const availableCourts = activeCourtsList.filter((c) => c.status === 'available');
  const sessionUrl = `${window.location.origin}/join/${session.id}`;

  const handleToggleQueueSelect = (pId: string) => {
    setSelectedQueueIds((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const handleToggleRest = async (p: Participant) => {
    try {
      await updateParticipantRestStatus(sessionId, p.participantId, !p.resting);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveParticipant = async (p: Participant) => {
    if (confirm(`Remove ${p.name} from the active session?`)) {
      try {
        await leaveSession(sessionId, p.participantId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleStartMatch = async (court: Court, proposal: GroupMatchProposal) => {
    try {
      await startMatchOnCourt(sessionId, court.courtId, court.name, proposal, session.matchingMode);
      speechService.announceCourtAssignment(
        proposal.players.map((p) => p.name),
        court.name,
        session.announcementSettings
      );
      setSelectedQueueIds([]);
    } catch (err) {
      console.error('Error starting match:', err);
    }
  };

  const handleEndMatchSubmit = async (
    winningTeam: 'teamA' | 'teamB',
    score?: { teamA: number; teamB: number }
  ) => {
    if (!activeEndingCourt) return;
    const { court, match } = activeEndingCourt;
    try {
      await completeMatch(sessionId, match.matchId, court.courtId, winningTeam, score);
      setActiveEndingCourt(null);
    } catch (err: any) {
      console.error('Error completing match cleanly, freeing court:', err);
      try {
        await forceResetCourt(sessionId, court.courtId);
      } catch (e) {
        console.warn('Court reset warning:', e);
      }
      setActiveEndingCourt(null);
    }
  };

  const handleResetCourt = async (court: Court) => {
    if (confirm(`Reset ${court.name} to available? This will clear any ongoing match state on this court.`)) {
      try {
        await forceResetCourt(sessionId, court.courtId);
      } catch (err) {
        console.error('Failed to reset court:', err);
      }
    }
  };

  const handleAnnounceCourt = (court: Court, match?: Match) => {
    if (!match) return;
    const playerNames = match.playerIds.map((id) => {
      const p = participants.find((item) => item.participantId === id);
      return p ? p.name : '';
    }).filter(Boolean);

    speechService.announceCourtAssignment(playerNames, court.name, session.announcementSettings);
  };

  const handleAnnounceNextUp = (players: Participant[]) => {
    speechService.announceNextUp(
      players.map((p) => p.name),
      session.announcementSettings
    );
  };

  const handleSetCourtMaintenance = async (court: Court, maintenance: boolean) => {
    await updateCourtState(sessionId, court.courtId, {
      status: maintenance ? 'maintenance' : 'available',
      available: !maintenance,
    });
  };

  const handleChangeMatchingMode = async (mode: MatchingMode) => {
    await updateSessionMode(sessionId, mode);
  };

  const handleAddCourt = async () => {
    await addCourtToSession(sessionId, `Court ${courts.length + 1}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col pb-20 lg:pb-8">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2 text-xs font-black flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <WifiOff className="w-4 h-4" />
          <span>Connection lost. Waiting to reconnect with cloud... (Queue updates paused)</span>
        </div>
      )}

      {/* Organizer Header */}
      <header className="bg-white/85 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/60 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Venue & Session Details */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={onBackToHome}
              className="w-10 h-10 rounded-2xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-600"
              title="Return to Home"
              aria-label="Return home"
            >
              <Home className="w-4 h-4" />
            </button>

            <BrandLogo size="sm" />
            <ProfileAvatarBadge
              size="sm"
              onClick={() => setShowProfileModal(true)}
            />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-xs">
                  {session.name}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-xl bg-emerald-100 text-emerald-800 font-black uppercase clay-pill">
                  {session.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {session.venueName} • Code: <strong className="text-slate-800 font-mono tracking-wider">{session.joinCode}</strong>
              </p>
            </div>
          </div>

          {/* Center: Live Stats Indicators (Tablet / Desktop) */}
          <div className="hidden md:flex items-center gap-5 text-xs text-slate-600 clay-subcard px-4 py-2 rounded-2xl">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-black">Courts Active</span>
              <span className="font-black text-slate-900 font-mono text-sm">
                {courts.filter((c) => c.status === 'playing').length} / {courts.length}
              </span>
            </div>
            <div className="border-l border-slate-200/80 pl-4">
              <span className="text-slate-400 block text-[10px] uppercase font-black">In Queue</span>
              <span className="font-black text-emerald-700 font-mono text-sm">
                {waitingQueue.length} Players
              </span>
            </div>
            <div className="border-l border-slate-200/80 pl-4">
              <span className="text-slate-400 block text-[10px] uppercase font-black">Session Time</span>
              <MatchTimer startedAt={session.startedAt} className="text-xs" />
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={session.matchingMode}
                onChange={(e) => handleChangeMatchingMode(e.target.value as MatchingMode)}
                className="clay-subcard text-slate-800 text-xs font-black rounded-2xl px-3 py-2 pr-7 appearance-none cursor-pointer focus:outline-hidden"
              >
                <option value="balanced">Balanced</option>
                <option value="social_mix">Social Mix</option>
                <option value="skill_separated">Skill Tiers</option>
                <option value="winners_losers">Win/Loss</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="px-3 py-2 rounded-2xl clay-btn clay-btn-secondary text-amber-700 text-xs font-black flex items-center justify-center gap-1.5"
              title="Live Standings & Leaderboard"
              aria-label="Leaderboard"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>

            <button
              onClick={() => setShowQRModal(true)}
              className="w-9 h-9 sm:w-auto sm:px-3 sm:py-2 rounded-2xl clay-btn clay-btn-secondary text-slate-700 text-xs font-black flex items-center justify-center gap-1.5"
              title="Show Player Join QR"
              aria-label="QR Code"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">QR</span>
            </button>

            <button
              onClick={() => setShowSpeechModal(true)}
              className="w-9 h-9 rounded-2xl clay-btn clay-btn-secondary flex items-center justify-center text-sky-600"
              title="Court Speaker Announcements"
              aria-label="Speaker Settings"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowEndSessionModal(true)}
              className="px-3 py-2 rounded-2xl clay-btn clay-btn-danger text-white text-xs font-black"
            >
              End
            </button>
          </div>
        </div>

        {/* MOBILE VIEW SWITCHER (Visible on < 1024px) */}
        <div className="lg:hidden px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto text-xs font-black">
          {(
            [
              { id: 'all', label: 'All Panels' },
              { id: 'courts', label: `Courts (${courts.length})` },
              { id: 'next', label: 'Next Up' },
              { id: 'queue', label: `Queue (${waitingQueue.length})` },
              { id: 'leaderboard', label: 'Leaderboard' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileSection(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all clay-btn whitespace-nowrap ${
                mobileSection === tab.id
                  ? 'clay-btn-primary text-white shadow-xs'
                  : 'clay-btn-secondary text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Operating Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {/* Next Up & Roster Action Row */}
        {(mobileSection === 'all' || mobileSection === 'next') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <ErrorBoundary fallbackTitle="Next Up On Deck">
                <NextGroupCard
                  proposal={nextProposal}
                  availableCourts={availableCourts}
                  onStartOnCourt={handleStartMatch}
                  onAnnounceNextUp={handleAnnounceNextUp}
                  onOpenManualBuilder={() => setShowManualMatchModal(true)}
                />
              </ErrorBoundary>
            </div>

            {/* Quick Roster Actions Card */}
            <div className="clay-card rounded-3xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-slate-900 text-sm">Organizer Controls</h3>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-xl clay-pill">
                    4-In / 4-Out
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4 font-medium">
                  When a game completes, all 4 players cycle off and return to the waiting queue according to fairness wait times.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => setShowAddPlayerModal(true)}
                  className="w-full py-3 clay-btn clay-btn-primary rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Check In Players (Single / Bulk)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowManualMatchModal(true)}
                    disabled={selectedQueueIds.length === 0 && waitingQueue.length < 4}
                    className="flex-1 py-2.5 clay-btn clay-btn-secondary rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    <span>Custom Match ({selectedQueueIds.length})</span>
                  </button>

                  <button
                    onClick={handleAddCourt}
                    className="py-2.5 px-3.5 clay-btn clay-btn-secondary text-slate-700 rounded-2xl text-xs font-black flex items-center gap-1"
                    title="Add Court"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Court</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courts Section Header & Grid */}
        {(mobileSection === 'all' || mobileSection === 'courts') && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Active Courts</h2>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-xl font-mono font-black clay-pill">
                  {activeCourtsList.length}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Live court assignment</span>
            </div>

            <ErrorBoundary fallbackTitle="Active Courts">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeCourtsList.map((court) => {
                  const currentMatch =
                    activeMatches.find((m) => m.matchId === court.currentMatchId || m.courtId === court.courtId) ||
                    matches.find((m) => m.matchId === court.currentMatchId || (m.courtId === court.courtId && m.status === 'playing'));
                  return (
                    <CourtCard
                      key={court.courtId}
                      court={court}
                      currentMatch={currentMatch}
                      participants={participants}
                      onEndMatch={(c, m) => setActiveEndingCourt({ court: c, match: m })}
                      onAnnounceCourt={handleAnnounceCourt}
                      onAssignNextGroup={(c) => {
                        if (nextProposal) {
                          handleStartMatch(c, nextProposal);
                        } else {
                          setShowManualMatchModal(true);
                        }
                      }}
                      onSetMaintenance={handleSetCourtMaintenance}
                      onResetCourt={handleResetCourt}
                    />
                  );
                })}
              </div>
            </ErrorBoundary>
          </div>
        )}

        {/* Live Leaderboard Section */}
        {(mobileSection === 'all' || mobileSection === 'leaderboard') && (
          <ErrorBoundary fallbackTitle="Live Leaderboard">
            <div>
              <LiveLeaderboard
                participants={participants}
                courts={courts}
                activeMatches={activeMatches}
              />
            </div>
          </ErrorBoundary>
        )}

        {/* Waiting Queue & Roster Table */}
        {(mobileSection === 'all' || mobileSection === 'queue') && (
          <ErrorBoundary fallbackTitle="Active Roster & Queue Table">
            <div>
              <QueueTable
                participants={participants}
                selectedIds={selectedQueueIds}
                onToggleSelect={handleToggleQueueSelect}
                onToggleRest={handleToggleRest}
                onRemove={handleRemoveParticipant}
                onEdit={(p) => {}}
                isOrganizer={true}
              />
            </div>
          </ErrorBoundary>
        )}
      </main>

      {/* Mobile Sticky Quick Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-slate-200/70 px-4 py-2.5 pb-safe flex items-center justify-between gap-2 shadow-lg">
        <button
          onClick={() => setShowAddPlayerModal(true)}
          className="flex-1 py-3 px-3 clay-btn clay-btn-primary rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Check In</span>
        </button>

        <button
          onClick={() => setShowManualMatchModal(true)}
          disabled={waitingQueue.length < 4 && selectedQueueIds.length === 0}
          className="flex-1 py-3 px-3 clay-btn clay-btn-secondary rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <Users className="w-4 h-4 text-slate-700" />
          <span>Match ({selectedQueueIds.length > 0 ? selectedQueueIds.length : '4'})</span>
        </button>

        <button
          onClick={() => setShowQRModal(true)}
          className="w-12 h-12 clay-btn clay-btn-secondary rounded-2xl flex items-center justify-center text-emerald-700"
          title="Show QR Code"
          aria-label="Show QR Code"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 shadow-2xl max-w-sm w-full max-h-[90dvh] overflow-y-auto relative">
            <QRCodeDisplay
              url={sessionUrl}
              title={session.name}
              subtitle="Scan with phone camera to enter live queue"
            />
            <button
              onClick={() => setShowQRModal(false)}
              className="mt-4 w-full py-2.5 clay-btn clay-btn-secondary rounded-2xl text-xs font-black"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Record Match Result Modal */}
      {activeEndingCourt && (
        <MatchResultModal
          court={activeEndingCourt.court}
          match={activeEndingCourt.match}
          participants={participants}
          isOpen={true}
          onClose={() => setActiveEndingCourt(null)}
          onSubmit={handleEndMatchSubmit}
        />
      )}

      {/* Manual Match Modal */}
      {showManualMatchModal && (
        <ManualMatchModal
          isOpen={true}
          onClose={() => setShowManualMatchModal(false)}
          availableCourts={availableCourts}
          availableParticipants={waitingQueue}
          preSelectedIds={selectedQueueIds}
          onStartMatch={handleStartMatch}
        />
      )}

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <AddPlayerModal
          sessionId={sessionId}
          isOpen={true}
          onClose={() => setShowAddPlayerModal(false)}
          onSuccess={() => {}}
        />
      )}

      {/* Speech Settings Modal */}
      {showSpeechModal && (
        <SpeechSettingsModal
          isOpen={true}
          onClose={() => setShowSpeechModal(false)}
          settings={session.announcementSettings}
          onSave={async () => {}}
        />
      )}

      {/* End Session Confirmation Modal */}
      {showEndSessionModal && (
        <EndSessionModal
          session={session}
          isOpen={true}
          onClose={() => setShowEndSessionModal(false)}
          onCompleted={onViewSummary}
        />
      )}

      {/* Live Leaderboard Modal */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="clay-card rounded-3xl max-w-4xl w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-slate-900 text-base">Session Leaderboard (Live)</h3>
              </div>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500 text-xs font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <LiveLeaderboard
              participants={participants}
              courts={courts}
              activeMatches={activeMatches}
              showTitle={false}
            />
          </div>
        </div>
      )}

      {/* Organizer / Staff Profile & Photo Modal */}
      {showProfileModal && (
        <ProfileModal
          isOpen={true}
          onClose={() => setShowProfileModal(false)}
          sessionId={sessionId}
        />
      )}
    </div>
  );
};
