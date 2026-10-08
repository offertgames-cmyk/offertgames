import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, title }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fallbackToYoutube, setFallbackToYoutube] = useState(false);

  const isYoutube = src?.includes('youtube.com') || src?.includes('youtu.be') || fallbackToYoutube;

  useEffect(() => {
    setHasError(false);
    setIsPlaying(false);
    setFallbackToYoutube(false);

    if (src?.includes('youtube.com') || src?.includes('youtu.be')) {
      return;
    }

    const video = videoRef.current;
    if (!video || !src) return;

    // Clean up previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = src.includes('.m3u8') || src.includes('hls_264');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setHasError(true);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support
      video.src = src;
    } else {
      // Regular video (mp4/webm)
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      video.requestFullscreen().catch(() => {});
    }
  };

  if (isYoutube) {
    let embedUrl = src;
    if (fallbackToYoutube || !src || (!src.includes('youtube.com') && !src.includes('youtu.be'))) {
      embedUrl = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent((title || 'Videojuego') + ' trailer oficial')}&autoplay=1&mute=0`;
    } else if (src.includes('watch?v=')) {
      const v = src.split('watch?v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&mute=0&rel=0`;
    } else if (src.includes('youtu.be/')) {
      const v = src.split('youtu.be/')[1]?.split('?')[0];
      embedUrl = `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&mute=0&rel=0`;
    } else if (!embedUrl.includes('autoplay=')) {
      embedUrl = embedUrl + (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1&mute=0&rel=0';
    }

    return (
      <div className="relative w-full h-full min-h-[300px] bg-black rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
        <iframe
          src={embedUrl}
          title={title || 'Tráiler Oficial'}
          className="w-full h-full absolute inset-0 border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full h-full min-h-[300px] bg-black/90 rounded-xl flex flex-col items-center justify-center p-6 text-center space-y-3">
        {poster && (
          <img src={poster} alt="" className="w-full h-full absolute inset-0 object-cover opacity-20 pointer-events-none" />
        )}
        <AlertCircle className="w-8 h-8 text-amber-400 relative z-10" />
        <p className="text-sm font-semibold text-white relative z-10">
          El tráiler oficial se está actualizando desde los servidores de Steam.
        </p>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setFallbackToYoutube(true)}
            className="px-4 py-1.5 bg-[#06b6d4] text-black font-bold text-xs rounded-lg hover:bg-cyan-400 transition-colors"
          >
            Ver tráiler oficial en YouTube
          </button>
          <button
            onClick={() => {
              setHasError(false);
              if (videoRef.current) videoRef.current.load();
            }}
            className="px-4 py-1.5 bg-[#1e293b] text-gray-200 font-bold text-xs rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reintentar Steam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full bg-black rounded-xl overflow-hidden group flex items-center justify-center"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
      />

      {/* Big Center Play Button Overlay when paused */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#06b6d4]/90 hover:bg-[#06b6d4] text-black flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 z-20"
          title="Reproducir tráiler"
        >
          <Play className="w-8 h-8 fill-black translate-x-0.5" />
        </button>
      )}

      {/* Top Title Bar */}
      {title && (
        <div className={`absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 z-10 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-xs font-bold text-white drop-shadow truncate block">
            {title}
          </span>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className={`absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between gap-3 text-white transition-opacity duration-300 z-10 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="p-1.5 hover:text-[#06b6d4] transition-colors"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 hover:text-[#06b6d4] transition-colors"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-1.5 hover:text-[#06b6d4] transition-colors"
          title="Pantalla completa"
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
