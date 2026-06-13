
import React, { useRef, useState, useEffect, useCallback } from 'react';

interface SwipeSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (val: number | ((prev: number) => number)) => void;
  onLongPress?: () => void;
  valueFormatter?: (val: number) => string;
  sensitivity?: number;
  colorClass?: string;
  barColor?: string;
  disableButtons?: boolean;
}

const SwipeSlider: React.FC<SwipeSliderProps> = ({ 
  value, min, max, step, suffix = '', onChange, onLongPress, valueFormatter, sensitivity = 300, colorClass = 'text-white', barColor = 'bg-cyan-500', disableButtons = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  
  const startX = useRef(0);
  const startVal = useRef(0);
  const hasMoved = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHolding = useRef(false);
  const lastPressTime = useRef(0);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    hasMoved.current = false;
    startX.current = clientX;
    startVal.current = value;

    if (onLongPress) {
      longPressTimeoutRef.current = window.setTimeout(() => {
        if (!hasMoved.current && !isEditing) {
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
          onLongPress();
          setIsDragging(false);
        }
      }, 600);
    }
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const delta = clientX - startX.current;
    
    if (Math.abs(delta) > 5) {
      hasMoved.current = true;
      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
      }
    }

    if (!hasMoved.current) return;

    const range = max - min;
    const rawValue = startVal.current + (delta / sensitivity) * range;
    let newValue = Math.round(rawValue / step) * step;
    newValue = Math.max(min, Math.min(max, newValue));
    
    const precision = step < 1 ? 2 : 0;
    newValue = parseFloat(newValue.toFixed(precision));

    if (newValue !== value) onChange(newValue);
  };

  useEffect(() => {
    const onMove = (e: any) => handleMove(e.clientX || e.touches?.[0]?.clientX);
    const onEnd = () => {
      setIsDragging(false);
      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMove, { passive: false });
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, value, min, max, step, startVal.current]);

  const clearTimers = useCallback(() => {
    isHolding.current = false;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const updateValue = useCallback((dir: number) => {
    onChange((prev) => {
      const currentStep = (prev < 1 || (prev === 1 && dir === -1)) ? 0.1 : 1.0;
      let next = prev + dir * currentStep;
      next = Math.max(min, Math.min(max, next));
      const precision = currentStep < 1 ? 2 : 0;
      return parseFloat(next.toFixed(precision));
    });
  }, [min, max, onChange]);

  const handlePointerDown = (e: React.PointerEvent, dir: number) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const now = Date.now();
    if (now - lastPressTime.current < 80) {
      e.preventDefault();
      return;
    }
    lastPressTime.current = now;
    e.preventDefault();
    e.stopPropagation();
    updateValue(dir); 
    clearTimers();
    isHolding.current = true;
    timeoutRef.current = window.setTimeout(() => {
      if (isHolding.current) {
        intervalRef.current = window.setInterval(() => {
          updateValue(dir);
        }, 50);
      }
    }, 350); 
  };

  const handleClickArea = (e: React.MouseEvent) => {
    if (!hasMoved.current && !isEditing && !isDragging) {
      setIsEditing(true);
      setTempValue(value.toString());
    }
  };

  const commitValue = () => {
    const num = parseFloat(tempValue);
    if (!isNaN(num)) {
      const clamped = Math.max(min, Math.min(max, Math.round(num / step) * step));
      const precision = step < 1 ? 2 : 0;
      onChange(parseFloat(clamped.toFixed(precision)));
    }
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const displayValue = valueFormatter ? valueFormatter(value) : `${value}${suffix}`;

  return (
    <div className="flex items-center w-full h-10 bg-[#0a0c14] select-none overflow-hidden relative border-none">
      {/* Кнопка "минус" - полная высота h-10, сужена до w-8 */}
      <button 
        onPointerDown={(e) => handlePointerDown(e, -1)}
        onPointerUp={clearTimers}
        onPointerLeave={clearTimers}
        className="w-8 h-10 flex items-center justify-center z-20 border-r border-[#1a1c24] outline-none touch-none text-white font-black text-xl active:bg-zinc-800"
      >
        −
      </button>

      <div 
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onClick={handleClickArea}
        className={`flex-1 h-full relative flex flex-col items-center justify-center cursor-ew-resize z-10 ${isDragging ? 'bg-[#11131c]' : ''}`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            className={`w-full h-full bg-[#11131c] text-center font-mono font-black text-[20px] outline-none ${colorClass}`}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={commitValue}
            onKeyDown={(e) => e.key === 'Enter' && commitValue()}
            step={step}
          />
        ) : (
          <>
            <div className={`text-[24px] font-mono font-black ${colorClass} pointer-events-none transition-none`}>
              {displayValue}
            </div>
            <div 
              className={`absolute bottom-0 left-0 h-[8px] ${barColor} opacity-80 pointer-events-none transition-none`} 
              style={{ width: `${((value - min) / (max - min)) * 100}%` }} 
            />
          </>
        )}
      </div>

      {/* Кнопка "плюс" - полная высота h-10, сужена до w-8 */}
      <button 
        onPointerDown={(e) => handlePointerDown(e, 1)}
        onPointerUp={clearTimers}
        onPointerLeave={clearTimers}
        className="w-8 h-10 flex items-center justify-center z-20 border-l border-[#1a1c24] outline-none touch-none text-white font-black text-xl active:bg-zinc-800"
      >
        +
      </button>
    </div>
  );
};

export default SwipeSlider;
