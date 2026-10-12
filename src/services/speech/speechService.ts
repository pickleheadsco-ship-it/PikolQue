import { AnnouncementSettings } from '../../types';

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isSupported = true;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  public speak(text: string, settings?: Partial<AnnouncementSettings>) {
    if (!this.isSupported || !this.synth) return;

    if (settings && settings.enabled === false) {
      return;
    }

    try {
      this.synth.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = settings?.volume ?? 1;
      utterance.rate = settings?.rate ?? 1;
      utterance.pitch = settings?.pitch ?? 1;

      if (settings?.voiceURI) {
        const found = this.voices.find((v) => v.voiceURI === settings.voiceURI);
        if (found) {
          utterance.voice = found;
        }
      } else {
        // Prefer natural English voices if available
        const preferred = this.voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
        ) || this.voices.find((v) => v.lang.startsWith('en'));
        if (preferred) {
          utterance.voice = preferred;
        }
      }

      this.synth.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // Pre-formatted announcements
  public announceCourtAssignment(
    playerNames: string[],
    courtName: string,
    settings?: Partial<AnnouncementSettings>
  ) {
    if (playerNames.length === 0) return;
    const names = this.formatNames(playerNames);
    const message = `Players ${names}, please proceed to ${courtName}.`;
    this.speak(message, settings);
  }

  public announceNextUp(playerNames: string[], settings?: Partial<AnnouncementSettings>) {
    if (playerNames.length === 0) return;
    const names = this.formatNames(playerNames);
    const message = `Next group on deck: ${names}. Please be ready.`;
    this.speak(message, settings);
  }

  public announceLastCall(playerName: string, courtName: string, settings?: Partial<AnnouncementSettings>) {
    const message = `Last call for ${playerName} to report to ${courtName}.`;
    this.speak(message, settings);
  }

  public announceSessionEnding(settings?: Partial<AnnouncementSettings>) {
    this.speak('Open play session is now concluding. Thank you all for playing!', settings);
  }

  private formatNames(names: string[]): string {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    const allButLast = names.slice(0, -1).join(', ');
    return `${allButLast}, and ${names[names.length - 1]}`;
  }
}

export const speechService = new SpeechService();
