export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type ParticipantStatus = 'waiting' | 'assigned' | 'playing' | 'resting' | 'left';

export type SessionStatus = 'draft' | 'active' | 'paused' | 'completed';

export type MatchingMode = 'balanced' | 'social_mix' | 'skill_separated' | 'winners_losers';

export type CourtStatus = 'available' | 'playing' | 'maintenance';

export type MatchStatus = 'waiting' | 'assigned' | 'ready' | 'playing' | 'completed' | 'cancelled';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'organizer' | 'player';
  createdAt: string;
  updatedAt?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  timezone: string;
  courtsCount: number;
  active: boolean;
  createdAt: string;
}

export interface AnnouncementSettings {
  enabled: boolean;
  volume: number; // 0 to 1
  rate: number;   // 0.5 to 2
  pitch: number;  // 0 to 2
  voiceURI?: string;
}

export interface Session {
  id: string;
  venueId: string;
  venueName: string;
  name: string;
  sport: 'pickleball';
  status: SessionStatus;
  matchingMode: MatchingMode;
  numberOfCourts: number;
  maxPlayers: number;
  joinCode: string;
  qrUrl?: string;
  organizerId: string;
  organizerEmail?: string;
  announcementSettings: AnnouncementSettings;
  startedAt?: any;
  endedAt?: any;
  createdAt: any;
  updatedAt?: any;
}

export interface Participant {
  participantId: string;
  sessionId: string;
  name: string;
  firstName?: string;
  surname?: string;
  avatarUrl?: string;
  skillLevel: SkillLevel;
  status: ParticipantStatus;
  queuePosition: number;
  queueEnteredAt: any;
  lastPlayedAt?: any;
  currentCourtId?: string | null;
  currentMatchId?: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  resting: boolean;
  checkedIn: boolean;
  joinedAt: any;
  leftAt?: any;
  // Tracking for Social Mix matching
  previousPartnerIds?: string[];
  previousOpponentIds?: string[];
  lastMatchResult?: 'win' | 'loss' | null;
  pointsScored?: number;
  pointsConceded?: number;
  pointDifferential?: number;
  streak?: number;
}

export interface Court {
  courtId: string;
  name: string;
  status: CourtStatus;
  currentMatchId: string | null;
  available: boolean;
  order: number;
  updatedAt?: any;
}

export interface MatchScore {
  teamA: number;
  teamB: number;
}

export interface MatchPlayerInfo {
  participantId: string;
  name: string;
  skillLevel: SkillLevel;
}

export interface Match {
  matchId: string;
  sessionId: string;
  courtId: string;
  courtName: string;
  playerIds: string[];
  playerDetails?: MatchPlayerInfo[];
  teamA: string[]; // 2 participantIds
  teamB: string[]; // 2 participantIds
  teamANames?: string[];
  teamBNames?: string[];
  status: MatchStatus;
  matchingMode: MatchingMode | 'manual';
  startedAt: any;
  endedAt?: any;
  durationSeconds?: number;
  winningTeam?: 'teamA' | 'teamB' | null;
  score?: MatchScore | null;
  createdAt: any;
  updatedAt?: any;
}

export interface AuditLog {
  id: string;
  sessionId: string;
  action: string;
  actorId: string;
  actorName: string;
  timestamp: any;
  metadata?: Record<string, any>;
}

export interface GroupMatchProposal {
  players: Participant[];
  teamA: Participant[];
  teamB: Participant[];
  reasoning: string;
  skillDelta: number;
}
