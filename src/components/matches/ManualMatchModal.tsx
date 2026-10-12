import React, { useState } from 'react';
import { Participant, Court, GroupMatchProposal } from '../../types';
import { SkillBadge } from '../ui/Badge';
import { buildManualMatchProposal, getAllDoublesPairingOptions, getPlayerSkillScore } from '../../services/matching/matchingEngine';
import { X, Shuffle, Play, Users } from 'lucide-react';

interface ManualMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCourts: Court[];
  availableParticipants: Participant[];
  preSelectedIds?: string[];
  onStartMatch: (court: Court, proposal: GroupMatchProposal) => Promise<void>;
}

export const ManualMatchModal: React.FC<ManualMatchModalProps> = ({
  isOpen,
  onClose,
  availableCourts,
  availableParticipants,
  preSelectedIds = [],
  onStartMatch,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(preSelectedIds);
  const [selectedCourtId, setSelectedCourtId] = useState<string>(availableCourts[0]?.courtId || '');
  const [pairingComboIndex, setPairingComboIndex] = useState(0);
  const [customTeamA, setCustomTeamA] = useState<Participant[] | null>(null);
  const [customTeamB, setCustomTeamB] = useState<Participant[] | null>(null);
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  if (!isOpen) return null;

  const toggleSelect = (pId: string) => {
    setCustomTeamA(null);
    setCustomTeamB(null);
    setSelectedSwapId(null);
    if (selectedIds.includes(pId)) {
      setSelectedIds(selectedIds.filter((id) => id !== pId));
    } else {
      if (selectedIds.length >= 4) return;
      setSelectedIds([...selectedIds, pId]);
    }
  };

  const selectedPlayers = selectedIds
    .map((id) => availableParticipants.find((p) => p.participantId === id))
    .filter(Boolean) as Participant[];

  // 3 Doubles Pairing combinations
  const pairingOptions = selectedPlayers.length === 4
    ? getAllDoublesPairingOptions(selectedPlayers)
    : [];

  const p0 = selectedPlayers[0];
  const p1 = selectedPlayers[1];
  const p2 = selectedPlayers[2];
  const p3 = selectedPlayers[3];

  const activeA: [Participant, Participant] = (customTeamA && customTeamA.length === 2
    ? customTeamA
    : pairingOptions[pairingComboIndex]?.teamA || (selectedPlayers.length === 4 ? [p0, p1] : [])) as [Participant, Participant];

  const activeB: [Participant, Participant] = (customTeamB && customTeamB.length === 2
    ? customTeamB
    : pairingOptions[pairingComboIndex]?.teamB || (selectedPlayers.length === 4 ? [p2, p3] : [])) as [Participant, Participant];

  const scoreA = getPlayerSkillScore(activeA[0]) + getPlayerSkillScore(activeA[1]);
  const scoreB = getPlayerSkillScore(activeB[0]) + getPlayerSkillScore(activeB[1]);
  const delta = Math.abs(scoreA - scoreB);

  const proposal: GroupMatchProposal | null = selectedPlayers.length === 4 && activeA.length === 2 && activeB.length === 2 ? {
    players: [activeA[0], activeA[1], activeB[0], activeB[1]],
    teamA: activeA,
    teamB: activeB,
    skillDelta: delta,
    reasoning: customTeamA
      ? `Custom organizer pairing (Skill Δ: ${delta}).`
      : (pairingOptions[pairingComboIndex]?.name || `Pairing Option ${pairingComboIndex + 1}`),
  } : null;

  const targetCourt = availableCourts.find((c) => c.courtId === selectedCourtId) || availableCourts[0];

  const handleCycleCombo = () => {
    setCustomTeamA(null);
    setCustomTeamB(null);
    setSelectedSwapId(null);
    setPairingComboIndex((prev) => (prev + 1) % Math.max(1, pairingOptions.length || 3));
  };

  const handleSwapPlayerClick = (p: Participant) => {
    if (!p?.participantId) return;
    if (!selectedSwapId) {
      setSelectedSwapId(p.participantId);
      return;
    }
    if (selectedSwapId === p.participantId) {
      setSelectedSwapId(null);
      return;
    }

    const nextA: [Participant, Participant] = [...activeA];
    const nextB: [Participant, Participant] = [...activeB];
    const inA1 = nextA.findIndex((item) => item?.participantId === selectedSwapId);
    const inA2 = nextA.findIndex((item) => item?.participantId === p.participantId);
    const inB1 = nextB.findIndex((item) => item?.participantId === selectedSwapId);
    const inB2 = nextB.findIndex((item) => item?.participantId === p.participantId);

    const first = [...nextA, ...nextB].find((item) => item?.participantId === selectedSwapId);
    const second = p;
    if (!first) {
      setSelectedSwapId(null);
      return;
    }

    if (inA1 !== -1 && inB2 !== -1) {
      nextA[inA1] = second;
      nextB[inB2] = first;
    } else if (inB1 !== -1 && inA2 !== -1) {
      nextB[inB1] = second;
      nextA[inA2] = first;
    } else if (inA1 !== -1 && inA2 !== -1) {
      nextA[inA1] = second;
      nextA[inA2] = first;
    } else if (inB1 !== -1 && inB2 !== -1) {
      nextB[inB1] = second;
      nextB[inB2] = first;
    }

    setCustomTeamA(nextA);
    setCustomTeamB(nextB);
    setSelectedSwapId(null);
  };

  const handleStart = async () => {
    if (!proposal || !targetCourt) return;
    setIsStarting(true);
    try {
      await onStartMatch(targetCourt, proposal);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="clay-card rounded-3xl max-w-xl w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center clay-subcard">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Manual Match Builder</h3>
              <p className="text-xs text-slate-500 font-medium">Pick 4 players and assign an open court</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Selection Grid */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Select 4 Players ({selectedIds.length}/4 chosen)
            </span>
            {selectedIds.length === 4 && (
              <button
                type="button"
                onClick={handleCycleCombo}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 py-1 px-2.5 rounded-xl clay-subcard"
                title="Rotate between all 3 doubles partner combinations"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Pairing {customTeamA ? 'Custom' : `${pairingComboIndex + 1}/3`}</span>
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto clay-inset rounded-2xl p-1.5 space-y-1">
            {availableParticipants.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No waiting players available to select right now.
              </div>
            ) : (
              availableParticipants.map((p) => {
                const isSelected = selectedIds.includes(p.participantId);
                return (
                  <div
                    key={p.participantId}
                    onClick={() => toggleSelect(p.participantId)}
                    className={`p-2.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all ${
                      isSelected ? 'clay-card ring-2 ring-emerald-500 font-bold text-emerald-950' : 'hover:bg-white/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded-lg border-slate-300 text-emerald-600 w-4 h-4 pointer-events-none"
                      />
                      <span>{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SkillBadge skill={p.skillLevel} />
                      <span className="text-slate-400 text-[11px] font-mono font-bold">
                        {p.gamesPlayed}G ({p.wins}W)
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Match Preview */}
        {proposal && (
          <div className="mt-4 clay-subcard p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Doubles Pairing (Skill Delta: {proposal.skillDelta})
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Click 2 players to swap</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl clay-pill border border-emerald-200">
                <span className="font-black text-emerald-800 text-[11px] block mb-1">TEAM A PARTNERS</span>
                <div className="space-y-1">
                  {proposal.teamA.map((p) => {
                    const isSelected = selectedSwapId === p.participantId;
                    const skillInitial = (p.skillLevel || 'intermediate')[0].toUpperCase();
                    return (
                      <div
                        key={p.participantId}
                        onClick={() => handleSwapPlayerClick(p)}
                        className={`font-bold p-1 rounded-lg truncate cursor-pointer transition-all ${
                          isSelected ? 'bg-amber-100 text-amber-950 ring-2 ring-amber-400' : 'text-slate-800 hover:bg-slate-100'
                        }`}
                        title="Click to swap partner"
                      >
                        {p.name || 'Player'} ({skillInitial})
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl clay-pill border border-sky-200">
                <span className="font-black text-sky-800 text-[11px] block mb-1">TEAM B PARTNERS</span>
                <div className="space-y-1">
                  {proposal.teamB.map((p) => {
                    const isSelected = selectedSwapId === p.participantId;
                    const skillInitial = (p.skillLevel || 'intermediate')[0].toUpperCase();
                    return (
                      <div
                        key={p.participantId}
                        onClick={() => handleSwapPlayerClick(p)}
                        className={`font-bold p-1 rounded-lg truncate cursor-pointer transition-all ${
                          isSelected ? 'bg-amber-100 text-amber-950 ring-2 ring-amber-400' : 'text-slate-800 hover:bg-slate-100'
                        }`}
                        title="Click to swap partner"
                      >
                        {p.name || 'Player'} ({skillInitial})
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Court Target Selector */}
        <div className="mt-4">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
            Assign to Court
          </label>
          <div className="clay-inset rounded-2xl px-3 py-2">
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden"
            >
              {availableCourts.length === 0 ? (
                <option disabled>No open courts available</option>
              ) : (
                availableCourts.map((c) => (
                  <option key={c.courtId} value={c.courtId}>
                    {c.name} (Open)
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedIds.length !== 4 || !targetCourt || isStarting}
            onClick={handleStart}
            className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isStarting ? 'Deploying...' : `Start Match on ${targetCourt?.name || 'Court'}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
