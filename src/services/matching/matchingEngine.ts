import { Participant, MatchingMode, GroupMatchProposal, SkillLevel } from '../../types';

export const SKILL_SCORES: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export function getPlayerSkillScore(player?: Participant | null): number {
  if (!player || !player.skillLevel) return 2;
  return SKILL_SCORES[player.skillLevel] ?? 2;
}

/**
 * Filter participants that are eligible to play:
 * - checkedIn === true
 * - resting === false
 * - status === 'waiting' (not playing, assigned, or left)
 * Sorted primarily by queue position ascending, secondarily by entry timestamp.
 */
export function getEligibleWaitingPlayers(participants: Participant[]): Participant[] {
  if (!Array.isArray(participants)) return [];

  return participants
    .filter((p) => Boolean(p && p.participantId && p.checkedIn && !p.resting && p.status === 'waiting'))
    .sort((a, b) => {
      // Primary: queue position ascending
      const posA = typeof a.queuePosition === 'number' ? a.queuePosition : 9999;
      const posB = typeof b.queuePosition === 'number' ? b.queuePosition : 9999;
      if (posA !== posB) {
        return posA - posB;
      }
      // Secondary: queueEnteredAt ascending
      const timeA = a.queueEnteredAt?.toMillis
        ? a.queueEnteredAt.toMillis()
        : (a.queueEnteredAt ? new Date(a.queueEnteredAt).getTime() : 0);
      const timeB = b.queueEnteredAt?.toMillis
        ? b.queueEnteredAt.toMillis()
        : (b.queueEnteredAt ? new Date(b.queueEnteredAt).getTime() : 0);
      const safeTimeA = isNaN(timeA) ? 0 : timeA;
      const safeTimeB = isNaN(timeB) ? 0 : timeB;
      return safeTimeA - safeTimeB;
    });
}

/**
 * Evaluates pairing configurations for 4 players and returns optimal Team A and Team B
 * Balances skill delta, but importantly tie-breaks to prevent repeat partner & opponent matchups!
 */
export interface PairingOption {
  name: string;
  teamA: [Participant, Participant];
  teamB: [Participant, Participant];
  skillDelta: number;
  scoreA: number;
  scoreB: number;
  penalty: number;
}

export function getAllDoublesPairingOptions(fourPlayers: Participant[]): PairingOption[] {
  if (!Array.isArray(fourPlayers) || fourPlayers.length < 4) return [];
  const [p0, p1, p2, p3] = fourPlayers;
  if (!p0 || !p1 || !p2 || !p3) return [];

  const rawCombos: Array<{
    teamA: [Participant, Participant];
    teamB: [Participant, Participant];
  }> = [
    { teamA: [p0, p1], teamB: [p2, p3] },
    { teamA: [p0, p2], teamB: [p1, p3] },
    { teamA: [p0, p3], teamB: [p1, p2] },
  ];

  const evaluated: PairingOption[] = rawCombos.map((combo) => {
    const scoreA = getPlayerSkillScore(combo.teamA[0]) + getPlayerSkillScore(combo.teamA[1]);
    const scoreB = getPlayerSkillScore(combo.teamB[0]) + getPlayerSkillScore(combo.teamB[1]);
    const delta = Math.abs(scoreA - scoreB);

    let partnerPenalty = 0;
    const a0 = combo.teamA[0];
    const a1 = combo.teamA[1];
    const b0 = combo.teamB[0];
    const b1 = combo.teamB[1];

    if (a0?.participantId && a1?.participantId && a0.previousPartnerIds?.includes(a1.participantId)) {
      partnerPenalty += 30;
    }
    if (b0?.participantId && b1?.participantId && b0.previousPartnerIds?.includes(b1.participantId)) {
      partnerPenalty += 30;
    }

    let opponentPenalty = 0;
    for (const pa of combo.teamA) {
      for (const pb of combo.teamB) {
        if (pa?.participantId && pb?.participantId && pa.previousOpponentIds?.includes(pb.participantId)) {
          opponentPenalty += 4;
        }
      }
    }

    const totalPenalty = (delta * 25) + partnerPenalty + opponentPenalty;

    return {
      name: '',
      teamA: combo.teamA,
      teamB: combo.teamB,
      skillDelta: delta,
      scoreA,
      scoreB,
      penalty: totalPenalty,
    };
  });

  // Sort: lowest total penalty first (best balanced + least repetition)
  evaluated.sort((a, b) => a.penalty - b.penalty);

  evaluated[0].name = `Option 1 (Recommended / Balanced - Δ${evaluated[0].skillDelta})`;
  evaluated[1].name = `Option 2 (Alternative A - Δ${evaluated[1].skillDelta})`;
  evaluated[2].name = `Option 3 (Alternative B - Δ${evaluated[2].skillDelta})`;

  return evaluated;
}

