
import React from 'react';
import { SoundTile } from '../types';
import TileItem from './TileItem';

interface WorkspaceProps {
  tiles: SoundTile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTogglePlay: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMirror: (id: string) => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ 
  tiles, selectedId, onSelect, onTogglePlay, onDelete, onDuplicate, onMirror 
}) => {
  if (tiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-800 text-[13px] font-black uppercase tracking-widest animate-pulse">
        No Active Channels
      </div>
    );
  }

  const leftTiles = tiles.filter(t => t.channel === 'left');
  const midTiles = tiles.filter(t => t.channel === 'both');
  const rightTiles = tiles.filter(t => t.channel === 'right');

  const maxRows = Math.max(leftTiles.length, midTiles.length, rightTiles.length);

  return (
    <div className="grid grid-cols-3 h-full overflow-y-auto bg-[#0a0c14] scroll-smooth">
      {/* Column Headers - Lighter text */}
      <div className="sticky top-0 z-20 col-span-3 grid grid-cols-3 border-b border-[#1e293b] bg-[#0a0c14]/90 backdrop-blur-md">
        <div className="py-2 text-[10px] font-black text-cyan-600 uppercase text-center tracking-tighter border-r border-[#1e293b]">CH LEFT</div>
        <div className="py-2 text-[10px] font-black text-cyan-600 uppercase text-center tracking-tighter border-r border-[#1e293b]">STEREO</div>
        <div className="py-2 text-[10px] font-black text-cyan-600 uppercase text-center tracking-tighter">CH RIGHT</div>
      </div>

      {Array.from({ length: maxRows }).map((_, rowIdx) => (
        <React.Fragment key={rowIdx}>
          <div className="border-r border-[#1e293b] min-h-[160px]">
            {leftTiles[rowIdx] && (
              <TileItem 
                tile={leftTiles[rowIdx]}
                isSelected={selectedId === leftTiles[rowIdx].id}
                onSelect={onSelect}
                onTogglePlay={onTogglePlay}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onMirror={onMirror}
              />
            )}
          </div>
          <div className="border-r border-[#1e293b] min-h-[160px]">
            {midTiles[rowIdx] && (
              <TileItem 
                tile={midTiles[rowIdx]}
                isSelected={selectedId === midTiles[rowIdx].id}
                onSelect={onSelect}
                onTogglePlay={onTogglePlay}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onMirror={onMirror}
              />
            )}
          </div>
          <div className="min-h-[160px]">
            {rightTiles[rowIdx] && (
              <TileItem 
                tile={rightTiles[rowIdx]}
                isSelected={selectedId === rightTiles[rowIdx].id}
                onSelect={onSelect}
                onTogglePlay={onTogglePlay}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onMirror={onMirror}
              />
            )}
          </div>
        </React.Fragment>
      ))}
      <div className="h-20 col-span-3"></div>
    </div>
  );
};

export default Workspace;
