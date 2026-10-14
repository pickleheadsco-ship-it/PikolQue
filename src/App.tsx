import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { LandingPage } from './pages/LandingPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { PlayerSession } from './pages/PlayerSession';
import { JoinSession } from './pages/JoinSession';
import { SessionSummary } from './pages/SessionSummary';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/ProfilePage';
import { ClubMemberManagement } from './components/club/ClubMemberManagement';
import { LiveLeaderboard } from './components/leaderboard/LiveLeaderboard';
import { ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

type AppView = 'landing' | 'organizer' | 'player' | 'join' | 'summary' | 'admin' | 'profile' | 'club' | 'leaderboard';

function AppRouter() {
  const { setSessionId } = useSession();
  const [view, setView] = useState<AppView>('landing');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<AppView>('landing');

  // Initialize view from URL path and support mobile browser back/forward buttons
  useEffect(() => {
    const parseRoute = () => {
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean);

      if (parts[0] === 'join' && parts[1]) {
        setActiveSessionId(parts[1]);
        setSessionId(parts[1]);
        setView('join');
      } else if (parts[0] === 'player' && parts[1]) {
        setActiveSessionId(parts[1]);
        setSessionId(parts[1]);
        setView('player');
      } else if (parts[0] === 'organizer') {
        const targetId =
          parts[1] ||
          localStorage.getItem('picklequeue_active_session_id') ||
          localStorage.getItem('picklequeue_participant_session_id');
        if (targetId) {
          setActiveSessionId(targetId);
          setSessionId(targetId);
          setView('organizer');
          if (!parts[1]) {
            window.history.replaceState({}, '', `/organizer/${targetId}`);
          }
        } else {
          setView('landing');
          setActiveSessionId(null);
          setSessionId(null);
        }
      } else if (parts[0] === 'summary' && parts[1]) {
        setActiveSessionId(parts[1]);
        setSessionId(parts[1]);
        setView('summary');
      } else if (parts[0] === 'admin') {
        setView('admin');
      } else if (parts[0] === 'profile') {
        setView('profile');
      } else if (parts[0] === 'club') {
        setView('club');
      } else if (parts[0] === 'leaderboard') {
        setView('leaderboard');
      } else {
        setView('landing');
        setActiveSessionId(null);
        setSessionId(null);
      }
    };

    parseRoute();
    window.addEventListener('popstate', parseRoute);
    return () => window.removeEventListener('popstate', parseRoute);
  }, [setSessionId]);

  const handleSelectSession = (sessionId: string, mode: 'organizer' | 'player') => {
    setActiveSessionId(sessionId);
    setSessionId(sessionId);
    if (mode === 'player') {
      // Check if user already joined this session
      const savedId = localStorage.getItem('picklequeue_participant_id');
      if (savedId) {
        setView('player');
        window.history.pushState({}, '', `/player/${sessionId}`);
      } else {
        setView('join');
        window.history.pushState({}, '', `/join/${sessionId}`);
      }
    } else {
      setView('organizer');
      window.history.pushState({}, '', `/organizer/${sessionId}`);
    }
  };

  const handleBackToHome = () => {
    setView('landing');
    setActiveSessionId(null);
    setSessionId(null);
    window.history.pushState({}, '', '/');
  };

  const handleBackFromProfile = () => {
    if (activeSessionId) {
      const savedId = localStorage.getItem('picklequeue_participant_id');
      if (savedId) {
        setView('player');
        window.history.pushState({}, '', `/player/${activeSessionId}`);
      } else {
        setView('join');
        window.history.pushState({}, '', `/join/${activeSessionId}`);
      }
    } else {
      handleBackToHome();
    }
  };

  switch (view) {
    case 'profile':
      return (
        <ProfilePage
          onBack={handleBackFromProfile}
          sessionId={activeSessionId}
          participantId={localStorage.getItem('picklequeue_participant_id')}
        />
      );

    case 'organizer':
      return (
        <OrganizerDashboard
          onBackToHome={handleBackToHome}
          onViewSummary={() => {
            setView('summary');
            if (activeSessionId) window.history.pushState({}, '', `/summary/${activeSessionId}`);
          }}
        />
      );

    case 'player':
      return (
        <PlayerSession
          onLeaveToHome={handleBackToHome}
          onOpenJoinScreen={() => {
            setView('join');
            if (activeSessionId) window.history.pushState({}, '', `/join/${activeSessionId}`);
          }}
        />
      );

    case 'join':
      return (
        <JoinSession
          onJoinSuccess={() => {
            setView('player');
            if (activeSessionId) window.history.pushState({}, '', `/player/${activeSessionId}`);
          }}
          onBackToHome={handleBackToHome}
        />
      );

    case 'summary':
      return (
        <SessionSummary
          onBackToHome={handleBackToHome}
          onBackToSession={() => {
            setView('organizer');
            if (activeSessionId) window.history.pushState({}, '', `/organizer/${activeSessionId}`);
          }}
        />
      );

    case 'club':
      return (
        <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
          <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToHome}
                  className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors clay-btn cursor-pointer"
                  aria-label="Back to home"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="font-black text-sm sm:text-base tracking-tight text-white">Club Member Management</h1>
              </div>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
            <ClubMemberManagement activeSessionId={activeSessionId} />
          </main>
        </div>
      );

    case 'leaderboard':
      return (
        <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
          <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToHome}
                  className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors clay-btn cursor-pointer"
                  aria-label="Back to home"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="font-black text-sm sm:text-base tracking-tight text-white">Pickleheads Open Play Standings</h1>
              </div>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
            <div className="clay-card rounded-3xl p-4 sm:p-5 shadow-xl">
              <LiveLeaderboard showTitle={false} />
            </div>
          </main>
        </div>
      );

    case 'admin':
      return (
        <AdminDashboard
          onBackToHome={handleBackToHome}
          onOpenSession={(sId) => handleSelectSession(sId, 'organizer')}
          onNavigateToView={(targetView, sId) => {
            if (sId) {
              handleSelectSession(sId, targetView === 'player' ? 'player' : 'organizer');
            } else {
              setView(targetView as AppView);
              window.history.pushState({}, '', targetView === 'landing' ? '/' : `/${targetView}`);
            }
          }}
        />
      );

    case 'landing':
    default:
      return (
        <LandingPage
          onSelectSession={handleSelectSession}
          onOpenAdmin={() => {
            setView('admin');
            window.history.pushState({}, '', '/admin');
          }}
          onNavigateToView={(targetView, sId) => {
            if (sId) {
              handleSelectSession(sId, targetView === 'player' ? 'player' : 'organizer');
            } else {
              setView(targetView as AppView);
              window.history.pushState({}, '', targetView === 'landing' ? '/' : `/${targetView}`);
            }
          }}
        />
      );
  }
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="PickleQueue Encountered an Error">
      <AuthProvider>
        <SessionProvider>
          <AppRouter />
        </SessionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
