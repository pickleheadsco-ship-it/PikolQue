import React, { useState, useEffect } from 'react';
import { AnnouncementSettings } from '../../types';
import { speechService } from '../../services/speech/speechService';
import { Volume2, X, Play } from 'lucide-react';

interface SpeechSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AnnouncementSettings;
  onSave: (settings: AnnouncementSettings) => void;
}

export const SpeechSettingsModal: React.FC<SpeechSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [volume, setVolume] = useState(settings.volume);
  const [rate, setRate] = useState(settings.rate);
  const [pitch, setPitch] = useState(settings.pitch);
  const [voiceURI, setVoiceURI] = useState(settings.voiceURI || '');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setVoices(speechService.getVoices());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = () => {
    speechService.speak(
      'Players Alex, Ben, Carla, and David, please proceed to Court 1.',
      { enabled: true, volume, rate, pitch, voiceURI }
    );
  };

  const handleSave = () => {
    onSave({
      enabled,
      volume,
      rate,
      pitch,
      voiceURI,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="clay-card rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center clay-subcard">
              <Volume2 className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Court Speaker Settings</h3>
              <p className="text-xs text-slate-500 font-medium">Configure voice announcements</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between p-3.5 clay-subcard rounded-2xl">
            <div>
              <div className="text-xs font-black text-slate-900">Court Voice Synthesizer</div>
              <div className="text-[11px] text-slate-500 font-medium">Speaks aloud from this terminal</div>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors clay-btn ${
                enabled ? 'clay-btn-primary justify-end' : 'clay-inset justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Voice Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Synthesizer Voice
            </label>
            <div className="clay-inset rounded-2xl px-3 py-2">
              <select
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
              >
                <option value="">Default System Voice</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Volume Slider */}
          <div>
            <div className="flex justify-between text-xs font-black text-slate-700 mb-1">
              <span>Volume</span>
              <span className="font-mono text-slate-500">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Rate Slider */}
          <div>
            <div className="flex justify-between text-xs font-black text-slate-700 mb-1">
              <span>Speech Rate</span>
              <span className="font-mono text-slate-500">{rate}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Test Button */}
          <button
            type="button"
            onClick={handleTest}
            className="w-full py-3 clay-btn clay-btn-secondary text-slate-800 rounded-2xl text-xs font-black flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current text-emerald-600" />
            <span>Test Voice Announcement</span>
          </button>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
