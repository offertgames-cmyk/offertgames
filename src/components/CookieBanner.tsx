import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Settings2, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  ExternalLink,
  Info
} from 'lucide-react';
import { getStoredCookieConsent, saveCookieConsent } from '../services/adTrackingService';
import { useApp } from '../context/AppContext';

export const CookieBanner: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Preference switches
  const [analytics, setAnalytics] = useState(true);
  const [marketingAds, setMarketingAds] = useState(true);
  const [thirdPartyProfiling, setThirdPartyProfiling] = useState(true);

  useEffect(() => {
    const existing = getStoredCookieConsent();
    if (!existing) {
      // Delay slightly for smoother entrance
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      setAnalytics(existing.analytics);
      setMarketingAds(existing.marketingAds);
      setThirdPartyProfiling(existing.thirdPartyProfiling);
    }

    // Listen for manual trigger to reopen settings
    const handleReopen = () => {
      setIsConfiguring(true);
      setIsVisible(true);
    };
    window.addEventListener('offertgames_reopen_cookie_modal', handleReopen);
    return () => window.removeEventListener('offertgames_reopen_cookie_modal', handleReopen);
  }, []);

  const handleAcceptAll = async () => {
    await saveCookieConsent({
      essential: true,
      analytics: true,
      marketingAds: true,
      thirdPartyProfiling: true
    }, currentUser);
    setIsVisible(false);
    showToast('Preferencias de cookies guardadas. Perfil publicitario activo.');
  };

  const handleRejectAll = async () => {
    await saveCookieConsent({
      essential: true,
      analytics: false,
      marketingAds: false,
      thirdPartyProfiling: false
    }, currentUser);
    setIsVisible(false);
    showToast('Cookies opcionales rechazadas. Solo se usarán cookies técnicas necesarias.');
  };

  const handleSaveCustom = async () => {
    await saveCookieConsent({
      essential: true,
      analytics,
      marketingAds,
      thirdPartyProfiling
    }, currentUser);
    setIsVisible(false);
    showToast('Configuración personalizada de cookies guardada.');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#101722] border border-[#233347] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Banner Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#06b6d4] via-[#f59e0b] to-[#10b981]" />

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Header */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 flex items-center justify-center text-[#22d3ee] shrink-0 shadow-lg shadow-cyan-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Gestión de Cookies y Datos Publicitarios</span>
                <span className="text-[10px] bg-[#f59e0b]/20 text-[#fbbf24] px-2 py-0.5 rounded-full border border-[#f59e0b]/30 font-bold uppercase tracking-wider">
                  RGPD / ePrivacy
                </span>
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                En <strong>OffertGames</strong> utilizamos cookies técnicas esenciales y cookies de personalización de anuncios para registrar tus géneros de videojuegos preferidos (como <span className="text-[#38bdf8] font-bold">Shooters</span>, <span className="text-[#38bdf8] font-bold">Estrategia</span> o <span className="text-[#38bdf8] font-bold">RPG</span>) y favoritos.
              </p>
            </div>
          </div>

          {/* Business Model & Data Sale Disclosure */}
          <div className="bg-[#141e2c] border border-[#223348] rounded-xl p-3.5 text-xs text-gray-300 space-y-2">
            <div className="flex items-center gap-2 text-[#f59e0b] font-bold text-[11px] uppercase tracking-wide">
              <Target className="w-4 h-4 shrink-0" />
              <span>Finalidad comercial y monetización de audiencia</span>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-300">
              Esta información de intereses nos permite crear <strong>segmentos de audiencia anonimizados</strong> que compartimos con redes publicitarias de terceros (como <em>Google AdSense, The Trade Desk o Unity Ads</em>) para financiar la plataforma y mostrarte anuncios de juegos afines en otras webs. Puedes aceptar, configurar o rechazar estas cookies en cualquier momento.
            </p>
          </div>

          {/* Granular Configuration Dropdown */}
          {isConfiguring && (
            <div className="space-y-3 pt-1 border-t border-[#1e2d40] animate-in fade-in duration-200">
              
              {/* 1. Técnicas */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#141b26] border border-[#202d3e]">
                <div className="space-y-0.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Cookies Técnicas Necesarias</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Obligatorias</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Imprescindibles para mantener la sesión abierta, el carrito, seguridad y navegación básica.
                  </p>
                </div>
                <div className="shrink-0">
                  <input type="checkbox" checked disabled className="w-4 h-4 accent-cyan-500 cursor-not-allowed opacity-75" />
                </div>
              </div>

              {/* 2. Analítica */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#141b26] border border-[#202d3e]">
                <div className="space-y-0.5 pr-3">
                  <span className="text-xs font-bold text-white">Cookies de Rendimiento y Analítica</span>
                  <p className="text-[11px] text-gray-400">
                    Miden el tráfico global de la web y tiempos de carga para optimizar el servicio.
                  </p>
                </div>
                <div className="shrink-0">
                  <input 
                    type="checkbox" 
                    checked={analytics} 
                    onChange={e => setAnalytics(e.target.checked)} 
                    className="w-4 h-4 accent-cyan-500 cursor-pointer" 
                  />
                </div>
              </div>

              {/* 3. Perfilado de Géneros y Venta de Anuncios */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#141b26] border border-[#f59e0b]/30">
                <div className="space-y-0.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Perfilado de Géneros y Anuncios de Terceros</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">Monetización</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Almacena tus géneros favoritos (Shooters, Estrategia...) para generar segmentos de audiencia comercializables para partners publicitarios externos.
                  </p>
                </div>
                <div className="shrink-0">
                  <input 
                    type="checkbox" 
                    checked={marketingAds} 
                    onChange={e => {
                      setMarketingAds(e.target.checked);
                      setThirdPartyProfiling(e.target.checked);
                    }} 
                    className="w-4 h-4 accent-cyan-500 cursor-pointer" 
                  />
                </div>
              </div>

            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            
            <button
              onClick={() => setIsConfiguring(!isConfiguring)}
              className="text-xs text-gray-400 hover:text-white font-medium flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-transparent hover:border-[#27384e] transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{isConfiguring ? 'Ocultar opciones' : 'Personalizar cookies'}</span>
              {isConfiguring ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={handleRejectAll}
                className="py-2.5 px-4 rounded-xl bg-[#172230] hover:bg-[#1d2a3c] text-gray-300 hover:text-white border border-[#2b3c50] text-xs font-bold transition-all cursor-pointer text-center"
              >
                Solo Necesarias
              </button>

              {isConfiguring ? (
                <button
                  onClick={handleSaveCustom}
                  className="py-2.5 px-5 rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer text-center"
                >
                  Guardar Preferencias
                </button>
              ) : (
                <button
                  onClick={handleAcceptAll}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#0ea5e9] hover:brightness-110 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Aceptar Todas</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
