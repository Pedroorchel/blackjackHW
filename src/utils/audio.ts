// Web Audio API sound effects for Blackjack

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('blackjack_sound_muted');
      this.muted = saved === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('blackjack_sound_muted', String(this.muted));
    }
    return this.muted;
  }

  // Card slide sound
  public playCardDeal() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Ignore audio errors if blocked by browser policy
    }
  }

  // Card flip / reveal sound with tactile table snap
  public playCardFlip() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // High friction snap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.14);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.26, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.14);

      // Low thump on felt
      setTimeout(() => {
        const ctx2 = this.getContext();
        if (!ctx2) return;
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(180, ctx2.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(65, ctx2.currentTime + 0.08);
        gain2.gain.setValueAtTime(0.22, ctx2.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.08);
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        osc2.start();
        osc2.stop(ctx2.currentTime + 0.08);
      }, 60);
    } catch {
      // Ignore
    }
  }

  // Chip click sound
  public playChipBet() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // Ignore
    }
  }

  // Win chime
  public playWin() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.09);

        gain.gain.setValueAtTime(0.18, ctx.currentTime + index * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.09);
        osc.stop(ctx.currentTime + index * 0.09 + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  // Blackjack Fanfare
  public playBlackjack() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880, 1108.73]; // A4, C#5, E5, A5, C#6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);

        gain.gain.setValueAtTime(0.25, ctx.currentTime + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.1);
        osc.stop(ctx.currentTime + index * 0.1 + 0.4);
      });
    } catch {
      // Ignore
    }
  }

  // Bust sound
  public playBust() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignore
    }
  }
}

export const sounds = new SoundManager();
