import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { handleFirestoreError, OperationType } from '../services/firebase/errors';
import {
  Session,
  Participant,
  Court,
  Match,
  GroupMatchProposal,
} from '../types';
import {
  getNextGroup,
  getEligibleWaitingPlayers,
} from '../services/matching/matchingEngine';
import { getCachedSession, cacheSessionLocally } from '../services/sessions/sessionService';

interface SessionContextType {
  sessionId: string | null;
  session: Session | null;
  courts: Court[];
  participants: Participant[];
  waitingQueue: Participant[];
  playingParticipants: Participant[];
  restingParticipants: Participant[];
  matches: Match[];
  activeMatches: Match[];
  nextProposal: GroupMatchProposal | null;
  currentParticipant: Participant | null;
  isOnline: boolean;
  loading: boolean;
  error: string | null;
  setSessionId: (id: string | null) => void;
  setCurrentParticipantId: (id: string | null) => void;
}

const SessionContext = createContext<SessionContextType>({
  sessionId: null,
  session: null,
  courts: [],
  participants: [],
  waitingQueue: [],
  playingParticipants: [],
  restingParticipants: [],
  matches: [],
  activeMatches: [],
  nextProposal: null,
  currentParticipant: null,
  isOnline: true,
  loading: true,
  error: null,
  setSessionId: () => {},
  setCurrentParticipantId: () => {},
});

export const SessionProvider: React.FC<{
  initialSessionId?: string | null;
  children: React.ReactNode;
}> = ({ initialSessionId = null, children }) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [session, setSession] = useState<Session | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Local participant ID for this browser
  const [currentParticipantId, setCurrentParticipantIdState] = useState<string | null>(() => {
    return localStorage.getItem('picklequeue_participant_id');
  });

  const setCurrentParticipantId = (id: string | null) => {
    if (id) {
      localStorage.setItem('picklequeue_participant_id', id);
    } else {
      localStorage.removeItem('picklequeue_participant_id');
    }
    setCurrentParticipantIdState(id);
  };

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to Session and subcollections
  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setCourts([]);
      setParticipants([]);
      setMatches([]);
      setLoading(false);
      return;
    }

    // Attempt instantaneous load from cached session data
    const local = getCachedSession(sessionId);
    if (local) {
      setSession(local.session);
      setCourts(local.courts);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    // 1. Session Document Listener
    const sessionDocRef = doc(db, 'sessions', sessionId);
    const unsubSession = onSnapshot(
      sessionDocRef,
      (snap) => {
        if (snap.exists()) {
          const fresh = { id: snap.id, ...snap.data() } as Session;
          setSession(fresh);
          setError(null);
          // Keep local cache fresh
          const existing = getCachedSession(sessionId);
          cacheSessionLocally(fresh, existing?.courts || []);
        } else {
          // If Firestore doesn't have it, keep cached or show message
          const fallback = getCachedSession(sessionId);
          if (fallback) {
            setSession(fallback.session);
          } else {
            setSession(null);
            setError('Session not found or has been removed.');
          }
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Session onSnapshot warning:', err);
        const fallback = getCachedSession(sessionId);
        if (fallback) {
          setSession((prev) => prev || fallback.session);
        } else {
          setError('Operating in offline queue mode.');
        }
        setLoading(false);
      }
    );

    // 2. Courts Collection Listener
    const courtsRef = collection(db, `sessions/${sessionId}/courts`);
    const courtsQuery = query(courtsRef, orderBy('order', 'asc'));
    const unsubCourts = onSnapshot(
      courtsQuery,
      (snap) => {
        const list: Court[] = [];
        snap.forEach((d) => list.push({ courtId: d.id, ...d.data() } as Court));
        if (list.length > 0) {
          setCourts(list);
          const current = getCachedSession(sessionId);
          if (current?.session) {
            cacheSessionLocally(current.session, list);
          }
        } else {
          // If Firestore snapshot is empty yet, maintain fallback courts
          const fallback = getCachedSession(sessionId);
          if (fallback && fallback.courts.length > 0) {
            setCourts((prev) => (prev.length > 0 ? prev : fallback.courts));
          }
        }
      },
      (err) => {
        console.warn('Courts onSnapshot warning:', err);
        const fallback = getCachedSession(sessionId);
        if (fallback && fallback.courts.length > 0) {
          setCourts((prev) => (prev.length > 0 ? prev : fallback.courts));
        }
      }
    );

    // 3. Participants Collection Listener
    const participantsRef = collection(db, `sessions/${sessionId}/participants`);
    const unsubParticipants = onSnapshot(
      participantsRef,
      (snap) => {
        const list: Participant[] = [];
        snap.forEach((d) => list.push({ participantId: d.id, ...d.data() } as Participant));
        setParticipants(list);
      },
      (err) => {
        console.warn('Participants onSnapshot warning:', err);
      }
    );

    // 4. Matches Collection Listener
    const matchesRef = collection(db, `sessions/${sessionId}/matches`);
    const unsubMatches = onSnapshot(
      matchesRef,
      (snap) => {
        const list: Match[] = [];
        snap.forEach((d) => list.push({ matchId: d.id, ...d.data() } as Match));
        setMatches(list);
      },
      (err) => {
        console.warn('Matches onSnapshot warning:', err);
      }
    );

    return () => {
      unsubSession();
      unsubCourts();
      unsubParticipants();
      unsubMatches();
    };
  }, [sessionId]);

  // Derived Waiting Queue (Sorted by queue position)
  const waitingQueue = useMemo(() => {
    return getEligibleWaitingPlayers(participants);
  }, [participants]);

  const playingParticipants = useMemo(() => {
    return participants.filter((p) => p.status === 'playing');
  }, [participants]);

  const restingParticipants = useMemo(() => {
    return participants.filter((p) => p.resting || p.status === 'resting');
  }, [participants]);

  const activeMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'playing' || m.status === 'ready');
  }, [matches]);

  // Compute Next Group Proposal automatically based on active session matching mode
  const nextProposal = useMemo(() => {
    if (!session) return null;
    return getNextGroup(participants, session.matchingMode);
  }, [participants, session]);

  // Find Current Local Participant
  const currentParticipant = useMemo(() => {
    if (!currentParticipantId) return null;
    return participants.find((p) => p.participantId === currentParticipantId) || null;
  }, [participants, currentParticipantId]);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        session,
        courts,
        participants,
        waitingQueue,
        playingParticipants,
        restingParticipants,
        matches,
        activeMatches,
        nextProposal,
        currentParticipant,
        isOnline,
        loading,
        error,
        setSessionId,
        setCurrentParticipantId,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
