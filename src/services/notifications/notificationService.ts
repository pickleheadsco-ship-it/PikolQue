// Browser notification, sound alert, and vibration service for PickleQueue

class NotificationService {
  private audioCtx: AudioContext | null = null;
  private lastAlertedStatus: string | null = null;
  private lastAlertedMatchId: string | null = null;
  private lastAlertedOnDeck: boolean = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        this.playChime('subtle');
        this.sendNotification('PickleQueue Alerts Enabled', {
          body: "You'll be notified the second it's your turn to hit the court!",
          tag: 'picklequeue-init',
        });
      }
      return perm;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return 'denied';
    }
  }

  // Synthesize pleasant chime using Web Audio API (no external file dependencies)
  public playChime(type: 'alert' | 'urgent' | 'subtle' = 'alert') {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'suspended') {
        this.audioCtx = new AudioCtxClass();
      }

      const now = this.audioCtx.currentTime;

      if (type === 'urgent') {
        // High attention fanfare chime (for Court Match Call)
        const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        freqs.forEach((freq, idx) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0, now + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.45);
        });
      } else if (type === 'alert') {
        // Double ding for On-Deck / Next Play
        [659.25, 880.0].forEach((freq, idx) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.14);
          gain.gain.setValueAtTime(0, now + idx * 0.14);
          gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.14 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.35);
          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);
          osc.start(now + idx * 0.14);
          osc.stop(now + idx * 0.14 + 0.4);
        });
      } else {
        // Subtle confirmation ping
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      }
    } catch (e) {
      console.warn('Audio chime playback deferred:', e);
    }
  }

  // Trigger mobile vibration if device supports it
  public vibrate(pattern: number[] = [200, 100, 200, 100, 300]) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {}
  }

  // Send system push notification
  public sendNotification(title: string, options?: NotificationOptions) {
    if (!this.isSupported() || this.getPermission() !== 'granted') return;

    try {
      const defaultIcon = '/favicon.png';
      const notification = new Notification(title, {
        icon: defaultIcon,
        badge: defaultIcon,
        silent: false,
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn('Browser notification send error:', e);
    }
  }

  /**
   * Evaluates queue and match state changes to automatically notify player
   */
  public evaluateStatusChange(params: {
    participantId: string;
    participantName: string;
    status: string;
    currentCourtName?: string | null;
    currentMatchId?: string | null;
    isOnDeck: boolean;
    queuePosition?: number | null;
  }) {
    const {
      participantName,
      status,
      currentCourtName,
      currentMatchId,
      isOnDeck,
      queuePosition,
    } = params;

    // 1. MATCH CALLED: Status switched to playing or newly assigned to a court
    if (status === 'playing' && currentCourtName) {
      if (this.lastAlertedStatus !== 'playing' || (currentMatchId && this.lastAlertedMatchId !== currentMatchId)) {
        this.lastAlertedStatus = 'playing';
        this.lastAlertedMatchId = currentMatchId || null;
        this.lastAlertedOnDeck = false;

        this.playChime('urgent');
        this.vibrate([300, 150, 300, 150, 500]);
        this.sendNotification(`🎾 ${participantName}, You're Up!`, {
          body: `Proceed to ${currentCourtName} now! Your doubles match is starting.`,
          tag: `match-${currentMatchId || 'court'}`,
          requireInteraction: true,
        });
        return { type: 'playing', courtName: currentCourtName };
      }
    }

    // 2. ON DECK / NEXT PLAY: Player is part of the next group proposal
    if (isOnDeck && status === 'waiting') {
      if (!this.lastAlertedOnDeck) {
        this.lastAlertedOnDeck = true;
        this.lastAlertedStatus = 'waiting';

        this.playChime('alert');
        this.vibrate([200, 100, 200]);
        this.sendNotification(`⚡ Get Ready, ${participantName}!`, {
          body: "You're On Deck! You are in the next group called to play.",
          tag: 'on-deck-alert',
        });
        return { type: 'on_deck', position: queuePosition || 1 };
      }
    }

    // Reset On-Deck alert if player moves back or out
    if (!isOnDeck && status === 'waiting') {
      this.lastAlertedOnDeck = false;
    }

    if (status !== 'playing') {
      this.lastAlertedStatus = status;
      this.lastAlertedMatchId = null;
    }

    return null;
  }
}

export const notificationService = new NotificationService();
