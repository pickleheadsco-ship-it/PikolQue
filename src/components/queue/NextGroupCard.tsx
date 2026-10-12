import React, { useState, useEffect, useMemo } from 'react';
import { GroupMatchProposal, Court, Participant } from '../../types';
import { SkillBadge } from '../ui/Badge';
import { WaitTimeTracker } from '../ui/WaitTimeTracker';
import { getPlayerSkillScore, getAllDoublesPairingOptions } from '../../services/matching/matchingEngine';
import { Users, Play, Volume2, PlusCircle, Sparkles, Shuffle, ArrowLeftRight } from 'lucide-react';

interface NextGroupCardProps {
  proposal: GroupMatchProposal | null;
  availableCourts: Court[];
  onStartOnCourt: (court: Court, proposal: GroupMatchProposal) => void;
  onAnnounceNextUp: (players: Participant[]) => void;
  onOpenManualBuilder: () => void;
}

export const NextGroupCard: React.FC<NextGroupCardProps> = ({
  proposal,
  availableCourts,
  onStartOnCourt,
  onAnnounceNextUp,
  onOpenManualBuilder,
}) => {
  const [pairingIndex, setPairingIndex] = useState(0);
  const [customTeamA, setCustomTeamA] = useState<Participant[] | null>(null);
  const [customTeamB, setCustomTeamB] = useState<Participant[] | null>(null);
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);

  // Reset pairing if proposal players change
  const playerSignature = proposal?.players?.map((p) => p?.participantId).filter(Boolean).join(',') || '';
  useEffect(() => {
    setPairingIndex(0);
    setCustomTeamA(null);
    setCustomTeamB(null);
    setSelectedSwapId(null);
  }, [playerSignature]);

  if (!proposal || !Array.isArray(proposal.players) || proposal.players.length < 4) {
    return (
      <div className="clay-card rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-slate-300" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Next Up</h3>
          </div>
          <button
            onClick={onOpenManualBuilder}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1.5 py-1 px-2.5 rounded-xl clay-subcard cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manual 4</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 py-6 text-center font-medium">
          Waiting for at least 4 available players checked into the queue.
        </p>
      </div>
    );
  }

  const { players } = proposal;
  const p0 = players[0];
  const p1 = players[1];
  const p2 = players[2];
  const p3 = players[3];

  // 3 distinct doubles pairings for any 4 players computed deterministically
  const pairingOptions = useMemo(() => {
    if (!p0 || !p1 || !p2 || !p3) return [];
    return getAllDoublesPairingOptions([p0, p1, p2, p3]);
  }, [p0, p1, p2, p3]);

  // Active teams determined by custom swap or active rotation index
  const activeTeamA: [Participant, Participant] =
    (customTeamA && customTeamA.length === 2
      ? customTeamA
      : pairingOptions[pairingIndex]?.teamA ||
        (proposal.teamA && proposal.teamA.length === 2 ? proposal.teamA : [p0, p1])) as [Participant, Participant];

  const activeTeamB: [Participant, Participant] =
    (customTeamB && customTeamB.length === 2
      ? customTeamB
      : pairingOptions[pairingIndex]?.teamB ||
        (proposal.teamB && proposal.teamB.length === 2 ? proposal.teamB : [p2, p3])) as [Participant, Participant];

  // Compute live skill delta safely
  const scoreA = getPlayerSkillScore(activeTeamA[0]) + getPlayerSkillScore(activeTeamA[1]);
  const scoreB = getPlayerSkillScore(activeTeamB[0]) + getPlayerSkillScore(activeTeamB[1]);
  const activeSkillDelta = Math.abs(scoreA - scoreB);

  const activeProposal: GroupMatchProposal = {
    ...proposal,
    players: [activeTeamA[0], activeTeamA[1], activeTeamB[0], activeTeamB[1]],
    teamA: activeTeamA,
    teamB: activeTeamB,
    skillDelta: activeSkillDelta,
    reasoning: customTeamA
      ? `Custom organizer pairing (Skill Δ: ${activeSkillDelta}).`
      : `${pairingOptions[pairingIndex]?.name || 'Recommended Pairing'}`,
  };

  const handleCyclePairing = () => {
    setCustomTeamA(null);
    setCustomTeamB(null);
    setSelectedSwapId(null);
    setPairingIndex((prev) => (prev + 1) % Math.max(1, pairingOptions.length));
  };

  const handlePlayerClick = (clickedPlayer: Participant) => {
    if (!clickedPlayer?.participantId) return;

    if (!selectedSwapId) {
      setSelectedSwapId(clickedPlayer.participantId);
      return;
    }

    if (selectedSwapId === clickedPlayer.participantId) {
      setSelectedSwapId(null);
      return;
    }

    // Swap selected with clicked
    const currentA: [Participant, Participant] = [...activeTeamA];
    const currentB: [Participant, Participant] = [...activeTeamB];
    const inAIdx1 = currentA.findIndex((p) => p?.participantId === selectedSwapId);
    const inAIdx2 = currentA.findIndex((p) => p?.participantId === clickedPlayer.participantId);
    const inBIdx1 = currentB.findIndex((p) => p?.participantId === selectedSwapId);
    const inBIdx2 = currentB.findIndex((p) => p?.participantId === clickedPlayer.participantId);

    const pFirst = [...currentA, ...currentB].find((p) => p?.participantId === selectedSwapId);
    const pSecond = clickedPlayer;
    if (!pFirst) {
      setSelectedSwapId(null);
      return;
    }

    if (inAIdx1 !== -1 && inBIdx2 !== -1) {
      currentA[inAIdx1] = pSecond;
      currentB[inBIdx2] = pFirst;
    } else if (inBIdx1 !== -1 && inAIdx2 !== -1) {
      currentB[inBIdx1] = pSecond;
      currentA[inAIdx2] = pFirst;
    } else if (inAIdx1 !== -1 && inAIdx2 !== -1) {
      // Swapping within Team A
      currentA[inAIdx1] = pSecond;
      currentA[inAIdx2] = pFirst;
    } else if (inBIdx1 !== -1 && inBIdx2 !== -1) {
      // Swapping within Team B
      currentB[inBIdx1] = pSecond;
      currentB[inBIdx2] = pFirst;
    }

    setCustomTeamA(currentA);
    setCustomTeamB(currentB);
    setSelectedSwapId(null);
  };

  const firstAvailableCourt = availableCourts[0];

  return (
    <div className="clay-card-dark text-white rounded-3xl p-5 sm:p-6 relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="font-black text-sm uppercase tracking-wider text-emerald-400">
            Next Up On Deck
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* PAIRING ROTATION CONTROL */}
          <button
            type="button"
            onClick={handleCyclePairing}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors clay-btn border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            title="Cycle between all 3 doubles pairing combinations"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span>Pairing {customTeamA ? 'Custom' : `${pairingIndex + 1}/3`}</span>
          </button>

          <button
            onClick={() => onAnnounceNextUp(players)}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors clay-btn border border-slate-700 cursor-pointer"
            title="Announce next up on speaker"
            aria-label="Announce next up"
          >
            <Volume2 className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            onClick={onOpenManualBuilder}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors clay-btn border border-slate-700 cursor-pointer"
          >
            Custom 4
          </button>
        </div>
      </div>

      {/* Pairing Swap Instructions Banner */}
      <div className="relative z-10 mb-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
        <span className="flex items-center gap-1.5">
          <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
          <span>Click any 2 players to swap pairing partners:</span>
        </span>
        {selectedSwapId ? (
          <span className="text-amber-400 font-bold animate-pulse">
            Select 2nd player to swap!
          </span>
        ) : (
          <span className="text-slate-500 font-mono text-[10px]">Tap cards to rearrange</span>
        )}
      </div>

      {/* Projected Teams Preview with Tactile Pair Swap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10 mb-4">
        {/* Team A */}
        <div className="clay-inset-dark rounded-2xl p-3.5 border border-slate-800">
          <div className="text-[11px] font-black text-emerald-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Team A</span>
            <span className="text-slate-400 text-[10px] font-medium">Partners</span>
          </div>
          <div className="space-y-2">
            {activeTeamA.map((p) => {
              if (!p) return null;
              const isSelected = selectedSwapId === p.participantId;
              const initial = (p.name?.trim() || p.firstName?.trim() || '?').charAt(0).toUpperCase();

              return (
                <div
                  key={p.participantId}
                  onClick={() => handlePlayerClick(p)}
                  className={`flex items-center justify-between text-xs p-1.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/30 ring-2 ring-amber-400'
                      : 'hover:bg-slate-800/80'
                  }`}
                  title="Click to swap partner"
                >
                  <div className="flex items-center gap-2 truncate">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name || 'Player'}
                        className="w-5 h-5 rounded-lg object-cover shrink-0 border border-slate-700"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-lg bg-emerald-950 text-emerald-300 font-black text-[9px] flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                    )}
                    <span className="font-bold text-slate-100 truncate max-w-[120px]">{p.name || 'Player'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SkillBadge skill={p.skillLevel} />
                    <WaitTimeTracker queueEnteredAt={p.queueEnteredAt} className="text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team B */}
        <div className="clay-inset-dark rounded-2xl p-3.5 border border-slate-800">
          <div className="text-[11px] font-black text-sky-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Team B</span>
            <span className="text-slate-400 text-[10px] font-medium">Partners</span>
          </div>
          <div className="space-y-2">
            {activeTeamB.map((p) => {
              if (!p) return null;
              const isSelected = selectedSwapId === p.participantId;
              const initial = (p.name?.trim() || p.firstName?.trim() || '?').charAt(0).toUpperCase();

              return (
                <div
                  key={p.participantId}
                  onClick={() => handlePlayerClick(p)}
                  className={`flex items-center justify-between text-xs p-1.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/30 ring-2 ring-amber-400'
                      : 'hover:bg-slate-800/80'
                  }`}
                  title="Click to swap partner"
                >
                  <div className="flex items-center gap-2 truncate">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name || 'Player'}
                        className="w-5 h-5 rounded-lg object-cover shrink-0 border border-slate-700"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-lg bg-sky-950 text-sky-300 font-black text-[9px] flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                    )}
                    <span className="font-bold text-slate-100 truncate max-w-[120px]">{p.name || 'Player'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SkillBadge skill={p.skillLevel} />
                    <WaitTimeTracker queueEnteredAt={p.queueEnteredAt} className="text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Algorithm reasoning bar */}
      <div className="text-[11px] text-slate-300 mb-4 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
        <span className="truncate pr-2 font-medium">{activeProposal.reasoning}</span>
        <span className="text-emerald-400 font-mono text-[10px] font-bold shrink-0">
          Δ {activeSkillDelta} {activeSkillDelta === 0 ? '(Balanced)' : ''}
        </span>
      </div>

      {/* Direct Court Deployment Action */}
      <div className="relative z-10">
        {firstAvailableCourt ? (
          <button
            onClick={() => onStartOnCourt(firstAvailableCourt, activeProposal)}
            className="w-full py-3.5 clay-btn clay-btn-primary rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Seat & Start on {firstAvailableCourt.name}</span>
          </button>
        ) : (
          <div className="w-full py-3 bg-slate-800/90 text-slate-300 text-xs rounded-2xl text-center border border-slate-700 font-medium">
            All courts currently playing. Group will take next finished court.
          </div>
        )}
      </div>
    </div>
  );
};
