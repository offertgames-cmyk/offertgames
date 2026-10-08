import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Monitor, 
  Smartphone, 
  RotateCw, 
  ZoomIn, 
  Wifi, 
  BatteryMedium, 
  Signal, 
  Maximize2, 
  Minimize2,
  ChevronDown
} from 'lucide-react';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileSimulatorProps {
  children: React.ReactNode;
}

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({ children }) => {
  const { 
    viewMode, 
    setViewMode, 
    mobileDevice, 
    setMobileDevice, 
    isMobileRotated, 
    setIsMobileRotated,
    mobileScale,
    setMobileScale 
  } = useApp();

  const [currentTime, setCurrentTime] = useState('12:30');
  const [isWindowMobile, setIsWindowMobile] = useState(false);

  // Detect real mobile screens
  useEffect(() => {
    const checkScreen = () => {
      setIsWindowMobile(window.innerWidth < 640);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Update status bar time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Device dimension map
  const deviceSpecs = {
    iphone: { name: 'iPhone 16 Pro', width: 393, height: 852 },
    samsung: { name: 'Galaxy S24', width: 412, height: 915 },
    fluid: { name: 'Móvil Completo (Fluido)', width: 480, height: 890 }
  };

  const currentSpec = deviceSpecs[mobileDevice];
  const width = isMobileRotated ? currentSpec.height : currentSpec.width;
  const height = isMobileRotated ? currentSpec.width : currentSpec.height;

  // If on actual mobile device screen, render native mobile view without simulator frame
  if (isWindowMobile) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-gray-100 flex flex-col font-sans">
        <MobileHeader />
        <main className="flex-1 pb-16 overflow-x-hidden">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a0f] text-gray-100 flex flex-col font-sans select-none">
      
      {/* TOP SIMULATOR CONTROLS BAR (Desktop Helper) */}
      <div className="sticky top-0 z-50 bg-[#0f141d] border-b border-[#1c2738] px-4 py-2.5 shadow-xl flex items-center justify-between gap-4">
        
        {/* Left: View Mode Indicator + Back to PC Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold">
            <Smartphone className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>VISTA MÓVIL ACTIVA</span>
          </div>

          <button
            onClick={() => setViewMode('pc')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0284c7] text-black font-extrabold text-xs transition-all shadow-md shadow-cyan-500/20 hover:scale-105"
            title="Regresar a la vista normal de ordenador"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Volver a Vista PC</span>
          </button>
        </div>

        {/* Center: Device Selector & Rotation */}
        <div className="flex items-center gap-2 bg-[#141b27] p-1 rounded-xl border border-[#223145] text-xs">
          <button
            onClick={() => setMobileDevice('iphone')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              mobileDevice === 'iphone'
                ? 'bg-[#1e2a3d] text-white font-bold shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            iPhone 16 Pro
          </button>

          <button
            onClick={() => setMobileDevice('samsung')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              mobileDevice === 'samsung'
                ? 'bg-[#1e2a3d] text-white font-bold shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Galaxy S24
          </button>

          <button
            onClick={() => setMobileDevice('fluid')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              mobileDevice === 'fluid'
                ? 'bg-[#1e2a3d] text-white font-bold shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Fluido
          </button>

          <div className="h-4 w-px bg-[#26354a] mx-1"></div>

          {/* Rotate screen */}
          <button
            onClick={() => setIsMobileRotated(!isMobileRotated)}
            title="Girar pantalla (Vertical / Horizontal)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              isMobileRotated
                ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isMobileRotated ? 'rotate-90 text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">{isMobileRotated ? 'Horizontal' : 'Vertical'}</span>
          </button>

          <div className="h-4 w-px bg-[#26354a] mx-1"></div>

          {/* Scale controls */}
          <button
            onClick={() => setMobileScale(mobileScale === 1 ? 0.9 : mobileScale === 0.9 ? 0.8 : 1)}
            title="Ajustar tamaño en pantalla"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-gray-300 hover:text-white"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">{Math.round(mobileScale * 100)}%</span>
          </button>
        </div>

        {/* Right: Quick Help */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Simulación exacta de smartphone</span>
        </div>

      </div>

      {/* SIMULATOR STAGE - Centered Device with Realistic Chassis */}
      <div className="flex-1 py-8 px-4 flex items-center justify-center overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111927] via-[#090d14] to-[#040609]">
        
        {/* Outer Smartphone Shell */}
        <div 
          style={{ 
            width: `${width}px`, 
            height: `${height}px`,
            transform: `scale(${mobileScale})`,
            transformOrigin: 'top center'
          }}
          className="relative transition-all duration-300 ease-out shrink-0 rounded-[48px] border-[10px] border-[#1d2638] bg-[#0b0e14] shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(56,189,248,0.12)] ring-2 ring-[#2e3e57] flex flex-col overflow-hidden"
        >

          {/* Side volume / power button accents (CSS mock) */}
          <div className="absolute -left-[14px] top-28 w-[4px] h-10 bg-[#313f56] rounded-l-md pointer-events-none"></div>
          <div className="absolute -left-[14px] top-42 w-[4px] h-10 bg-[#313f56] rounded-l-md pointer-events-none"></div>
          <div className="absolute -right-[14px] top-32 w-[4px] h-14 bg-[#313f56] rounded-r-md pointer-events-none"></div>

          {/* TOP STATUS BAR & DYNAMIC ISLAND */}
          <div className="relative h-11 bg-[#0f141c] shrink-0 px-6 flex items-center justify-between text-white text-xs font-semibold select-none z-30 border-b border-[#17202c]">
            {/* Clock */}
            <span className="font-sans text-[11px] font-bold tracking-tight text-gray-200">
              {currentTime}
            </span>

            {/* Dynamic Island / Notch */}
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-6 w-28 bg-black rounded-full flex items-center justify-end px-2.5 gap-2 border border-[#232d3d] shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-[#111827] border border-[#374151] flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-[#1e40af]/60"></span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#052e16] border border-[#166534]/50"></span>
            </div>

            {/* Status Icons: Signal, Wifi, Battery */}
            <div className="flex items-center gap-2 text-gray-300">
              <Signal className="w-3.5 h-3.5 text-gray-200" />
              <Wifi className="w-3.5 h-3.5 text-gray-200" />
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono font-medium">98%</span>
                <div className="w-5 h-2.5 rounded-sm border border-gray-400 p-0.5 flex items-center">
                  <div className="w-full h-full bg-emerald-400 rounded-2xs"></div>
                </div>
              </div>
            </div>
          </div>

          {/* INNER MOBILE SCREEN: Header, Scrollable Content, Bottom Nav */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0e14]">
            {/* Mobile Header */}
            <MobileHeader />

            {/* Scrollable View Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth" id="mobile-scroll-container">
              <div className="min-h-full pb-6">
                {children}
              </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />

            {/* Bottom Home Indicator Pill */}
            <div className="h-4 bg-[#0d131d] flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-white/30 rounded-full"></div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
