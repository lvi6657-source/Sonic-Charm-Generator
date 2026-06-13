
import React from 'react';
import { SoundTile, WaveType, ChannelMode } from '../types';
import SwipeSlider from './SwipeSlider';

interface ControlPanelProps {
  tile: SoundTile;
  onChange: (updates: Partial<SoundTile> | ((prev: SoundTile) => Partial<SoundTile>)) => void;
  onPlayAll: () => void;
  onStopAll: () => void;
  isAnyPlaying: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ tile, onChange, onPlayAll, onStopAll, isAnyPlaying }) => {
  const toggleWave = () => {
    onChange(prev => ({ waveType: (['sine', 'square', 'sawtooth', 'triangle'] as WaveType[])[(['sine', 'square', 'sawtooth', 'triangle'].indexOf(prev.waveType) + 1) % 4] }));
  };

  const toggleLoop = () => {
    onChange(prev => ({ isLooping: !prev.isLooping }));
  };

  const togglePingPong = () => {
    onChange(prev => ({ isPingPong: !prev.isPingPong }));
  };

  const setChannel = (mode: ChannelMode) => {
    onChange({ channel: mode });
  };

  const handleFreqChange = (key: 'startFreq' | 'endFreq', val: number | ((prev: number) => number)) => {
    onChange(prev => {
      const currentVal = prev[key];
      const nextVal = typeof val === 'number' ? val : val(currentVal);
      return { [key]: nextVal };
    });
  };

  const handleVolChange = (key: 'startVol' | 'endVol', val: number | ((prev: number) => number)) => {
    onChange(prev => {
      const currentValIn100 = Math.round(prev[key] * 100);
      const nextValIn100 = typeof val === 'number' ? val : val(currentValIn100);
      const nextValNormalized = nextValIn100 / 100;
      return { [key]: nextValNormalized };
    });
  };

  const formatTime = (seconds: number) => {
    if (seconds < 1) return seconds.toFixed(1) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const colors = {
    cyan: '#00f0ff',
    amber: '#ffb400',
    magenta: '#ff00d2'
  };

  const durationStep = tile.duration < 1 ? 0.1 : 1.0;

  return (
    <div className="flex flex-col bg-[#0a0c14] border-t border-[#1a1c24] w-full">
      {/* Top Header Row: Channel Selectors (Left) and Launch All (Right) */}
      <div className="grid grid-cols-2 border-b border-[#1a1c24]">
        <div className="flex h-10 border-r border-[#1a1c24]">
          <button 
            onClick={() => setChannel('left')}
            className={`flex-1 text-[11px] font-black uppercase transition-all border-r border-[#1a1c24] ${
              tile.channel === 'left' ? 'bg-[#00f0ff] text-black' : 'text-zinc-600 active:bg-zinc-900'
            }`}
          >
            L
          </button>
          <button 
            onClick={() => setChannel('both')}
            className={`flex-1 text-[11px] font-black uppercase transition-all border-r border-[#1a1c24] ${
              tile.channel === 'both' ? 'bg-[#00f0ff] text-black' : 'text-zinc-600 active:bg-zinc-900'
            }`}
          >
            ST
          </button>
          <button 
            onClick={() => setChannel('right')}
            className={`flex-1 text-[11px] font-black uppercase transition-all ${
              tile.channel === 'right' ? 'bg-[#00f0ff] text-black' : 'text-zinc-600 active:bg-zinc-900'
            }`}
          >
            R
          </button>
        </div>
        <button 
          onClick={isAnyPlaying ? onStopAll : onPlayAll}
          className={`h-10 flex items-center justify-center text-[12px] font-black uppercase tracking-widest transition-all ${
            isAnyPlaying ? 'bg-white text-black' : `bg-[#11131c]`
          }`}
          style={{ color: !isAnyPlaying ? colors.cyan : undefined }}
        >
          {isAnyPlaying ? 'KILL ALL' : 'LAUNCH ALL'}
        </button>
      </div>

      <div className="grid grid-cols-2">
        {/* Left Column: Frequencies and Duration */}
        <div className="flex flex-col border-r border-[#1a1c24]">
          <SwipeSlider 
            value={tile.startFreq} 
            min={20} max={16000} step={1} 
            colorClass="text-[#00f0ff]"
            barColor="bg-[#00f0ff]"
            onChange={(v) => handleFreqChange('startFreq', v)}
            onLongPress={() => onChange({ startFreq: tile.endFreq })}
          />
          <SwipeSlider 
            value={tile.endFreq} 
            min={20} max={16000} step={1} 
            colorClass="text-[#00f0ff]"
            barColor="bg-[#00f0ff]"
            onChange={(v) => handleFreqChange('endFreq', v)}
            onLongPress={() => onChange({ endFreq: tile.startFreq })}
          />
          <SwipeSlider 
            value={tile.duration} 
            min={0.1} max={600} step={durationStep} 
            valueFormatter={formatTime}
            colorClass="text-[#ff00d2]"
            barColor="bg-[#ff00d2]"
            onChange={(v) => typeof v === 'number' ? onChange({ duration: v }) : onChange(prev => ({ duration: v(prev.duration) }))} 
          />
        </div>

        {/* Right Column: Volumes and Type/Loop/Mirror Buttons */}
        <div className="flex flex-col">
          <SwipeSlider 
            value={Math.round(tile.startVol * 100)} 
            min={0} max={100} step={1} 
            colorClass="text-[#ffb400]"
            barColor="bg-[#ffb400]"
            onChange={(v) => handleVolChange('startVol', v)}
            onLongPress={() => onChange({ startVol: tile.endVol })}
          />
          <SwipeSlider 
            value={Math.round(tile.endVol * 100)} 
            min={0} max={100} step={1} 
            colorClass="text-[#ffb400]"
            barColor="bg-[#ffb400]"
            onChange={(v) => handleVolChange('endVol', v)}
            onLongPress={() => onChange({ endVol: tile.startVol })}
          />
          
          {/* Bottom Row of 2nd Column: Wave, Loop, and Mirror buttons in sequence */}
          <div className="flex h-10 bg-[#0a0c14]">
            <button onClick={toggleWave} className="flex-1 border-r border-[#1a1c24] flex items-center justify-center text-zinc-500 text-[10px] font-black uppercase active:bg-zinc-900 transition-colors">
              {tile.waveType.substring(0, 3)}
            </button>
            <button onClick={toggleLoop} className={`flex-1 border-r border-[#1a1c24] flex items-center justify-center text-[10px] font-black uppercase transition-all ${tile.isLooping ? 'bg-[#ff00d2] text-black' : 'text-zinc-700 active:bg-zinc-900'}`}>
              {tile.isLooping ? 'LOOP' : 'ONCE'}
            </button>
            <button onClick={togglePingPong} className={`flex-1 flex items-center justify-center text-[10px] font-black uppercase transition-all ${tile.isPingPong ? 'bg-[#00f0ff] text-black' : 'text-zinc-700 active:bg-zinc-900'}`}>
              {tile.isPingPong ? 'MIRR' : 'NORM'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
