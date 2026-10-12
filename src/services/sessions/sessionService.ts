import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import {
  Session,
  Participant,
  Court,
  Match,
  MatchingMode,
  SkillLevel,
  GroupMatchProposal,
  MatchScore,
} from '../../types';

// Helper to generate 6-character alphanumeric join code
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid 0/O, 1/I confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface CreateSessionParams {
  name: string;
  venueName: string;
  numberOfCourts: number;
  matchingMode: MatchingMode;
  maxPlayers?: number;
  organizerId: string;
  organizerEmail?: string;
  announcementSettings?: {
    enabled: boolean;
    volume: number;
    rate: number;
    pitch: number;
  };
}

export function cacheSessionLocally(session: Session, courts: Court[]) {
  try {
    localStorage.setItem(`picklequeue_session_${session.id}`, JSON.stringify(session));
    localStorage.setItem(`picklequeue_courts_${session.id}`, JSON.stringify(courts));
    const recent: string[] = JSON.parse(localStorage.getItem('picklequeue_recent_sessions') || '[]');
    if (!recent.includes(session.id)) {
      recent.unshift(session.id);
      localStorage.setItem('picklequeue_recent_sessions', JSON.stringify(recent.slice(0, 15)));
    }
  } catch (e) {
    console.warn('Could not cache session locally:', e);
  }
}

export function getCachedSession(sessionId: string): { session: Session; courts: Court[] } | null {
  try {
    const rawSession = localStorage.getItem(`picklequeue_session_${sessionId}`);
    const rawCourts = localStorage.getItem(`picklequeue_courts_${sessionId}`);
    if (rawSession) {
      return {
        session: JSON.parse(rawSession),
        courts: rawCourts ? JSON.parse(rawCourts) : [],
      };
    }
  } catch (e) {
    console.warn('Could not read cached session:', e);
  }
  return null;
}

export function getRecentLocalSessions(): Session[] {
  try {
    const recent: string[] = JSON.parse(localStorage.getItem('picklequeue_recent_sessions') || '[]');
    const result: Session[] = [];
    for (const sId of recent) {
      const cached = getCachedSession(sId);
      if (cached && cached.session && cached.session.status !== 'completed') {
        result.push(cached.session);
      }
    }
    return result;
  } catch {
    return [];
  }
}

