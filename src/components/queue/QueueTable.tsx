import React, { useState } from 'react';
import { Participant } from '../../types';
import { SkillBadge, StatusBadge } from '../ui/Badge';
import { WaitTimeTracker } from '../ui/WaitTimeTracker';
import { Coffee, Trash2, Edit2, Play, Users } from 'lucide-react';

interface QueueTableProps {
  participants: Participant[];
  selectedIds: string[];
  onToggleSelect: (participantId: string) => void;
  onToggleRest: (participant: Participant) => void;
  onRemove: (participant: Participant) => void;
  onEdit: (participant: Participant) => void;
  onBumpUp?: (participant: Participant) => void;
  isOrganizer?: boolean;
}

export const QueueTable: React.FC<QueueTableProps> = ({
  participants,
  selectedIds,
  onToggleSelect,
  onToggleRest,
  onRemove,
  onEdit,
  isOrganizer = true,
}) => {
  const [filter, setFilter] = useState<'all' | 'waiting' | 'resting' | 'playing'>('all');

  const filtered = participants.filter((p) => {
    if (p.status === 'left') return false;
    if (filter === 'waiting') return p.status === 'waiting' && !p.resting;
    if (filter === 'resting') return p.resting || p.status === 'resting';
    if (filter === 'playing') return p.status === 'playing';
    return true;
  });

  return (
    <div className="clay-card rounded-3xl overflow-hidden flex flex-col">
      {/* Header filter tabs */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">Active Roster & Queue</h3>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-xl font-mono font-bold clay-pill">
            {participants.filter((p) => p.status !== 'left').length}
          </span>
        </div>

        {/* Tactile Filter Segmented Control */}
        <div className="flex items-center gap-1 clay-inset p-1 rounded-2xl text-xs font-bold overflow-x-auto max-w-full">
          {(['all', 'waiting', 'playing', 'resting'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl capitalize transition-all clay-btn whitespace-nowrap ${
                filter === tab
                  ? 'clay-btn-secondary text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE VIEW (< 768px): Responsive Tactile Clay Cards */}
      <div className="block md:hidden p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            No players currently matching this view.
          </div>
        ) : (
          filtered.map((p) => {
            const isSelected = selectedIds.includes(p.participantId);
            const isWaiting = p.status === 'waiting' && !p.resting;

            return (
              <div
                key={p.participantId}
                className={`clay-subcard rounded-2xl p-3.5 transition-all flex flex-col gap-2.5 ${
                  isSelected ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOrganizer && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={p.status === 'playing'}
                        onChange={() => onToggleSelect(p.participantId)}
                        className="rounded-lg border-slate-300 text-emerald-600 w-4 h-4 cursor-pointer"
                        aria-label={`Select ${p.name}`}
                      />
                    )}
                    {isWaiting ? (
                      <span className="font-mono font-black text-slate-900 text-sm">#{p.queuePosition}</span>
                    ) : (
                      <span className="text-slate-400 text-xs font-mono">-</span>
                    )}
                    <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                  </div>

                  <StatusBadge status={p.status} resting={p.resting} />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                  <div className="flex items-center gap-2">
                    <SkillBadge skill={p.skillLevel} />
                    {isWaiting && <WaitTimeTracker queueEnteredAt={p.queueEnteredAt} />}
                  </div>

                  <span className="font-mono text-[11px] font-bold">
                    {p.gamesPlayed}G ({p.wins}W / {p.losses}L) • {p.gamesPlayed > 0 ? `${p.winRate}%` : '—'}
                  </span>
                </div>

                {isOrganizer && (
                  <div className="flex items-center justify-end gap-2 border-t border-slate-200/60 pt-2">
                    <button
                      onClick={() => onToggleRest(p)}
                      disabled={p.status === 'playing'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold clay-btn flex items-center gap-1.5 ${
                        p.resting ? 'clay-btn-amber' : 'clay-btn-secondary'
                      }`}
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      <span>{p.resting ? 'Resume' : 'Rest'}</span>
                    </button>
                    <button
                      onClick={() => onRemove(p)}
                      disabled={p.status === 'playing'}
                      className="p-2 rounded-xl clay-btn clay-btn-secondary text-rose-500 hover:text-rose-700"
                      title="Remove from session"
                      aria-label="Remove player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP VIEW (>= 768px): Structured Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              {isOrganizer && <th className="py-3 px-4 w-10 text-center">Sel</th>}
              <th className="py-3 px-4 w-16">Pos</th>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4">Skill</th>
              <th className="py-3 px-4">Wait Time</th>
              <th className="py-3 px-4">Record</th>
              <th className="py-3 px-4">Win %</th>
              <th className="py-3 px-4">Status</th>
              {isOrganizer && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400 font-medium">
                  No players currently matching this view.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isSelected = selectedIds.includes(p.participantId);
                const isWaiting = p.status === 'waiting' && !p.resting;

                return (
                  <tr
                    key={p.participantId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-emerald-50/60' : ''
                    }`}
                  >
                    {isOrganizer && (
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={p.status === 'playing'}
                          onChange={() => onToggleSelect(p.participantId)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer disabled:opacity-30"
                          aria-label={`Select ${p.name}`}
                        />
                      </td>
                    )}

                    <td className="py-3 px-4 font-mono font-black text-slate-900">
                      {isWaiting ? (
                        <span className="text-slate-900">#{p.queuePosition}</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[150px]">{p.name}</span>
                        {p.lastMatchResult && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase ${
                              p.lastMatchResult === 'win'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {p.lastMatchResult === 'win' ? 'W' : 'L'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <SkillBadge skill={p.skillLevel} />
                    </td>

                    <td className="py-3 px-4">
                      {isWaiting ? (
                        <WaitTimeTracker queueEnteredAt={p.queueEnteredAt} />
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-600">
                      {p.gamesPlayed}G ({p.wins}W - {p.losses}L)
                    </td>

                    <td className="py-3 px-4 font-mono font-black text-slate-900">
                      {p.gamesPlayed > 0 ? `${p.winRate}%` : '—'}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} resting={p.resting} />
                    </td>

                    {isOrganizer && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onToggleRest(p)}
                            disabled={p.status === 'playing'}
                            className={`p-2 rounded-xl clay-btn transition-colors text-xs flex items-center gap-1 ${
                              p.resting ? 'clay-btn-amber' : 'clay-btn-secondary'
                            }`}
                            title={p.resting ? 'Resume to Queue' : 'Rest Player'}
                            aria-label={p.resting ? 'Resume' : 'Rest'}
                          >
                            <Coffee className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onRemove(p)}
                            disabled={p.status === 'playing'}
                            className="p-2 rounded-xl clay-btn clay-btn-secondary text-rose-500 hover:text-rose-700 disabled:opacity-30"
                            title="Remove from Session"
                            aria-label="Remove from session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
