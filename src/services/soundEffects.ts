// Web Audio API Synthesizer & Speech Narration for HipHop Breaking Tournament

class SoundFXService {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public volume = 0.8;
  public voiceAnnounceEnabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch (e) {
      console.warn('AudioContext not available:', e);
      return null;
    }
  }

  // Master Gain Node
  private createMasterGain(ctx: AudioContext): GainNode {
    const master = ctx.createGain();
    master.gain.setValueAtTime(this.volume, ctx.currentTime);
    master.connect(ctx.destination);
    return master;
  }

  // 1. Quick UI button click / select side
  playVoteClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  // 2. Judge vote submission confirmed (satisfying modern rising chime)
  playVoteConfirmed() {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const now = ctx.currentTime;
    const freqs = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 arpeggio

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.28);
    });
  }

  // 3. All 9 Judges Voted Alert (Notifies MC and Stage that all ballots are in)
  playAllJudgesVotedAlert() {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const now = ctx.currentTime;
    const chords = [587.33, 739.99, 880, 1174.66]; // D-F#-A-D

    chords.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  // 4. Dramatic Suspense Roll before Round Confirmation / Vote Reveal
  playRevealSuspense() {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const now = ctx.currentTime;

    // Sub-bass sweep
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(220, now + 0.6);
    subGain.gain.setValueAtTime(0.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start(now);
    subOsc.stop(now + 0.7);

    // Fast riser ticks
    for (let i = 0; i < 6; i++) {
      const tickOsc = ctx.createOscillator();
      const tickGain = ctx.createGain();
      const t = now + i * 0.09;
      tickOsc.type = 'triangle';
      tickOsc.frequency.setValueAtTime(400 + i * 80, t);
      tickGain.gain.setValueAtTime(0.15, t);
      tickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      tickOsc.connect(tickGain);
      tickGain.connect(master);
      tickOsc.start(t);
      tickOsc.stop(t + 0.05);
    }
  }

  // 5. Round Winner Impact (Deep impact + Bright Victory Chord)
  playRoundWinner(winnerSide?: 'red' | 'blue' | 'tie' | null) {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const now = ctx.currentTime;

    // Heavy bass drum impact
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(140, now);
    kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    kickGain.gain.setValueAtTime(0.4, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    kickOsc.connect(kickGain);
    kickGain.connect(master);
    kickOsc.start(now);
    kickOsc.stop(now + 0.4);

    // High triumphant chime
    const notes = winnerSide === 'red' ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 739.99, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.05 + idx * 0.04);
      gain.gain.setValueAtTime(0.2, now + 0.05 + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + 0.05 + idx * 0.04);
      osc.stop(now + 1.2);
    });
  }

  // 6. Iconic HipHop Airhorn Hype Sound!
  playHiphopAirhorn() {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const now = ctx.currentTime;

    const blasts = [0, 0.18, 0.38, 0.58]; // 4 signature hiphop blasts
    blasts.forEach((startTime) => {
      const t = now + startTime;
      const duration = 0.14;

      // Two slightly detuned oscillators for authentic horn resonance
      [466.16, 471.2].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.96, t + duration);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + duration);
      });
    });
  }

  // 7. Grand Champion Fanfare (Championship Victory)
  playChampionFanfare(winnerSide?: 'red' | 'blue' | null) {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const now = ctx.currentTime;

    // First: play hiphop airhorn intro!
    this.playHiphopAirhorn();

    // Then: royal brass triumph
    const melody = [
      { f: 523.25, d: 0.14, pause: 0.02 }, // C5
      { f: 523.25, d: 0.14, pause: 0.02 }, // C5
      { f: 523.25, d: 0.14, pause: 0.02 }, // C5
      { f: 659.25, d: 0.35, pause: 0.04 }, // E5
      { f: 783.99, d: 0.25, pause: 0.04 }, // G5
      { f: 1046.5, d: 0.8, pause: 0.1 },  // C6
    ];

    let t = now + 0.8;
    melody.forEach((note) => {
      // Sawtooth + Triangle for brass richness
      ['sawtooth', 'triangle'].forEach((type, layerIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type as OscillatorType;
        osc.frequency.setValueAtTime(note.f, t);

        const layerGain = layerIdx === 0 ? 0.15 : 0.22;
        gain.gain.setValueAtTime(layerGain, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + note.d);
      });
      t += note.d + note.pause;
    });
  }

  // 8. 45s Countdown Beep
  playCountTick(isFinalSecond = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = isFinalSecond ? 987.77 : 523.25; // B5 vs C5
    osc.type = isFinalSecond ? 'square' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isFinalSecond ? 0.35 : 0.15));
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + (isFinalSecond ? 0.35 : 0.15));
  }

  // 9. 45s Time's Up Buzzer
  playBuzzer() {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(145, now);
    osc2.frequency.setValueAtTime(152, now);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(master);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.85);
    osc2.stop(now + 0.85);
  }

  // 10. Voice Announcement in Vietnamese using Web Speech API
  // 10. Team Entrance Dynamic Whoosh & Collision Impact
  playTeamEntranceSwoosh() {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const now = ctx.currentTime;

    // Sub-bass sweep
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(50, now);
    subOsc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
    subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.6);
    subGain.gain.setValueAtTime(0.35, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start(now);
    subOsc.stop(now + 0.65);

    // Fast riser whoosh
    const whooshOsc = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whooshOsc.type = 'sawtooth';
    whooshOsc.frequency.setValueAtTime(180, now);
    whooshOsc.frequency.exponentialRampToValueAtTime(680, now + 0.28);
    whooshGain.gain.setValueAtTime(0.15, now);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    whooshOsc.connect(whooshGain);
    whooshGain.connect(master);
    whooshOsc.start(now);
    whooshOsc.stop(now + 0.32);

    // VS Clash Impact at +0.35s
    const clashT = now + 0.35;
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.type = 'triangle';
    kickOsc.frequency.setValueAtTime(180, clashT);
    kickOsc.frequency.exponentialRampToValueAtTime(45, clashT + 0.3);
    kickGain.gain.setValueAtTime(0.4, clashT);
    kickGain.gain.exponentialRampToValueAtTime(0.001, clashT + 0.35);
    kickOsc.connect(kickGain);
    kickGain.connect(master);
    kickOsc.start(clashT);
    kickOsc.stop(clashT + 0.35);
  }

  // 11. Judge Ballot 3D Flip Sound (Tactile rising pitch per judge 0-8)
  playCardFlipTick(judgeIndex: number, vote?: 'red' | 'blue') {
    const ctx = this.getContext();
    if (!ctx) return;
    const master = this.createMasterGain(ctx);
    const now = ctx.currentTime;

    // Rising base note from D4 up to E5 (350Hz to 750Hz)
    const baseFreq = 350 + judgeIndex * 48;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = vote === 'red' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.05);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.12);

    // Subtle bright click snap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'square';
    snapOsc.frequency.setValueAtTime(1200 + judgeIndex * 120, now);
    snapGain.gain.setValueAtTime(0.12, now);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    snapOsc.connect(snapGain);
    snapGain.connect(master);
    snapOsc.start(now);
    snapOsc.stop(now + 0.035);
  }

  speakVietnamese(text: string) {
    if (!this.enabled || !this.voiceAnnounceEnabled) return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = Math.min(1.0, this.volume * 1.2);

      // Find Vietnamese voice if available
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.includes('vi') || v.lang.includes('VN'));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  announceJudgeVote(judgeCode: string, side: 'red' | 'blue') {
    const sideText = side === 'red' ? 'Góc Đỏ' : 'Góc Xanh';
    this.speakVietnamese(`${judgeCode} đã chọn ${sideText}`);
  }

  announceRoundWinner(roundNumber: number, winnerSide: 'red' | 'blue' | 'tie', winnerName: string) {
    if (winnerSide === 'tie') {
      this.speakVietnamese(`Kết quả Round ${roundNumber}: Hòa điểm!`);
    } else {
      const sideText = winnerSide === 'red' ? 'Góc Đỏ' : 'Góc Xanh';
      this.speakVietnamese(`Chúc mừng ${sideText}, ${winnerName}, thắng Round ${roundNumber}!`);
    }
  }

  announceMatchWinner(winnerSide: 'red' | 'blue', winnerName: string) {
    const sideText = winnerSide === 'red' ? 'Góc Đỏ' : 'Góc Xanh';
    this.speakVietnamese(`Chiến thắng chung cuộc thuộc về ${sideText}: ${winnerName}!`);
  }
}

export const soundFX = new SoundFXService();
