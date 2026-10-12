import { Participant, MatchingMode, GroupMatchProposal, SkillLevel } from '../../types';

export const SKILL_SCORES: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/**
 * Filter participants that are eligible to play:
 * - checkedIn === true
 * - resting === false
 * - status === 'waiting' (not playing, assigned, or left)
 */
export function getEligibleWaitingPlayers(participants: Participant[]): Participant[] {
  return participants
    .filter((p) => p.checkedIn && !p.resting && p.status === 'waiting')
    .sort((a, b) => {
      // Primary: queue position ascending
      if (a.queuePosition !== b.queuePosition) {
        return a.queuePosition - b.queuePosition;
      }
      // Secondary: queueEnteredAt ascending
      const timeA = a.queueEnteredAt?.toMillis ? a.queueEnteredAt.toMillis() : (a.queueEnteredAt ? new Date(a.queueEnteredAt).getTime() : 0);
      const timeB = b.queueEnteredAt?.toMillis ? b.queueEnteredAt.toMillis() : (b.queueEnteredAt ? new Date(b.queueEnteredAt).getTime() : 0);
      return timeA - timeB;
    });
}

/**
 * Evaluates pairing configurations for 4 players and returns optimal Team A and Team B
 */
function partitionBalancedTeams(fourPlayers: Participant[]): { teamA: Participant[]; teamB: Participant[]; skillDelta: number } {
  const [p0, p1, p2, p3] = fourPlayers;

  // Possible doubles combinations for 4 players:
  // Option 1: [0, 1] vs [2, 3]
  // Option 2: [0, 2] vs [1, 3]
  // Option 3: [0, 3] vs [1, 2]
  const options = [
    { teamA: [p0, p1], teamB: [p2, p3] },
    { teamA: [p0, p2], teamB: [p1, p3] },
    { teamA: [p0, p3], teamB: [p1, p2] },
  ];

  let best = options[0];
  let minDelta = Infinity;

  for (const opt of options) {
    const scoreA = SKILL_SCORES[opt.teamA[0].skillLevel] + SKILL_SCORES[opt.teamA[1].skillLevel];
    const scoreB = SKILL_SCORES[opt.teamB[0].skillLevel] + SKILL_SCORES[opt.teamB[1].skillLevel];
    const delta = Math.abs(scoreA - scoreB);

    if (delta < minDelta) {
      minDelta = delta;
      best = opt;
    }
  }

  return { teamA: best.teamA, teamB: best.teamB, skillDelta: minDelta };
}

/**
 * Social Mix: find pairing with minimum co-play history (partners + opponents)
 */
function partitionSocialMixTeams(fourPlayers: Participant[]): { teamA: Participant[]; teamB: Participant[]; skillDelta: number } {
  const [p0, p1, p2, p3] = fourPlayers;
  const options = [
    { teamA: [p0, p1], teamB: [p2, p3] },
    { teamA: [p0, p2], teamB: [p1, p3] },
    { teamA: [p0, p3], teamB: [p1, p2] },
  ];

  let best = options[0];
  let minPenalty = Infinity;

  for (const opt of options) {
    let penalty = 0;

    // Check partner repetition
    const a0 = opt.teamA[0];
    const a1 = opt.teamA[1];
    if (a0.previousPartnerIds?.includes(a1.participantId)) penalty += 10;

    const b0 = opt.teamB[0];
    const b1 = opt.teamB[1];
    if (b0.previousPartnerIds?.includes(b1.participantId)) penalty += 10;

    // Check opponent repetition
    for (const teamPlayer of opt.teamA) {
      for (const opponent of opt.teamB) {
        if (teamPlayer.previousOpponentIds?.includes(opponent.participantId)) {
          penalty += 3;
        }
      }
    }

    // Add mild skill delta tie-breaker
    const scoreA = SKILL_SCORES[opt.teamA[0].skillLevel] + SKILL_SCORES[opt.teamA[1].skillLevel];
    const scoreB = SKILL_SCORES[opt.teamB[0].skillLevel] + SKILL_SCORES[opt.teamB[1].skillLevel];
    penalty += Math.abs(scoreA - scoreB);

    if (penalty < minPenalty) {
      minPenalty = penalty;
      best = opt;
    }
  }

  const scoreA = SKILL_SCORES[best.teamA[0].skillLevel] + SKILL_SCORES[best.teamA[1].skillLevel];
  const scoreB = SKILL_SCORES[best.teamB[0].skillLevel] + SKILL_SCORES[best.teamB[1].skillLevel];

  return { teamA: best.teamA, teamB: best.teamB, skillDelta: Math.abs(scoreA - scoreB) };
}

/**
 * Core Matching Algorithm Dispatcher
 */