export function partitionBalancedTeams(fourPlayers: Participant[]): {
  teamA: Participant[];
  teamB: Participant[];
  skillDelta: number;
} {
  const options = getAllDoublesPairingOptions(fourPlayers);
  if (options.length > 0) {
    const best = options[0];
    return {
      teamA: best.teamA,
      teamB: best.teamB,
      skillDelta: best.skillDelta,
    };
  }

  const valid = (fourPlayers || []).filter(Boolean);
  return {
    teamA: valid.slice(0, 2),
    teamB: valid.slice(2, 4),
    skillDelta: 0,
  };
}

/**
 * Social Mix: find pairing with minimum co-play history (partners + opponents)
 * Considers partner repetition, opponent repetition, and queue order.
 */
export function partitionSocialMixTeams(fourPlayers: Participant[]): {
  teamA: Participant[];
  teamB: Participant[];
  skillDelta: number;
  penalty: number;
} {
  const [p0, p1, p2, p3] = fourPlayers;
  if (!p0 || !p1 || !p2 || !p3) {
    const valid = fourPlayers.filter(Boolean);
    return {
      teamA: valid.slice(0, 2),
      teamB: valid.slice(2, 4),
      skillDelta: 0,
      penalty: 0,
    };
  }

  const options = [
    { teamA: [p0, p1], teamB: [p2, p3] },
    { teamA: [p0, p2], teamB: [p1, p3] },
    { teamA: [p0, p3], teamB: [p1, p2] },
  ];

  let best = options[0];
  let minPenalty = Infinity;
  let bestDelta = 0;

  for (const opt of options) {
    let penalty = 0;

    // Partner repetition (heavy penalty)
    const a0 = opt.teamA[0];
    const a1 = opt.teamA[1];
    const b0 = opt.teamB[0];
    const b1 = opt.teamB[1];

    if (a0?.participantId && a1?.participantId && a0.previousPartnerIds?.includes(a1.participantId)) penalty += 35;
    if (b0?.participantId && b1?.participantId && b0.previousPartnerIds?.includes(b1.participantId)) penalty += 35;

    // Opponent repetition
    for (const teamPlayer of opt.teamA) {
      for (const opponent of opt.teamB) {
        if (teamPlayer?.participantId && opponent?.participantId && teamPlayer.previousOpponentIds?.includes(opponent.participantId)) {
          penalty += 6;
        }
      }
    }

    // Mild skill delta factor
    const scoreA = getPlayerSkillScore(a0) + getPlayerSkillScore(a1);
    const scoreB = getPlayerSkillScore(b0) + getPlayerSkillScore(b1);
    const delta = Math.abs(scoreA - scoreB);
    penalty += delta * 4;

    if (penalty < minPenalty) {
      minPenalty = penalty;
      best = opt;
      bestDelta = delta;
    }
  }

  return {
    teamA: best.teamA,
    teamB: best.teamB,
    skillDelta: bestDelta,
    penalty: minPenalty,
  };
}

/**
 * Core Matching Algorithm Dispatcher
 * Returns an optimal group match proposal based on the active matching mode.
 */
