
export type WaveType = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type ChannelMode = 'left' | 'right' | 'both';

export interface SoundTile {
  id: string;
  name: string;
  startFreq: number;
  endFreq: number;
  startVol: number;
  endVol: number;
  duration: number;
  waveType: WaveType;
  channel: ChannelMode;
  isPlaying: boolean;
  isLooping: boolean;
  isPingPong: boolean;
  playStartTime?: number;
}

export interface AudioChannel {
  oscillator: OscillatorNode;
  gain: GainNode;
  panner: StereoPannerNode;
  startTime: number;
}