export async function createSession(params: CreateSessionParams): Promise<string> {
  const sessionRef = doc(collection(db, 'sessions'));
  const sessionId = sessionRef.id;
  const joinCode = generateJoinCode();
  const nowIso = new Date().toISOString();

  const sessionData: Omit<Session, 'id'> = {
    venueId: 'v-default',
    venueName: params.venueName.trim() || 'Community Pickleball Center',
    name: params.name.trim() || 'Friday Night Open Play',
    sport: 'pickleball',
    status: 'active',
    matchingMode: params.matchingMode || 'balanced',
    numberOfCourts: params.numberOfCourts || 3,
    maxPlayers: params.maxPlayers || 60,
    joinCode,
    organizerId: params.organizerId,
    organizerEmail: params.organizerEmail || '',
    announcementSettings: params.announcementSettings || {
      enabled: true,
      volume: 1,
      rate: 1,
      pitch: 1,
    },
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const initialCourts: Court[] = [];
  const count = params.numberOfCourts || 3;
  for (let i = 1; i <= count; i++) {
    const courtId = `court-${i}`;
    initialCourts.push({
      courtId,
      name: `Court ${i}`,
      status: 'available',
      currentMatchId: null,
      available: true,
      order: i,
    });
  }

  // Pre-seed local storage immediately with valid date strings so that opening the terminal is instant
  const sessionRecord = {
    id: sessionId,
    ...sessionData,
    startedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  } as Session;
  cacheSessionLocally(sessionRecord, initialCourts);

  try {
    const batch = writeBatch(db);
    batch.set(sessionRef, sessionData);

    // Seed deterministic default courts (Court 1, Court 2, etc.)
    for (let i = 1; i <= count; i++) {
      const courtId = `court-${i}`;
      const courtRef = doc(db, `sessions/${sessionId}/courts`, courtId);
      const courtData: Court = {
        courtId,
        name: `Court ${i}`,
        status: 'available',
        currentMatchId: null,
        available: true,
        order: i,
        updatedAt: serverTimestamp(),
      };
      batch.set(courtRef, courtData);
    }

    // Commit to Firestore with a safe timeout race so terminal launch is instantaneous even on slow networks
    try {
      await Promise.race([
        batch.commit(),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    } catch (commitErr) {
      console.warn('Firestore batch commit deferred or failed:', commitErr);
    }

    // Fire-and-forget audit event so it never blocks session launch
    const auditRef = doc(collection(db, `sessions/${sessionId}/audit_logs`));
    setDoc(auditRef, {
      id: auditRef.id,
      sessionId,
      action: 'SESSION_STARTED',
      actorId: params.organizerId,
      actorName: params.organizerEmail || 'Organizer',
      timestamp: serverTimestamp(),
      metadata: { numberOfCourts: params.numberOfCourts, matchingMode: params.matchingMode },
    }).catch((err) => console.warn('Audit log write error:', err));

    return sessionId;
  } catch (error) {
    console.warn('Firestore session create warning (proceeding with local session):', error);
    return sessionId;
  }
}

export async function getSessionByJoinCode(code: string): Promise<Session | null> {
  const cleanCode = code.trim().toUpperCase();
  const q = query(
    collection(db, 'sessions'),
    where('joinCode', '==', cleanCode),
    where('status', 'in', ['active', 'paused', 'draft'])
  );

  try {
    const snap = await getDocs(q);
    if (snap.empty) {
      // Check local cache for recent matching code
      const recent = JSON.parse(localStorage.getItem('picklequeue_recent_sessions') || '[]');
      for (const id of recent) {
        const cached = getCachedSession(id);
        if (cached && cached.session.joinCode === cleanCode) {
          return cached.session;
        }
      }
      return null;
    }
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Session;
  } catch (error) {
    console.warn('Error querying by join code, checking local cache:', error);
    try {
      const recent = JSON.parse(localStorage.getItem('picklequeue_recent_sessions') || '[]');
      for (const id of recent) {
        const cached = getCachedSession(id);
        if (cached && cached.session.joinCode === cleanCode) {
          return cached.session;
        }
      }
    } catch {}
    return null;
  }
}

export async function joinSessionAsParticipant(
  sessionId: string,
  params: {
    participantId?: string;
    name: string;
    firstName?: string;
    surname?: string;
    avatarUrl?: string;
    skillLevel: SkillLevel;
  }
): Promise<Participant> {
  const participantsRef = collection(db, `sessions/${sessionId}/participants`);

  try {
    // 1. Double-entry prevention: check if player already exists in active queue
    const snapshot = await getDocs(participantsRef);
    const trimmedName = params.name.trim().toLowerCase();

    const existingMatch = snapshot.docs
      .map((d) => ({ participantId: d.id, ...d.data() } as Participant))
      .find(
        (p) =>
          p.status !== 'left' &&
          (p.name?.trim().toLowerCase() === trimmedName ||
            (params.firstName &&
              params.surname &&
              p.firstName?.trim().toLowerCase() === params.firstName.trim().toLowerCase() &&
              p.surname?.trim().toLowerCase() === params.surname.trim().toLowerCase()))
      );

    // If already in queue, return existing participant to prevent duplicate entry
    if (existingMatch) {
      return existingMatch;
    }

    const participantDoc = params.participantId
      ? doc(db, `sessions/${sessionId}/participants`, params.participantId)
      : doc(participantsRef);
    const pId = participantDoc.id;

    // Determine current max queue position
    let maxPos = 0;
    snapshot.forEach((d) => {
      const pos = d.data().queuePosition || 0;
      if (pos > maxPos) maxPos = pos;
    });

    const newParticipant: Participant = {
      participantId: pId,
      sessionId,
      name: params.name.trim(),
      firstName: params.firstName?.trim() || '',
      surname: params.surname?.trim() || '',
      avatarUrl: params.avatarUrl || '',
      skillLevel: params.skillLevel,
      status: 'waiting',
      queuePosition: maxPos + 1,
      queueEnteredAt: serverTimestamp(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      resting: false,
      checkedIn: true,
      joinedAt: serverTimestamp(),
      previousPartnerIds: [],
      previousOpponentIds: [],
    };

    await setDoc(participantDoc, newParticipant);
    return newParticipant;
  } catch (error) {
    const fallbackId = params.participantId || `p-${Date.now()}`;
    handleFirestoreError(error, OperationType.CREATE, `sessions/${sessionId}/participants/${fallbackId}`);
  }
}

export async function updateParticipantRestStatus(
  sessionId: string,
  participantId: string,
  resting: boolean
): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}/participants`, participantId);
  try {
    await updateDoc(ref, {
      resting,
      status: resting ? 'resting' : 'waiting',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}/participants/${participantId}`);
  }
}

