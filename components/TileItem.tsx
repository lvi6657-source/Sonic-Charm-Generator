
import React, { useState, useEffect } from 'react';
import { SoundTile } from '../types';
import { audioEngine } from '../services/AudioEngine';

interface TileItemProps {
  tile: SoundTile;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTogglePlay: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMirror: (id: string) => void;
}

const TileItem: React.FC<TileItemProps> = ({ 
  tile, isSelected, onSelect, onTogglePlay, onDelete, onDuplicate, onMirror 
}) => {
  const [currentFreq, setCurrentFreq] = useState(tile.startFreq);
  const [currentVol, setCurrentVol] = useState(tile.startVol);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    let rafId: number;
    if (tile.isPlaying && tile.playStartTime !== undefined) {
      const update = () => {
        const now = audioEngine.getCurrentTime();
        const elapsed = now - tile.playStartTime!;
        
        if (elapsed < 0) {
          setCurrentFreq(tile.startFreq);
          setCurrentVol(tile.startVol);
          setProgressWidth(0);
          rafId = requestAnimationFrame(update);
          return;
        }

        const dur = tile.duration;
        const totalDur = tile.isPingPong ? dur * 2 : dur;
        
        const localTime = tile.isLooping 
          ? (elapsed % totalDur) 
          : Math.min(elapsed, totalDur);
        
        let freq, vol, visualProgress;
        
        if (tile.isPingPong) {
          if (localTime <= dur) {
            const p = localTime / dur;
            freq = tile.startFreq + (tile.endFreq - tile.startFreq) * p;
            vol = tile.startVol + (tile.endVol - tile.startVol) * p;
            visualProgress = p * 100;
          } else {
            const p = (localTime - dur) / dur;
            freq = tile.endFreq + (tile.startFreq - tile.endFreq) * p;
            vol = tile.endVol + (tile.startVol - tile.endVol) * p;
            visualProgress = (1 - p) * 100;
          }
        } else {
          const p = localTime / dur;
          freq = tile.startFreq + (tile.endFreq - tile.startFreq) * p;
          vol = tile.startVol + (tile.endVol - tile.startVol) * p;
          visualProgress = Math.min(p * 100, 100);
        }
        
        setCurrentFreq(Math.round(freq));
        setCurrentVol(vol);
        setProgressWidth(visualProgress);

        rafId = requestAnimationFrame(update);
      };
      rafId = requestAnimationFrame(update);
    } else {
      setCurrentFreq(tile.startFreq);
      setCurrentVol(tile.startVol);
      setProgressWidth(0);
    }
    return () => cancelAnimationFrame(rafId);
  }, [tile.isPlaying, tile.playStartTime, tile.duration, tile.startFreq, tile.endFreq, tile.startVol, tile.endVol, tile.isPingPong, tile.isLooping]);

  const channelLabel = tile.channel === 'left' ? 'L' : tile.channel === 'right' ? 'R' : 'S';

  const formatTime = (seconds: number) => {
    if (tile.isPingPong && tile.isLooping) return '∞';
    if (seconds < 60) return seconds.toFixed(1) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isMenuOpen) {
    return (
      <div className="relative border-r border-b border-[#1a1c24] grid grid-cols-2 grid-rows-2 h-44 bg-[#0d0f17] animate-in fade-in zoom-in duration-150">
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(tile.id); setIsMenuOpen(false); }} className="border-r border-b border-[#1a1c24] text-[11px] font-black uppercase text-[#00f0ff] active:bg-[#00f0ff]/20">COPY</button>
        <button onClick={(e) => { e.stopPropagation(); onMirror(tile.id); setIsMenuOpen(false); }} className="border-b border-[#1a1c24] text-[11px] font-black uppercase text-[#00f0ff] active:bg-[#00f0ff]/20">MIRR</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(tile.id); }} className="border-r border-[#1a1c24] text-[11px] font-black uppercase text-red-500 active:bg-red-500/20">DEL</button>
        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} className="text-[11px] font-black uppercase bg-[#00f0ff] text-black active:bg-[#00d8e6]">BACK</button>
      </div>
    );
  }

  const colors = {
    freq: 'text-[#00f0ff]',
    vol: 'text-[#ffb400]',
    dur: 'text-[#ff00d2]',
    pingpong: 'text-[#00f0ff]'
  };

  return (
    <div 
      onClick={() => onSelect(tile.id)}
      className={`relative p-0 cursor-pointer border-r border-b border-[#1a1c24] flex flex-col h-44 overflow-hidden transition-colors duration-150 ${
        isSelected ? 'bg-[#15171f]' : 'bg-[#0a0c14]'
      }`}
    >
      <div className="flex justify-between items-center px-2 py-1 bg-[#11131c]/90 border-b border-[#1a1c24] z-10 shrink-0">
        <div className={`text-[11px] font-black w-7 ${isSelected ? 'text-white' : 'text-zinc-800'}`}>{channelLabel}</div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onTogglePlay(tile.id); }}
          className={`w-14 h-6 flex items-center justify-center rounded-sm transition-all duration-150 ${
            tile.isPlaying 
              ? 'bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.6)]' 
              : 'bg-[#1a1c24] text-[#00f0ff] hover:text-white border border-[#00f0ff]/20'
          }`}
        >
          {tile.isPlaying ? (
             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
             <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        
        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }} className="text-zinc-700 hover:text-white p-1 w-7 flex justify-end">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-1 py-0 gap-y-0 z-10 font-mono font-black leading-tight overflow-hidden">
        <div className="flex flex-col items-center justify-center w-full min-h-[32px]">
          {tile.isPlaying ? (
            <span className={`text-[24px] ${colors.freq} tracking-tighter`}>{currentFreq}</span>
          ) : (
            <div className="flex items-center gap-1 justify-center w-full opacity-40">
              <span className="text-[24px] text-[#00f0ff]">{tile.startFreq}</span>
              <span className="text-[24px] text-[#00f0ff]">»{tile.endFreq}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center w-full min-h-[32px]">
          {tile.isPlaying ? (
            <span className={`text-[24px] ${colors.vol} tracking-tighter`}>{Math.round(currentVol * 100)}</span>
          ) : (
            <div className="flex items-center gap-1 justify-center w-full opacity-40">
              <span className="text-[24px] text-[#ffb400]">{Math.round(tile.startVol * 100)}</span>
              <span className="text-[24px] text-[#ffb400]">»{Math.round(tile.endVol * 100)}</span>
            </div>
          )}
        </div>

        <div className={`flex items-center justify-center w-full min-h-[32px] text-[24px] ${tile.isPingPong && tile.isLooping ? colors.pingpong : colors.dur}`}>
          {formatTime(tile.duration)}
        </div>
      </div>

      <div className="z-10 bg-[#0c0e16] w-full flex flex-col shrink-0 border-t border-[#1a1c24]">
        <div className="h-2 w-full relative overflow-hidden bg-[#1a1c24]">
          <div 
            className="h-full bg-[#ffb400] opacity-80" 
            style={{ width: `${currentVol * 100}%` }} 
          />
        </div>

        <div className="h-2 w-full bg-[#1a1c24] relative overflow-hidden">
          <div 
            className={`h-full transition-none ${(tile.isPingPong && tile.isLooping) ? 'bg-[#00f0ff]' : 'bg-[#ff00d2]'} opacity-80`} 
            style={{ width: `${progressWidth}%` }} 
          />
        </div>
      </div>
    </div>
  );
};

export default TileItem;
