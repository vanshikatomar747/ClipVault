import { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Square } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
      setProgress(audioRef.current.currentTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-zinc-900 text-white p-4 rounded-2xl shadow-xl flex flex-col gap-4">
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(duration);
        }}
      />
      
      {/* Progress Bar */}
      <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
        <span>{formatTime(progress)}</span>
        <input 
          type="range" 
          min="0" 
          max={duration || 100} 
          value={progress}
          onChange={(e) => {
            const val = Number(e.target.value);
            setProgress(val);
            if (audioRef.current) audioRef.current.currentTime = val;
          }}
          className="flex-1 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer"
        />
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={stop} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
            <Square className="w-4 h-4 fill-current" />
          </button>
          <button onClick={() => skip(-10)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button onClick={togglePlay} className="p-3 bg-cv-sage hover:bg-cv-olive rounded-full transition-all text-white shadow-lg transform hover:scale-105">
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>
          <button onClick={() => skip(10)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        <div className="flex items-center gap-2 relative">
          <button 
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="px-2 py-1 text-xs font-bold bg-zinc-800 rounded hover:bg-zinc-700 transition-colors"
          >
            {speed}x
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden text-xs z-10">
              {[0.75, 1, 1.25, 1.5, 2].map(s => (
                <button 
                  key={s} 
                  onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                  className={`block w-full text-left px-4 py-2 hover:bg-zinc-700 ${speed === s ? 'text-cv-sage font-bold' : 'text-zinc-300'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