export async function leaveSession(sessionId: string, participantId: string): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}/participants`, participantId);
  try {
    await updateDoc(ref, {
      status: 'left',
      resting: false,
      leftAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}/participants/${participantId}`);
  }
}

export async function startMatchOnCourt(
  sessionId: string,
  courtId: string,
  courtName: string,
  proposal: GroupMatchProposal,
  matchingMode: MatchingMode | 'manual' = 'balanced'
): Promise<string> {
  const courtRef = doc(db, `sessions/${sessionId}/courts`, courtId);
  const matchRef = doc(collection(db, `sessions/${sessionId}/matches`));
  const matchId = matchRef.id;

  try {
    await runTransaction(db, async (txn) => {
      const courtSnap = await txn.get(courtRef);
      if (!courtSnap.exists()) {
        throw new Error('Court not found.');
      }
      const courtData = courtSnap.data();
      if (courtData.status === 'playing') {
        throw new Error(`${courtName} already has an active match in progress.`);
      }

      // Read all participants to verify they are not already playing
      const pSnaps = await Promise.all(
        proposal.players.map((p) => txn.get(doc(db, `sessions/${sessionId}/participants`, p.participantId)))
      );

      for (const pSnap of pSnaps) {
        if (!pSnap.exists()) throw new Error('One or more players no longer exist in session.');
        const pData = pSnap.data();
        if (pData.status === 'playing') {
          throw new Error(`Player ${pData.name} is already playing on another court.`);
        }
      }

      // 1. Create Match Doc
      const newMatch: Match = {
        matchId,
        sessionId,
        courtId,
        courtName,
        playerIds: proposal.players.map((p) => p.participantId),
        playerDetails: proposal.players.map((p) => ({
          participantId: p.participantId,
          name: p.name,
          skillLevel: p.skillLevel,
        })),
        teamA: proposal.teamA.map((p) => p.participantId),
        teamB: proposal.teamB.map((p) => p.participantId),
        teamANames: proposal.teamA.map((p) => p.name),
        teamBNames: proposal.teamB.map((p) => p.name),
        status: 'playing',
        matchingMode,
        startedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      txn.set(matchRef, newMatch);

      // 2. Update Court
      txn.update(courtRef, {
        status: 'playing',
        currentMatchId: matchId,
        updatedAt: serverTimestamp(),
      });

      // 3. Update all 4 participants to 'playing'
      proposal.players.forEach((p) => {
        const pRef = doc(db, `sessions/${sessionId}/participants`, p.participantId);
        txn.update(pRef, {
          status: 'playing',
          currentCourtId: courtId,
          currentMatchId: matchId,
        });
      });
    });

    return matchId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `sessions/${sessionId}/matches/${matchId}`);
  }
}

