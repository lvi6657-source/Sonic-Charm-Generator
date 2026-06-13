
import React, { useState, useCallback, useRef } from 'react';
import { SoundTile } from './types';
import { audioEngine } from './services/AudioEngine';
import Workspace from './components/Workspace';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  const [tiles, setTiles] = useState<SoundTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const tilesRef = useRef<SoundTile[]>([]);
  tilesRef.current = tiles;

  const playSessionRef = useRef(0);
  const shouldBePlaying = useRef<Set<string>>(new Set());

  const updateTile = useCallback((id: string, updates: Partial<SoundTile> | ((prev: SoundTile) => Partial<SoundTile>)) => {
    setTiles(prev => prev.map(t => {
      if (t.id === id) {
        const up = typeof updates === 'function' ? updates(t) : updates;
        return { ...t, ...up };
      }
      return t;
    }));
  }, []);

  const createTile = () => {
    const newId = Math.random().toString(36).substring(2, 11);
    const newTile: SoundTile = {
      id: newId,
      name: `UNIT-${tiles.length + 1}`,
      startFreq: 440,
      endFreq: 880,
      startVol: 0.5,
      endVol: 0.1,
      duration: 2.0,
      waveType: 'sine',
      channel: 'both',
      isPlaying: false,
      isLooping: false,
      isPingPong: false,
    };
    setTiles(prev => [...prev, newTile]);
    setSelectedTileId(newId);
  };

  const duplicateTile = (id: string) => {
    const original = tiles.find(t => t.id === id);
    if (!original) return;
    const newId = Math.random().toString(36).substring(2, 11);
    const copy: SoundTile = {
      ...original,
      id: newId,
      name: `${original.name.split(' ')[0]} +`,
      isPlaying: false,
      playStartTime: undefined
    };
    setTiles(prev => [...prev, copy]);
    setSelectedTileId(newId);
  };

  const mirrorTile = (id: string) => {
    const original = tiles.find(t => t.id === id);
    if (!original) return;
    const newId = Math.random().toString(36).substring(2, 11);
    let newChannel = original.channel;
    if (original.channel === 'left') newChannel = 'right';
    else if (original.channel === 'right') newChannel = 'left';

    const copy: SoundTile = {
      ...original,
      id: newId,
      name: `${original.name.split(' ')[0]} M`,
      channel: newChannel,
      isPlaying: false,
      playStartTime: undefined
    };
    setTiles(prev => [...prev, copy]);
    setSelectedTileId(newId);
  };

  const deleteTile = (id: string) => {
    shouldBePlaying.current.delete(id);
    audioEngine.stop(id);
    setTiles(prev => prev.filter(t => t.id !== id));
    if (selectedTileId === id) setSelectedTileId(null);
  };

  const startPlayback = useCallback((tile: SoundTile, scheduledCtxTime?: number, isContinuation = false) => {
    const currentSession = playSessionRef.current;
    shouldBePlaying.current.add(tile.id);

    audioEngine.getContext().then(ctx => {
      // ПРОВЕРКА СЕССИИ: Если был нажат Стоп пока мы ждали контекст
      if (currentSession !== playSessionRef.current || !shouldBePlaying.current.has(tile.id)) {
        return; 
      }

      const startTime = scheduledCtxTime || ctx.currentTime;
      
      if (!isContinuation) {
        updateTile(tile.id, { isPlaying: true, playStartTime: startTime });
      } else {
        updateTile(tile.id, { isPlaying: true });
      }
      
      audioEngine.play(tile, 
        () => {
          shouldBePlaying.current.delete(tile.id);
          setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, isPlaying: false, playStartTime: undefined } : t));
        },
        (endTime) => handleLoop(tile.id, endTime, currentSession),
        startTime,
        currentSession
      );
    });
  }, [updateTile]);

  const handleLoop = useCallback((tileId: string, nextStartTime: number, sessionAtStart: number) => {
    if (sessionAtStart !== playSessionRef.current || !shouldBePlaying.current.has(tileId)) {
      return;
    }

    const currentTiles = tilesRef.current;
    const tile = currentTiles.find(t => t.id === tileId);
    if (!tile || !tile.isPlaying || !tile.isLooping) return;

    if (tile.isPingPong) {
      audioEngine.extendMirror(tile, nextStartTime, (next) => handleLoop(tileId, next, sessionAtStart));
    } else {
      startPlayback(tile, nextStartTime, true);
    }
  }, [startPlayback]);

  const togglePlay = (id: string) => {
    const tile = tiles.find(t => t.id === id);
    if (!tile) return;

    if (tile.isPlaying) {
      shouldBePlaying.current.delete(id);
      audioEngine.stop(id);
      updateTile(id, { isPlaying: false, playStartTime: undefined });
    } else {
      startPlayback(tile);
    }
  };

  const playAll = async () => {
    // При старте всех тоже обновляем сессию для чистоты
    playSessionRef.current++; 
    audioEngine.stopAll();
    
    const ctx = await audioEngine.getContext();
    const syncTime = ctx.currentTime + 0.15; 
    
    tiles.forEach(tile => {
      startPlayback(tile, syncTime);
    });
  };

  const stopAll = () => {
    // Мгновенная блокировка всех будущих асинхронных операций
    playSessionRef.current++; 
    shouldBePlaying.current.clear();
    audioEngine.stopAll();
    setTiles(prev => prev.map(t => ({ ...t, isPlaying: false, playStartTime: undefined })));
  };

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    audioEngine.setMute(newMute);
  };

  const selectedTile = tiles.find(t => t.id === selectedTileId) || null;
  const anyPlaying = tiles.some(t => t.isPlaying);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0c14] text-zinc-100 font-sans overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 border-b border-[#1e293b] bg-[#0a0c14] z-30 shrink-0">
        <div className="flex flex-col">
          <h1 className="text-[13px] font-black tracking-widest uppercase text-white">CHARM-OS v2</h1>
          <span className="text-[9px] text-cyan-900 font-bold uppercase tracking-tighter">TECHNICAL SWEEP GENERATOR</span>
        </div>
        
        <div className="flex gap-2">
          <button onClick={toggleMute} className={`w-10 h-10 border border-[#1e293b] flex items-center justify-center transition-colors ${isMuted ? 'bg-red-950 text-red-500 border-red-900 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]' : 'bg-[#0f172a] text-zinc-600'}`}>
             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" /></svg>
          </button>
          
          <button onClick={createTile} className="bg-cyan-500 text-black px-5 h-10 font-black text-[13px] uppercase active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-400 transition-colors">+ ADD CH</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Workspace 
          tiles={tiles} 
          selectedId={selectedTileId} 
          onSelect={setSelectedTileId} 
          onTogglePlay={togglePlay}
          onDelete={deleteTile}
          onDuplicate={duplicateTile}
          onMirror={mirrorTile}
        />
      </div>

      <div className="shrink-0 bg-[#0a0c14]">
        {selectedTile ? (
          <ControlPanel 
            tile={selectedTile} 
            onChange={(updates) => updateTile(selectedTile.id, updates)} 
            onPlayAll={playAll}
            onStopAll={stopAll}
            isAnyPlaying={anyPlaying}
          />
        ) : (
          <div className="h-44 flex flex-col items-center justify-center border-t border-[#1e293b] bg-[#0a0c14] text-cyan-900">
             <div className="text-[11px] font-black uppercase tracking-widest mb-4 opacity-50">SELECT A CHANNEL UNIT</div>
             <button 
                onClick={anyPlaying ? stopAll : playAll}
                className={`px-8 h-12 font-black uppercase text-[13px] tracking-widest transition-all ${
                  anyPlaying ? 'bg-red-500 text-white' : 'bg-white text-black hover:bg-cyan-400'
                }`}
             >
                {anyPlaying ? 'GLOBAL STOP' : 'GLOBAL START'}
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