export function getNextGroup(
  participants: Participant[],
  matchingMode: MatchingMode
): GroupMatchProposal | null {
  try {
    const eligible = getEligibleWaitingPlayers(participants);

    if (eligible.length < 4) {
      return null;
    }

    // Safe helper to build safe proposal
    const buildProposal = (
      four: Participant[],
      teamA: Participant[],
      teamB: Participant[],
      skillDelta: number,
      reasoning: string
    ): GroupMatchProposal => {
      return {
        players: four,
        teamA,
        teamB,
        skillDelta: isNaN(skillDelta) ? 0 : skillDelta,
        reasoning,
      };
    };

  // MODE 1: BALANCED (Fair skill delta + partner rotation)
  if (matchingMode === 'balanced') {
    const topFour = eligible.slice(0, 4);
    const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
    return buildProposal(
      topFour,
      teamA,
      teamB,
      skillDelta,
      `Next 4 in queue. Balanced partners (skill Δ: ${skillDelta}).`
    );
  }

  // MODE 2: SOCIAL MIX (Search top pool of up to 6 players for freshest combination)
  if (matchingMode === 'social_mix') {
    const poolSize = Math.min(6, eligible.length);
    const candidatePool = eligible.slice(0, poolSize);

    if (poolSize === 4) {
      const topFour = candidatePool;
      const { teamA, teamB, skillDelta } = partitionSocialMixTeams(topFour);
      return buildProposal(
        topFour,
        teamA,
        teamB,
        skillDelta,
        'Social Mix: maximized variety of partners & opponents.'
      );
    }

    // If 5 or 6 players are waiting, evaluate all 4-player combinations from the pool
    // 5 choose 4 = 5 combinations. 6 choose 4 = 15 combinations.
    const combinations: Participant[][] = [];
    for (let i = 0; i < poolSize; i++) {
      for (let j = i + 1; j < poolSize; j++) {
        for (let k = j + 1; k < poolSize; k++) {
          for (let l = k + 1; l < poolSize; l++) {
            combinations.push([candidatePool[i], candidatePool[j], candidatePool[k], candidatePool[l]]);
          }
        }
      }
    }

    let bestFour = candidatePool.slice(0, 4);
    let bestTeams = partitionSocialMixTeams(bestFour);
    let lowestTotalPenalty = Infinity;

    for (const combo of combinations) {
      const result = partitionSocialMixTeams(combo);
      // Add slight penalty for skipping queue spots to preserve fairness
      const queuePositionPenalty = combo.reduce((sum, p, idx) => {
        const poolIndex = candidatePool.findIndex((cp) => cp?.participantId === p?.participantId);
        return sum + Math.max(0, poolIndex - idx) * 3;
      }, 0);

      const totalPenalty = result.penalty + queuePositionPenalty;
      if (totalPenalty < lowestTotalPenalty) {
        lowestTotalPenalty = totalPenalty;
        bestFour = combo;
        bestTeams = result;
      }
    }

    return buildProposal(
      bestFour,
      bestTeams.teamA,
      bestTeams.teamB,
      bestTeams.skillDelta,
      'Social Mix: evaluated freshest rotation from top queue pool.'
    );
  }

  // MODE 3: SKILL SEPARATED (Tiered grouping)
  if (matchingMode === 'skill_separated') {
    const skillGroups: Record<SkillLevel, Participant[]> = {
      advanced: eligible.filter((p) => p.skillLevel === 'advanced'),
      intermediate: eligible.filter((p) => p.skillLevel === 'intermediate'),
      beginner: eligible.filter((p) => p.skillLevel === 'beginner'),
    };

    let chosenTier: SkillLevel | null = null;
    let earliestWaitPos = Infinity;

    for (const tier of ['advanced', 'intermediate', 'beginner'] as SkillLevel[]) {
      const group = skillGroups[tier];
      if (group && group.length >= 4) {
        const topPos = typeof group[0]?.queuePosition === 'number' ? group[0].queuePosition : 9999;
        if (topPos < earliestWaitPos) {
          earliestWaitPos = topPos;
          chosenTier = tier;
        }
      }
    }

    if (chosenTier) {
      const topFour = skillGroups[chosenTier].slice(0, 4);
      const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
      return buildProposal(
        topFour,
        teamA,
        teamB,
        skillDelta,
        `Tiered ${chosenTier.toUpperCase()} match with 4 compatible players.`
      );
    }

    // Fallback: If no single tier has 4, take top 4 in queue and balance
    const topFour = eligible.slice(0, 4);
    const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
    return buildProposal(
      topFour,
      teamA,
      teamB,
      skillDelta,
      'Mixed fallback: taking next 4 in queue while single tiers fill up.'
    );
  }

  // MODE 4: WINNERS / LOSERS (Split Results bracket)
  if (matchingMode === 'winners_losers') {
    const winners = eligible.filter((p) => p.lastMatchResult === 'win');
    const losers = eligible.filter((p) => p.lastMatchResult === 'loss');

    // If 4 winners waiting, prioritize winners match
    const winnerTopPos = typeof winners[0]?.queuePosition === 'number' ? winners[0].queuePosition : Infinity;
    const loserTopPos = typeof losers[0]?.queuePosition === 'number' ? losers[0].queuePosition : Infinity;

    if (winners.length >= 4 && winnerTopPos <= loserTopPos) {
      const topFour = winners.slice(0, 4);
      const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
      return buildProposal(
        topFour,
        teamA,
        teamB,
        skillDelta,
        'Winners bracket: 4 recent game winners paired together.'
      );
    }

    if (losers.length >= 4) {
      const topFour = losers.slice(0, 4);
      const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
      return buildProposal(
        topFour,
        teamA,
        teamB,
        skillDelta,
        'Rebound bracket: 4 recent runners-up paired together.'
      );
    }

    // Fallback to top 4 in queue
    const topFour = eligible.slice(0, 4);
    const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
    return buildProposal(
      topFour,
      teamA,
      teamB,
      skillDelta,
      'Queue fallback: next 4 waiting players until brackets assemble.'
    );
  }

  // Default fallback to balanced top 4
  const topFour = eligible.slice(0, 4);
  const { teamA, teamB, skillDelta } = partitionBalancedTeams(topFour);
  return buildProposal(topFour, teamA, teamB, skillDelta, 'Next 4 players in queue.');
  } catch (err) {
    console.warn('getNextGroup safe recovery:', err);
    try {
      const top = (participants || []).filter((p) => p && p.status === 'waiting' && !p.resting).slice(0, 4);
      if (top.length >= 4) {
        const { teamA, teamB, skillDelta } = partitionBalancedTeams(top);
        return {
          players: top,
          teamA,
          teamB,
          skillDelta,
          reasoning: 'Balanced top 4 in queue.',
        };
      }
    } catch {}
    return null;
  }
}

/**
 * Manual Match Assembler validator
 */
export function buildManualMatchProposal(
  selectedPlayers: Participant[],
  shuffleTeams: boolean = false
): GroupMatchProposal {
  if (!selectedPlayers || selectedPlayers.length !== 4) {
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
    reasoning: 'Manually customized by court organizer.',
  };
}
