import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface WaitTimeTrackerProps {
  queueEnteredAt: any;
  showIcon?: boolean;
  className?: string;
}

export const WaitTimeTracker: React.FC<WaitTimeTrackerProps> = ({
  queueEnteredAt,
  showIcon = true,
  className = '',
}) => {
  const [minutes, setMinutes] = useState<number>(0);

  useEffect(() => {
    const calculateMinutes = () => {
      if (!queueEnteredAt) return 0;
      let startMs = 0;
      if (typeof queueEnteredAt?.toMillis === 'function') {
        startMs = queueEnteredAt.toMillis();
      } else if (typeof queueEnteredAt === 'number') {
        startMs = queueEnteredAt;
      } else {
        const parsed = new Date(queueEnteredAt).getTime();
        startMs = isNaN(parsed) ? Date.now() : parsed;
      }
      const diffMs = Math.max(0, Date.now() - startMs);
      return Math.floor(diffMs / (1000 * 60));
    };

    setMinutes(calculateMinutes());
    const interval = setInterval(() => {
      setMinutes(calculateMinutes());
    }, 15000); // refresh every 15s

    return () => clearInterval(interval);
  }, [queueEnteredAt]);

  const display = minutes === 0 ? '< 1m' : `${minutes}m`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-slate-500 font-mono ${className}`}>
      {showIcon && <Clock className="w-3 h-3 text-slate-400" />}
      <span>{display}</span>
    </span>
  );
};

interface MatchTimerProps {
  startedAt: any;
  limitMinutes?: number;
  className?: string;
  showLimitBadge?: boolean;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({
  startedAt,
  limitMinutes,
  className = '',
  showLimitBadge = true,
}) => {
  const [elapsed, setElapsed] = useState<string>('00:00');
  const [totalSecondsElapsed, setTotalSecondsElapsed] = useState<number>(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed('00:00');
      setTotalSecondsElapsed(0);
      return;
    }

    let startMs = Date.now();
    if (typeof startedAt?.toMillis === 'function') {
      startMs = startedAt.toMillis();
    } else if (typeof startedAt === 'number') {
      startMs = startedAt;
    } else if (startedAt) {
      const parsed = new Date(startedAt).getTime();
      startMs = isNaN(parsed) ? Date.now() : parsed;
    }

    const updateTimer = () => {
      const totalSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setTotalSecondsElapsed(totalSeconds);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      const hours = Math.floor(mins / 60);

      if (hours > 0) {
        const remMins = mins % 60;
        setElapsed(
          `${String(hours).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      } else {
        setElapsed(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const effectiveLimit = limitMinutes && limitMinutes > 0 ? limitMinutes : 15;
  const limitSeconds = effectiveLimit * 60;
  const isExpired = totalSecondsElapsed >= limitSeconds;
  const isWarning = !isExpired && limitSeconds - totalSecondsElapsed <= 120; // 2 minutes left
  const remainingSecs = Math.max(0, limitSeconds - totalSecondsElapsed);
  const remainingMins = Math.floor(remainingSecs / 60);
  const remainingSecsMod = remainingSecs % 60;
  const remainingDisplay = `${remainingMins}:${String(remainingSecsMod).padStart(2, '0')}`;

  if (isExpired) {
    return (
      <div className={`font-mono text-xs font-black tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-300 inline-flex items-center gap-1.5 animate-pulse shadow-xs ${className}`}>
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        <span>{elapsed}</span>
        {showLimitBadge && (
          <span className="text-[10px] uppercase font-black bg-rose-600 text-white px-1.5 py-0.2 rounded-md">
            Limit Reached ({effectiveLimit}m)
          </span>
        )}
      </div>
    );
  }

  if (isWarning) {
    return (
      <div className={`font-mono text-xs font-bold tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs ${className}`}>
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span>{elapsed}</span>
        {showLimitBadge && (
          <span className="text-[10px] uppercase font-black bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md">
            {remainingDisplay} left
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`font-mono text-xs tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 inline-flex items-center gap-1.5 ${className}`}>
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>{elapsed}</span>
      {limitMinutes && showLimitBadge && (
        <span className="text-[10px] font-bold text-slate-400">
          / {effectiveLimit}m
        </span>
      )}
    </div>
  );
};
