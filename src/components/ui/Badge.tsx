import React from 'react';
import { SkillLevel, ParticipantStatus, MatchingMode } from '../../types';

export const SkillBadge: React.FC<{ skill: SkillLevel; className?: string }> = ({ skill, className = '' }) => {
  switch (skill) {
    case 'beginner':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs clay-pill ${className}`}
        >
          Beginner
        </span>
      );
    case 'intermediate':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200/80 shadow-2xs clay-pill ${className}`}
        >
          Intermediate
        </span>
      );
    case 'advanced':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200/80 shadow-2xs clay-pill ${className}`}
        >
          Advanced
        </span>
      );
    default:
      return null;
  }
};

export const StatusBadge: React.FC<{ status: ParticipantStatus; resting?: boolean }> = ({ status, resting }) => {
  if (resting || status === 'resting') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs clay-pill">
        <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
        Resting
      </span>
    );
  }

  switch (status) {
    case 'playing':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs clay-pill">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
          Playing
        </span>
      );
    case 'waiting':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs clay-pill">
          In Queue
        </span>
      );
    case 'assigned':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs clay-pill">
          Called
        </span>
      );
    case 'left':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 shadow-2xs">
          Left
        </span>
      );
    default:
      return null;
  }
};

export const ModeBadge: React.FC<{ mode: MatchingMode }> = ({ mode }) => {
  const configs: Record<MatchingMode, { label: string; color: string }> = {
    balanced: { label: 'Balanced Teams', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    social_mix: { label: 'Social Mix', color: 'bg-sky-50 text-sky-800 border-sky-200' },
    skill_separated: { label: 'Skill Separated', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    winners_losers: { label: 'Winners / Losers', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  };

  const c = configs[mode] || configs.balanced;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border clay-pill ${c.color}`}>
      {c.label}
    </span>
  );
};
