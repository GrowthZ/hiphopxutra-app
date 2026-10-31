// Two short UI sounds, synthesised with the Web Audio API (no files): a key or button press, and a score / vote
// sent. Nothing else in the app makes sound (no music, fanfares or spoken announcements on the stage screens).

class SoundFXService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch {
      return null; // no audio on this browser: the app works the same
    }
  }

  private tone(type: OscillatorType, freq: number, start: number, length: number, level: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const at = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length);
  }

  /** A key or button press. */
  click() {
    this.tone('sine', 659.25, 0, 0.08, 0.14); // E5
  }

  /** A score or vote sent: a short rising chime. */
  confirm() {
    [440, 554.37, 659.25].forEach((freq, i) => this.tone('triangle', freq, i * 0.06, 0.25, 0.16)); // A4 C#5 E5
  }
}

export const soundFX = new SoundFXService();
