import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { LandingPage } from './pages/LandingPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { PlayerSession } from './pages/PlayerSession';
import { JoinSession } from './pages/JoinSession';
import { SessionSummary } from './pages/SessionSummary';
import { AdminDashboard } from './pages/AdminDashboard';

type AppView = 'landing' | 'organizer' | 'player' | 'join' | 'summary' | 'admin';

function AppRouter() {
  const { setSessionId } = useSession();
  const [view, setView] = useState<AppView>('landing');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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
      } else if (parts[0] === 'organizer' && parts[1]) {
        setActiveSessionId(parts[1]);
        setSessionId(parts[1]);
        setView('organizer');
      } else if (parts[0] === 'summary' && parts[1]) {
        setActiveSessionId(parts[1]);
        setSessionId(parts[1]);
        setView('summary');
      } else if (parts[0] === 'admin') {
        setView('admin');
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

  switch (view) {
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

    case 'admin':
      return (
        <AdminDashboard
          onBackToHome={handleBackToHome}
          onOpenSession={(sId) => handleSelectSession(sId, 'organizer')}
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
        />
      );
  }
}

export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <AppRouter />
      </SessionProvider>
    </AuthProvider>
  );
}
