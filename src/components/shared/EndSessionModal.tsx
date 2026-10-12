import React, { useState } from 'react';
import { Session } from '../../types';
import { AlertTriangle, X } from 'lucide-react';
import { endSession } from '../../services/sessions/sessionService';

interface EndSessionModalProps {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export const EndSessionModal: React.FC<EndSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onCompleted,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await endSession(session.id);
      onCompleted();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="clay-card rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center clay-subcard">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">End This Session?</h3>
              <p className="text-xs text-slate-500 font-medium">{session.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs text-slate-600 leading-relaxed font-medium">
          <p>
            Closing this session stops the active queue, locks new joins, and compiles the final
            standings podium and match records.
          </p>
          <div className="p-3 clay-subcard rounded-2xl text-slate-800 font-bold border border-slate-200/60">
            All player game counts, win rates, and match logs will be permanently preserved.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-danger text-white text-xs font-black shadow-md disabled:opacity-40"
          >
            {isSubmitting ? 'Ending...' : 'Yes, End & View Summary'}
          </button>
        </div>
      </div>
    </div>
  );
};