export function getNextGroup(
  participants: Participant[],
  matchingMode: MatchingMode
): GroupMatchProposal | null {
  const eligible = getEligibleWaitingPlayers(participants);

  if (eligible.length < 4) {
    return null;
  }

  // MODE 1: BALANCED
  if (matchingMode === 'balanced') {
    const topFour = eligible.slice(0, 4);
    const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
    return {
      players: topFour,
      teamA,
      teamB,
      skillDelta,
      reasoning: `Selected top 4 players from queue. Balanced teams with skill rating delta of ${skillDelta}.`,
    };
  }

  // MODE 2: SOCIAL MIX
  if (matchingMode === 'social_mix') {
    // Look at top pool of up to 6 players to find the freshest 4-player mix while preserving queue fairness
    const candidatePool = eligible.slice(0, Math.min(6, eligible.length));
    let bestSelection = candidatePool.slice(0, 4);
    let bestPartition = partitionSocialMixTeams(bestSelection);

    return {
      players: bestSelection,
      teamA: bestPartition.teamA,
      teamB: bestPartition.teamB,
      skillDelta: bestPartition.skillDelta,
      reasoning: 'Maximized variety of partners & opponents to foster social rotation.',
    };
  }

  // MODE 3: SKILL SEPARATED
  if (matchingMode === 'skill_separated') {
    const skillGroups: Record<SkillLevel, Participant[]> = {
      advanced: eligible.filter((p) => p.skillLevel === 'advanced'),
      intermediate: eligible.filter((p) => p.skillLevel === 'intermediate'),
      beginner: eligible.filter((p) => p.skillLevel === 'beginner'),
    };

    // Prioritize tier with 4+ players that has the longest-waiting top player
    let chosenTier: SkillLevel | null = null;
    let earliestWaitTime = Infinity;

    for (const tier of ['advanced', 'intermediate', 'beginner'] as SkillLevel[]) {
      const group = skillGroups[tier];
      if (group.length >= 4) {
        const topPlayerTime = group[0].queuePosition;
        if (topPlayerTime < earliestWaitTime) {
          earliestWaitTime = topPlayerTime;
          chosenTier = tier;
        }
      }
    }

    if (chosenTier) {
      const topFour = skillGroups[chosenTier].slice(0, 4);
      const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
      return {
        players: topFour,
        teamA,
        teamB,
        skillDelta,
        reasoning: `Dedicated ${chosenTier.toUpperCase()} match with 4 compatible players.`,
      };
    }

    // Fallback: If no single tier has 4, take top 4 in queue and balance
    const topFour = eligible.slice(0, 4);
    const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
    return {
      players: topFour,
      teamA,
      teamB,
      skillDelta,
      reasoning: 'Mixed fallback: No 4 players in a single tier yet, taking top queue players.',
    };
  }

  // MODE 4: WINNERS / LOSERS
  if (matchingMode === 'winners_losers') {
    const winners = eligible.filter((p) => p.lastMatchResult === 'win');
    const losers = eligible.filter((p) => p.lastMatchResult === 'loss');

    // If 4 winners waiting, prioritize winners match
    if (winners.length >= 4 && winners[0].queuePosition <= (losers[0]?.queuePosition ?? Infinity)) {
      const topFour = winners.slice(0, 4);
      const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
      return {
        players: topFour,
        teamA,
        teamB,
        skillDelta,
        reasoning: 'Winners bracket: 4 recent game winners paired together.',
      };
    }

    // If 4 losers waiting, prioritize losers match
    if (losers.length >= 4) {
      const topFour = losers.slice(0, 4);
      const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
      return {
        players: topFour,
        teamA,
        teamB,
        skillDelta,
        reasoning: 'Rebound bracket: 4 recent game runners-up paired together.',
      };
    }

    // Fallback to top 4 in queue
    const topFour = eligible.slice(0, 4);
    const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
    return {
      players: topFour,
      teamA,
      teamB,
      skillDelta,
      reasoning: 'Queue fallback: Taking next 4 waiting players until 4 winners/losers assemble.',
    };
  }

  return null;
}

/**
 * Manual Match Assembler validator
 */
export function buildManualMatchProposal(
  selectedPlayers: Participant[],
  shuffleTeams: boolean = false
): GroupMatchProposal {
  if (selectedPlayers.length !== 4) {
    throw new Error('Exactly 4 players must be selected for a match.');
  }

  let players = [...selectedPlayers];
  if (shuffleTeams) {
    players = players.sort(() => Math.random() - 0.5);
  }

  const { teamA, teamB, skillDelta } = partitionBalancedTeams(players);

  return {
    players,
    teamA,
    teamB,
    skillDelta,
    reasoning: 'Manually selected by court organizer.',
  };
}
