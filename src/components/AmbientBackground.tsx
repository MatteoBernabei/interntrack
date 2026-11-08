import React from 'react';
import { useInternTrack } from '../context/InternTrackContext';

export const AmbientBackground: React.FC = () => {
  const { settings } = useInternTrack();
  const isDark = settings?.theme === 'scuro';

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Japandi High-Res Interior Photographic Background */}
      <img
        src="/assets/japandi_bg.jpg"
        alt="Japandi Background"
        className={`w-full h-full object-cover object-center transform scale-105 transition-all duration-700 ${
          isDark ? 'brightness-[0.38] contrast-[1.12] filter blur-[0.8px]' : 'filter blur-[0.5px]'
        }`}
      />
      {/* Subtle warm ambient lighting and vignette overlay for optimal glass contrast */}
      <div className={`absolute inset-0 transition-colors duration-500 ${
        isDark ? 'bg-slate-950/70' : 'bg-gradient-to-t from-black/30 via-transparent to-black/20'
      }`} />
      {!isDark && <div className="absolute inset-0 bg-[#e8ded3]/25 mix-blend-multiply" />}
      {/* Soft cove light accent */}
      <div 
        className={`absolute top-0 inset-x-0 h-40 blur-2xl transition-opacity duration-500 ${
          isDark 
            ? 'bg-gradient-to-b from-blue-950/30 via-indigo-950/15 to-transparent' 
            : 'bg-gradient-to-b from-amber-200/20 via-amber-100/10 to-transparent'
        }`} 
        style={{ transform: 'translate3d(0, 0, 0)' }}
      />
    </div>
  );
};

