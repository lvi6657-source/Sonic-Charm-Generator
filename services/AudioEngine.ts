
import { SoundTile, AudioChannel } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private activeChannels: Map<string, AudioChannel> = new Map();
  private globalGain: GainNode | null = null;
  private isMuted: boolean = false;
  
  // Счетчик поколений: увеличивается при каждом Stop All
  private currentGeneration: number = 0;

  private readonly CROSSFADE_TIME = 0.1;

  public async getContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.ctx = new AudioContextClass();
    }
    
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    if (!this.globalGain) {
      this.globalGain = this.ctx.createGain();
      this.globalGain.connect(this.ctx.destination);
      this.globalGain.gain.value = this.isMuted ? 0 : 1;
    }
    
    return this.ctx;
  }

  public getCurrentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.globalGain && this.ctx) {
      this.globalGain.gain.setTargetAtTime(mute ? 0 : 1, this.ctx.currentTime, 0.01);
    }
  }

  public async play(
    tile: SoundTile, 
    onComplete: () => void, 
    onLoop: (endTime: number) => void, 
    startTime?: number,
    sessionId?: number
  ) {
    const ctx = await this.getContext();
    const generationAtStart = this.currentGeneration;
    const now = startTime || ctx.currentTime;
    
    // Если пока мы ждали контекст, поколение сменилось - отбой
    if (generationAtStart !== this.currentGeneration) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();

    // Фиксируем поколение в самом объекте узла
    (osc as any)._generation = generationAtStart;

    gain.gain.setValueAtTime(0, now);
    osc.type = tile.waveType;
    osc.start(now);
    (osc as any)._hasStarted = true;

    const dur = tile.duration;

    if (tile.isPingPong && tile.isLooping) {
      osc.frequency.setValueAtTime(tile.startFreq, now);
      gain.gain.linearRampToValueAtTime(tile.startVol, now + 0.02);
      
      osc.frequency.linearRampToValueAtTime(tile.endFreq, now + dur);
      gain.gain.linearRampToValueAtTime(tile.endVol, now + dur);

      osc.frequency.linearRampToValueAtTime(tile.startFreq, now + dur * 2);
      gain.gain.linearRampToValueAtTime(tile.startVol, now + dur * 2);

      const nextCycleTime = now + dur * 2;
      const timerId = window.setTimeout(() => {
          // Перед циклом проверяем, не устарело ли поколение
          if (this.currentGeneration === generationAtStart) {
            onLoop(nextCycleTime);
          }
      }, Math.max(0, (dur * 2 - 0.05) * 1000));
      
      (osc as any)._loopTimer = timerId;
    } else {
      const endTime = now + dur;
      const fadeOutEndTime = endTime + this.CROSSFADE_TIME;

      osc.frequency.setValueAtTime(tile.startFreq, now);
      osc.frequency.linearRampToValueAtTime(tile.endFreq, endTime);
      
      gain.gain.linearRampToValueAtTime(tile.startVol, now + this.CROSSFADE_TIME);
      gain.gain.linearRampToValueAtTime(tile.endVol, endTime);
      gain.gain.linearRampToValueAtTime(0, fadeOutEndTime);

      if (tile.isLooping) {
        const timerId = window.setTimeout(() => {
            if (this.currentGeneration === generationAtStart) {
                onLoop(endTime);
            }
        }, Math.max(0, (dur - 0.02) * 1000));
        (osc as any)._loopTimer = timerId;
      }
      
      try {
        osc.stop(fadeOutEndTime);
      } catch(e) {}
    }

    let panValue = 0;
    if (tile.channel === 'left') panValue = -1;
    else if (tile.channel === 'right') panValue = 1;
    panner.pan.setValueAtTime(panValue, now);

    osc.connect(gain);
    gain.connect(panner);
    
    // Подключаемся к текущей глобальной шине
    if (this.globalGain) {
        panner.connect(this.globalGain);
    }

    osc.onended = () => {
      const current = this.activeChannels.get(tile.id);
      if (current && current.oscillator === osc) {
        this.activeChannels.delete(tile.id);
      }
      if (!tile.isLooping) onComplete();
    };
    
    this.activeChannels.set(tile.id, {
      oscillator: osc,
      gain: gain,
      panner: panner,
      startTime: now
    });
  }

  public extendMirror(tile: SoundTile, nextStartTime: number, onLoop: (endTime: number) => void) {
    const channel = this.activeChannels.get(tile.id);
    if (!channel) return;

    // Проверка поколения внутри работающего узла
    if ((channel.oscillator as any)._generation !== this.currentGeneration) {
        this.stop(tile.id);
        return;
    }

    const dur = tile.duration;
    channel.oscillator.frequency.linearRampToValueAtTime(tile.endFreq, nextStartTime + dur);
    channel.gain.gain.linearRampToValueAtTime(tile.endVol, nextStartTime + dur);
    
    channel.oscillator.frequency.linearRampToValueAtTime(tile.startFreq, nextStartTime + dur * 2);
    channel.gain.gain.linearRampToValueAtTime(tile.startVol, nextStartTime + dur * 2);

    const nextCycleTime = nextStartTime + dur * 2;
    const generationAtExtend = this.currentGeneration;
    const timerId = window.setTimeout(() => {
        if (this.currentGeneration === generationAtExtend) {
            onLoop(nextCycleTime);
        }
    }, Math.max(0, (dur * 2 - 0.05) * 1000));
    
    if ((channel.oscillator as any)._loopTimer) {
      clearTimeout((channel.oscillator as any)._loopTimer);
    }
    (channel.oscillator as any)._loopTimer = timerId;
  }

  public stop(tileId: string) {
    const channel = this.activeChannels.get(tileId);
    if (channel) {
      if ((channel as any)._isStopping) return;
      (channel as any)._isStopping = true;

      this.activeChannels.delete(tileId);

      if ((channel.oscillator as any)._loopTimer) {
          clearTimeout((channel.oscillator as any)._loopTimer);
      }

      const { oscillator, gain, panner } = channel;
      try {
        const now = this.ctx?.currentTime || 0;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0, now, 0.01); 
        
        setTimeout(() => {
          try {
            oscillator.stop();
            oscillator.disconnect();
            gain.disconnect();
            panner.disconnect();
          } catch (e) {}
        }, 50);
      } catch (e) {}
    }
  }

  /**
   * УЛЬТИМАТИВНЫЙ СБРОС (HARD RESET)
   */
  public stopAll() {
    // 1. Увеличиваем номер поколения. Все старые асинхронные процессы теперь игнорируются.
    this.currentGeneration++;

    // 2. ФИЗИЧЕСКИЙ РАЗРЫВ: Отключаем мастер-шину от колонок
    if (this.globalGain) {
      try {
        this.globalGain.disconnect();
      } catch (e) {}
      this.globalGain = null; // Выбрасываем старую шину, чтобы "зомби" не могли в неё гадить
    }

    // 3. Быстрая остановка всех известных узлов
    this.activeChannels.forEach((channel, id) => {
        if ((channel.oscillator as any)._loopTimer) {
            clearTimeout((channel.oscillator as any)._loopTimer);
        }
        try {
            channel.oscillator.stop();
            channel.oscillator.disconnect();
            channel.gain.disconnect();
        } catch (e) {}
    });
    
    this.activeChannels.clear();

    // 4. Создаем НОВУЮ мастер-шину для следующих запусков
    setTimeout(() => {
        this.getContext(); 
    }, 50);
  }
}

export const audioEngine = new AudioEngine();