export async function completeMatch(
  sessionId: string,
  matchId: string,
  courtId: string,
  winningTeam: 'teamA' | 'teamB',
  score?: MatchScore
): Promise<void> {
  const matchRef = doc(db, `sessions/${sessionId}/matches`, matchId);
  const courtRef = doc(db, `sessions/${sessionId}/courts`, courtId);

  try {
    // 1. Fetch match and court documents
    const [matchSnap, courtSnap] = await Promise.all([
      getDoc(matchRef),
      getDoc(courtRef),
    ]);

    const matchData = matchSnap.exists() ? (matchSnap.data() as Match) : null;

    // Gather all participant IDs associated with this match safely
    const teamA = matchData?.teamA || [];
    const teamB = matchData?.teamB || [];
    const playerIds = Array.from(
      new Set([...(matchData?.playerIds || []), ...teamA, ...teamB])
    ).filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim().length > 0));

    // Determine current max queue position
    let maxPos = 0;
    try {
      const participantsSnap = await getDocs(collection(db, `sessions/${sessionId}/participants`));
      participantsSnap.forEach((d) => {
        const pos = d.data().queuePosition || 0;
        if (pos > maxPos) maxPos = pos;
      });
    } catch (e) {
      console.warn('Could not get max queue position:', e);
    }

    // Calculate duration
    let durationSeconds = 600; // default fallback 10m
    if (matchData?.startedAt) {
      const startMs = typeof matchData.startedAt?.toMillis === 'function'
        ? matchData.startedAt.toMillis()
        : (matchData.startedAt?.seconds ? matchData.startedAt.seconds * 1000 : new Date(matchData.startedAt).getTime());
      if (!isNaN(startMs) && startMs > 0) {
        durationSeconds = Math.max(60, Math.floor((Date.now() - startMs) / 1000));
      }
    }

    // Fetch participant docs
    const pDocs = await Promise.all(
      playerIds.map((pId) => getDoc(doc(db, `sessions/${sessionId}/participants`, pId)))
    );

    const winnerIds = (winningTeam === 'teamA' ? teamA : teamB) || [];

    // Use writeBatch for atomic and offline-compatible persistence
    const batch = writeBatch(db);

    // 1. Update match
    if (matchSnap.exists()) {
      batch.update(matchRef, {
        status: 'completed',
        endedAt: serverTimestamp(),
        durationSeconds,
        winningTeam,
        score: score || null,
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Free court
    if (courtSnap.exists()) {
      batch.update(courtRef, {
        status: 'available',
        currentMatchId: null,
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Update participants and return them to the queue (4 IN / 4 OUT rule)
    let offset = 1;
    for (const pSnap of pDocs) {
      if (!pSnap.exists()) continue;

      const pData = pSnap.data() as Participant;
      const pId = pData.participantId || pSnap.id;
      const isWinner = winnerIds.includes(pId);
      const gamesPlayed = (pData.gamesPlayed || 0) + 1;
      const wins = (pData.wins || 0) + (isWinner ? 1 : 0);
      const losses = (pData.losses || 0) + (isWinner ? 0 : 1);
      const winRate = Math.round((wins / gamesPlayed) * 100);

      // Point tracking
      const isTeamA = teamA.includes(pId);
      const teamScore = score ? (isTeamA ? score.teamA : score.teamB) : (isWinner ? 11 : 9);
      const oppScore = score ? (isTeamA ? score.teamB : score.teamA) : (isWinner ? 9 : 11);
      const pointsScored = (pData.pointsScored || 0) + teamScore;
      const pointsConceded = (pData.pointsConceded || 0) + oppScore;
      const pointDifferential = (pData.pointDifferential || 0) + (teamScore - oppScore);

      // Streak tracking
      const currentStreak = pData.streak || 0;
      const streak = isWinner ? (currentStreak >= 0 ? currentStreak + 1 : 1) : 0;

      // Calculate co-play sets for Social Mix tracking
      const currentPartners = teamA.includes(pId)
        ? teamA.filter((id) => id !== pId)
        : teamB.filter((id) => id !== pId);
      const currentOpponents = teamA.includes(pId) ? teamB : teamA;

      const previousPartners = Array.from(new Set([...(pData.previousPartnerIds || []), ...currentPartners]));
      const previousOpponents = Array.from(new Set([...(pData.previousOpponentIds || []), ...currentOpponents]));

      const pRef = doc(db, `sessions/${sessionId}/participants`, pId);
      batch.update(pRef, {
        status: 'waiting',
        currentCourtId: null,
        currentMatchId: null,
        gamesPlayed,
        wins,
        losses,
        winRate,
        pointsScored,
        pointsConceded,
        pointDifferential,
        streak,
        lastMatchResult: isWinner ? 'win' : 'loss',
        lastPlayedAt: serverTimestamp(),
        queuePosition: maxPos + offset,
        queueEnteredAt: serverTimestamp(),
        previousPartnerIds: previousPartners.slice(-20),
        previousOpponentIds: previousOpponents.slice(-30),
      });

      offset++;
    }

    await batch.commit();
  } catch (error) {
    console.warn('completeMatch error, executing emergency direct court and match release:', error);
    try {
      if (matchId) {
        await updateDoc(matchRef, {
          status: 'completed',
          winningTeam,
          score: score || null,
          endedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
      if (courtId) {
        await updateDoc(courtRef, {
          status: 'available',
          currentMatchId: null,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (fallbackErr) {
      console.warn('Direct recovery error:', fallbackErr);
      handleFirestoreError(error, OperationType.WRITE, `sessions/${sessionId}/matches/${matchId}`);
    }
  }
}

export async function forceResetCourt(sessionId: string, courtId: string): Promise<void> {
  const courtRef = doc(db, `sessions/${sessionId}/courts`, courtId);
  try {
    await updateDoc(courtRef, {
      status: 'available',
      currentMatchId: null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}/courts/${courtId}`);
  }
}

export async function addCourtToSession(sessionId: string, name: string): Promise<string> {
  const courtsRef = collection(db, `sessions/${sessionId}/courts`);
  const courtDoc = doc(courtsRef);

  try {
    const snap = await getDocs(courtsRef);
    const order = snap.size + 1;

    const newCourt: Court = {
      courtId: courtDoc.id,
      name: name.trim() || `Court ${order}`,
      status: 'available',
      currentMatchId: null,
      available: true,
      order,
      updatedAt: serverTimestamp(),
    };

    await setDoc(courtDoc, newCourt);
    return courtDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `sessions/${sessionId}/courts/${courtDoc.id}`);
  }
}

export async function updateCourtState(
  sessionId: string,
  courtId: string,
  updates: Partial<Court>
): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}/courts`, courtId);
  try {
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}/courts/${courtId}`);
  }
}

export async function removeCourtFromSession(sessionId: string, courtId: string): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}/courts`, courtId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `sessions/${sessionId}/courts/${courtId}`);
  }
}

export async function updateSessionMode(sessionId: string, matchingMode: MatchingMode): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}`);
  try {
    await updateDoc(ref, {
      matchingMode,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
  }
}

export async function endSession(sessionId: string): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}`);
  try {
    await updateDoc(ref, {
      status: 'completed',
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
  }
}

export async function bulkImportParticipants(
  sessionId: string,
  rawLines: string[],
  defaultSkill: SkillLevel = 'intermediate'
): Promise<number> {
  const participantsRef = collection(db, `sessions/${sessionId}/participants`);

  let maxPos = 0;
  try {
    const currentSnap = await getDocs(participantsRef);
    currentSnap.forEach((d) => {
      const pos = d.data().queuePosition || 0;
      if (pos > maxPos) maxPos = pos;
    });
  } catch (err) {
    console.warn('Could not read existing max queue position, defaulting to 0:', err);
  }

  // Parse and sanitize raw lines (split multi-item strings by newlines, commas, semicolons)
  const expandedLines: string[] = [];
  for (const raw of rawLines) {
    if (!raw || typeof raw !== 'string') continue;
    // If line contains multiple items separated by commas or semicolons (and not just an annotation like "Davis, intermediate")
    if (raw.includes('\n')) {
      expandedLines.push(...raw.split('\n'));
    } else if (raw.includes(';') || (raw.includes(',') && !raw.match(/,\s*(beginner|intermediate|advanced|beg|int|adv)\b/i))) {
      expandedLines.push(...raw.split(/[,;]+/));
    } else {
      expandedLines.push(raw);
    }
  }

  const parsedPlayers: Array<{
    fullName: string;
    firstName: string;
    surname: string;
    skill: SkillLevel;
  }> = [];

  for (const raw of expandedLines) {
    if (!raw || typeof raw !== 'string') continue;
    // Strip leading numbering or bullet points like "1. ", "2) ", "- ", "• "
    let clean = raw.trim().replace(/^[\d]+[\.\)\-\s]+/, '').replace(/^[\-\*•\+]\s+/, '').trim();
    if (!clean) continue;

    // Detect inline skill annotation if present: e.g. "Alex (Advanced)", "Ben - Beginner", "Carla, intermediate"
    let playerSkill = defaultSkill;
    const lower = clean.toLowerCase();
    if (lower.includes('advanced') || lower.includes('(adv)')) {
      playerSkill = 'advanced';
      clean = clean.replace(/\(?\[?\b(advanced|adv)\b\)?\]?/i, '').replace(/[\-–,]\s*$/, '').trim();
    } else if (lower.includes('beginner') || lower.includes('(beg)')) {
      playerSkill = 'beginner';
      clean = clean.replace(/\(?\[?\b(beginner|beg)\b\)?\]?/i, '').replace(/[\-–,]\s*$/, '').trim();
    } else if (lower.includes('intermediate') || lower.includes('(int)')) {
      playerSkill = 'intermediate';
      clean = clean.replace(/\(?\[?\b(intermediate|int)\b\)?\]?/i, '').replace(/[\-–,]\s*$/, '').trim();
    }

    clean = clean.replace(/[,\(\)\[\]\-]+$/, '').trim();
    if (!clean) continue;

    // Split first and surname
    const parts = clean.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || 'Player';
    const surname = parts.slice(1).join(' ');
    const fullName = surname ? `${firstName} ${surname}` : firstName;

    parsedPlayers.push({
      fullName,
      firstName,
      surname,
      skill: playerSkill,
    });
  }

  if (parsedPlayers.length === 0) return 0;

  // Chunk batches by 400 to prevent exceeding Firestore 500 operations batch limit
  const CHUNK_SIZE = 400;
  let totalCommitted = 0;

  try {
    for (let i = 0; i < parsedPlayers.length; i += CHUNK_SIZE) {
      const chunk = parsedPlayers.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((p, idx) => {
        const pDoc = doc(participantsRef);
        const queuePos = maxPos + totalCommitted + idx + 1;
        const participantData: Participant = {
          participantId: pDoc.id,
          sessionId,
          name: p.fullName,
          firstName: p.firstName,
          surname: p.surname,
          skillLevel: p.skill,
          status: 'waiting',
          queuePosition: queuePos,
          queueEnteredAt: serverTimestamp(),
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          pointsScored: 0,
          pointsConceded: 0,
          pointDifferential: 0,
          streak: 0,
          resting: false,
          checkedIn: true,
          joinedAt: serverTimestamp(),
          previousPartnerIds: [],
          previousOpponentIds: [],
        };
        batch.set(pDoc, participantData);
      });

      await batch.commit();
      totalCommitted += chunk.length;
    }

    return totalCommitted;
  } catch (error) {
    console.warn('Bulk import batch write warning:', error);
    if (totalCommitted > 0) return totalCommitted;
    handleFirestoreError(error, OperationType.WRITE, `sessions/${sessionId}/participants`);
  }
}

export async function updateParticipantAvatar(
  sessionId: string,
  participantId: string,
  avatarUrl: string
): Promise<void> {
  const pRef = doc(db, `sessions/${sessionId}/participants`, participantId);
  try {
    await updateDoc(pRef, {
      avatarUrl,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}/participants/${participantId}`);
  }
}

export async function updateParticipantProfile(
  sessionId: string,
  participantId: string,
  updates: {
    name?: string;
    firstName?: string;
    surname?: string;
    avatarUrl?: string;
    skillLevel?: SkillLevel;
  }
): Promise<void> {
  const pRef = doc(db, `sessions/${sessionId}/participants`, participantId);
  try {
    await updateDoc(pRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}/participants/${participantId}`);
  }
}

