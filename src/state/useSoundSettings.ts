import { useState } from 'react';
import { soundFX } from '../services/soundEffects';

export type AudioEffect = 'vote' | 'allVoted' | 'reveal' | 'roundWin' | 'champion' | 'airhorn' | 'buzzer' | 'tick';

const EFFECTS: Record<AudioEffect, () => void> = {
  vote: () => soundFX.playVoteConfirmed(),
  allVoted: () => soundFX.playAllJudgesVotedAlert(),
  reveal: () => soundFX.playRevealSuspense(),
  roundWin: () => soundFX.playRoundWinner(),
  champion: () => soundFX.playChampionFanfare(),
  airhorn: () => soundFX.playHiphopAirhorn(),
  buzzer: () => soundFX.playBuzzer(),
  tick: () => soundFX.playCountTick(),
};

/** Per-device sound settings, mirrored into the soundFX singleton. */
export function useSoundSettings() {
  const [soundEnabled, setEnabled] = useState(true);
  const [soundVolume, setVolume] = useState(0.85);
  const [voiceAnnounceEnabled, setVoice] = useState(true);

  return {
    soundEnabled,
    setSoundEnabled: (val: boolean) => {
      soundFX.enabled = val;
      setEnabled(val);
    },
    soundVolume,
    setSoundVolume: (val: number) => {
      soundFX.volume = val;
      setVolume(val);
    },
    voiceAnnounceEnabled,
    setVoiceAnnounceEnabled: (val: boolean) => {
      soundFX.voiceAnnounceEnabled = val;
      setVoice(val);
    },
    playAudioEffect: (effect: AudioEffect) => EFFECTS[effect](),
  };
}
