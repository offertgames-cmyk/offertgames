import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Menu, 
  X, 
  Search, 
  Shield, 
  LogOut, 
  RefreshCw, 
  User as UserIcon, 
  Bell, 
  Monitor, 
  Smartphone, 
  Award,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Flame,
  Gamepad2,
  Users,
  Bot,
  Headphones,
  Mail,
  Copy,
  Send
} from 'lucide-react';
import { ViewTab } from '../types/game';
import { NotificationDropdown } from './NotificationDropdown';
import { DonorBadge } from './DonorBadge';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setSelectedGame,
    searchQuery,
    setSearchQuery,
    currentUser,
    openAuthModal,
    logout,
    refreshSteamPrices,
    isSyncing,
    unreadNotificationsCount,
    openAlertModal,
    viewMode,
    setViewMode,
    openDonationModal,
    openProfileModal,
    openSupportModal,
    showToast
  } = useApp();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleNav = (tab: ViewTab) => {
    setSelectedGame(null);
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* ==================================================================== */}
      {/* BARRA SUPERIOR PRINCIPAL (Limpia y simplificada)                      */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-[#0f141c]/95 backdrop-blur-md border-b border-[#1f2838] px-4 lg:px-8 py-3 select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Izquierda: Botón Menú Lateral Desplegable + Logo + Navegación */}
          <div className="flex items-center gap-4">
            
            {/* BOTÓN DESPLEGABLE DE LA BARRA LATERAL (Arriba Izquierda) */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              title="Abrir panel lateral de opciones, cuenta y configuración"
              className="p-2 -ml-1 rounded-xl bg-[#141b26] hover:bg-[#1c2636] border border-[#233247] hover:border-[#38bdf8]/50 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 group shadow-sm active:scale-95"
            >
              <Menu className="w-5 h-5 text-[#38bdf8] group-hover:rotate-90 transition-transform duration-200" />
              <span className="text-xs font-bold text-gray-300 group-hover:text-white hidden sm:inline">Menú</span>
              {unreadNotificationsCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] ring-2 ring-[#0f141c] animate-pulse" />
              )}
            </button>

            {/* Logo y Marca */}
            <div 
              onClick={() => handleNav('ofertas')}
              className="flex items-center gap-2.5 cursor-pointer group shrink-0"
            >
              <div className="w-9 h-9 flex items-center justify-center transition-transform group-hover:scale-105">
                <img 
                  src="/logo.png" 
                  alt="OffertGames" 
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
                />
              </div>
              <span className="font-extrabold tracking-wider text-lg sm:text-xl text-white font-sans uppercase">
                OFFERT<span className="text-[#38bdf8]">GAMES</span>
              </span>
            </div>

            {/* Pestañas de Navegación Principal en el Header */}
            <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-300 ml-4">
              <button
                onClick={() => handleNav('ofertas')}
                className={`transition-colors relative py-1 hover:text-white cursor-pointer ${
                  activeTab === 'ofertas' ? 'text-white font-bold' : 'text-gray-400'
                }`}
              >
                Ofertas
                {activeTab === 'ofertas' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#38bdf8] rounded-full"></span>
                )}
              </button>
              
              <button
                onClick={() => handleNav('juegos')}
                className={`transition-colors relative py-1 hover:text-white cursor-pointer ${
                  activeTab === 'juegos' ? 'text-white font-bold' : 'text-gray-400'
                }`}
              >
                Juegos
                {activeTab === 'juegos' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#38bdf8] rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => handleNav('comunidades')}
                className={`transition-colors relative py-1 hover:text-white cursor-pointer ${
                  activeTab === 'comunidades' ? 'text-white font-bold' : 'text-gray-400'
                }`}
              >
                Comunidades
                {activeTab === 'comunidades' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#38bdf8] rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => handleNav('avisos')}
                className={`transition-colors relative py-1 hover:text-white cursor-pointer ${
                  activeTab === 'avisos' ? 'text-white font-bold' : 'text-gray-400'
                }`}
              >
                Avisos
                {activeTab === 'avisos' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#38bdf8] rounded-full"></span>
                )}
              </button>
            </nav>
          </div>

          {/* Derecha del Header: Acceso Rápido al Menú Lateral */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141b26]/70 hover:bg-[#1a2332] border border-[#212f42] hover:border-[#38bdf8]/40 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              {currentUser ? (
                <>
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-[#38bdf8]"
                  />
                  <span className="font-semibold max-w-[100px] truncate hidden sm:inline">{currentUser.name}</span>
                  {currentUser.donorTier && (
                    <DonorBadge tier={currentUser.donorTier} size="xs" />
                  )}
                </>
              ) : (
                <>
                  <UserIcon className="w-4 h-4 text-[#38bdf8]" />
                  <span className="font-semibold hidden sm:inline">Panel Lateral</span>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

        </div>
      </header>

      {/* ==================================================================== */}
      {/* BARRA LATERAL DESPLEGABLE (DRAWER LATERAL IZQUIERDO)                 */}
      {/* Contiene todas las herramientas y opciones del recuadro azul         */}
      {/* ==================================================================== */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          
          {/* Fondo oscuro traslúcido para cerrar al hacer clic fuera */}
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Panel Lateral Desplegable */}
          <aside className="relative z-50 w-full max-w-xs sm:max-w-sm bg-[#0c121c] border-r border-[#202d40] shadow-2xl flex flex-col justify-between h-full overflow-y-auto animate-in slide-in-from-left duration-250 select-none">
            
            {/* 1. Encabezado del Panel Lateral */}
            <div className="p-4 sm:p-5 border-b border-[#1c2738] bg-[#111824] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 flex items-center justify-center">
                  <img src="/logo.png" alt="OffertGames" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="font-black text-white text-base tracking-wider uppercase block">
                    OFFERT<span className="text-[#38bdf8]">GAMES</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">Panel de Opciones y Control</span>
                </div>
              </div>

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2332] transition-colors cursor-pointer"
                title="Cerrar panel lateral"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Cuerpo del Panel Lateral: Elementos del Cuadrado Azul */}
            <div className="p-4 sm:p-5 space-y-5 flex-1">
              
              {/* ELEMENTO 1: SECCIÓN DE PERFIL / CUENTA DE USUARIO */}
              <div className="bg-[#121926] border border-[#223147] rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between text-xs font-bold text-gray-400 border-b border-[#1f2b3e] pb-2">
                  <span>Mi Cuenta</span>
                  {currentUser && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      Conectado
                    </span>
                  )}
                </div>

                {currentUser ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                        alt={currentUser.name}
                        className="w-11 h-11 rounded-2xl object-cover border-2 border-[#38bdf8] shadow-md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white truncate">{currentUser.name}</span>
                          {currentUser.donorTier && (
                            <DonorBadge tier={currentUser.donorTier} size="xs" />
                          )}
                        </div>
                        <span className="text-xs text-gray-400 block truncate">{currentUser.email}</span>
                        {currentUser.donorTier && (
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mt-0.5">
                            Donador {currentUser.donorTier}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botones de acción del usuario */}
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSidebarOpen(false);
                          openProfileModal('perfil');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#192333] hover:bg-[#233147] text-gray-200 hover:text-white text-xs font-bold border border-[#2a3c54] transition-all cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Mi Perfil y Métodos de Pago</span>
                      </button>

                      {currentUser.role === 'administrador' && (
                        <button
                          type="button"
                          onClick={() => handleNav('admin')}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span>Panel de Administrador</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsSidebarOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950/30 hover:bg-red-900/40 text-red-300 hover:text-red-200 text-xs font-bold border border-red-800/30 transition-all cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-400" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-center py-1">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Inicia sesión con Google o GitHub para guardar tus ofertas favoritas, alertas de precio y medallas.
                    </p>
                    <div className="flex flex-col gap-2">
                      {/* Botón Google */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSidebarOpen(false);
                          openAuthModal('login');
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-extrabold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Iniciar sesión con Google</span>
                      </button>

                      {/* Botón GitHub */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSidebarOpen(false);
                          openAuthModal('login');
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#24292e] hover:bg-[#2c3238] text-white font-extrabold text-xs transition-all cursor-pointer shadow-md border border-[#38424d] hover:border-[#4d5b6a] flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                        <span>Iniciar sesión con GitHub</span>
                      </button>

                      {/* Botón Crear Cuenta */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSidebarOpen(false);
                          openAuthModal('register');
                        }}
                        className="w-full py-2 px-4 rounded-xl bg-[#192333] hover:bg-[#233147] text-gray-200 text-xs font-bold border border-[#2a3c54] transition-all cursor-pointer"
                      >
                        Crear Cuenta Gratis
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ELEMENTO 2: BOTÓN / CARD DE DONAR Y APOYAR LA WEB */}
              <div className="bg-gradient-to-br from-amber-500/15 via-[#18212e] to-[#121926] border border-amber-500/40 rounded-2xl p-4 space-y-2.5 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-300">Apoyar a OffertGames</h4>
                    <p className="text-[11px] text-gray-400">Consigue tu medalla de donador permanente</p>
                  </div>
                </div>

                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Pago único: Bronce (2€), Plata (5€), Oro (10€) o Diamante (20€).
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    openDonationModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Volverse Donador</span>
                </button>
              </div>

              {/* ELEMENTO 3: SELECTOR DE MODO DE VISTA (VISTA PC VS VISTA MÓVIL) */}
              <div className="bg-[#121926] border border-[#223147] rounded-2xl p-3.5 space-y-2.5 shadow-md">
                <span className="text-xs font-bold text-gray-400 block">Modo de Pantalla</span>
                <div className="grid grid-cols-2 gap-2 bg-[#0c121c] p-1.5 rounded-xl border border-[#1b2636]">
                  <button
                    type="button"
                    onClick={() => setViewMode('pc')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      viewMode === 'pc'
                        ? 'bg-[#38bdf8] text-black shadow-md shadow-cyan-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-[#151f2e]'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Vista PC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('mobile')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      viewMode === 'mobile'
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-[#151f2e]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Vista Móvil</span>
                  </button>
                </div>
              </div>

              {/* ELEMENTO 4: BUSCADOR DE JUEGOS Y OFERTAS */}
              <div className="bg-[#121926] border border-[#223147] rounded-2xl p-3.5 space-y-2 shadow-md">
                <span className="text-xs font-bold text-gray-400 block">Búsqueda Rápida</span>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4 text-[#38bdf8]" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (activeTab !== 'ofertas' && activeTab !== 'juegos') {
                        setActiveTab('ofertas');
                      }
                    }}
                    placeholder="Buscar ofertas, juegos..."
                    className="w-full bg-[#0c121c] text-xs text-gray-200 placeholder-gray-500 rounded-xl pl-9 pr-3 py-2.5 border border-[#233145] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-all"
                  />
                </div>
              </div>

              {/* ELEMENTO 5: SINCRONIZACIÓN STEAM LIVE */}
              <div className="bg-[#121926] border border-[#223147] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md">
                <div>
                  <span className="text-xs font-bold text-white block">Steam Live</span>
                  <span className="text-[11px] text-gray-400">Precios en tiempo real</span>
                </div>
                <button
                  type="button"
                  onClick={() => refreshSteamPrices()}
                  disabled={isSyncing}
                  className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-[#192333] hover:bg-[#233147] border border-[#2a3c54] text-xs text-gray-200 hover:text-white font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#38bdf8] ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Actualizar'}</span>
                </button>
              </div>

              {/* ELEMENTO 6: NOTIFICACIONES Y AVISOS DE PRECIO */}
              <div className="bg-[#121926] border border-[#223147] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#192333] border border-[#25364c] text-[#38bdf8]">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Avisos de Precios</span>
                    <span className="text-[11px] text-gray-400">
                      {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} nuevos avisos` : 'Sin avisos pendientes'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    if (!currentUser) {
                      openAuthModal('login', 'Inicia sesión para gestionar tus avisos.');
                    } else {
                      openAlertModal();
                    }
                  }}
                  className="py-1.5 px-3 rounded-xl bg-[#192333] hover:bg-[#233147] border border-[#2a3c54] text-xs text-gray-200 hover:text-white font-bold transition-all cursor-pointer"
                >
                  Configurar
                </button>
              </div>

              {/* ASISTENTE IA DE CATÁLOGO Y OFERTAS */}
              <div className="bg-gradient-to-r from-[#111c2a] to-[#141a24] border border-[#283b52] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block">Asistente IA (NVIDIA)</span>
                    <span className="text-[11px] text-cyan-400">Consultas de precios y web</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    window.dispatchEvent(new CustomEvent('offertgames_open_ai_chat'));
                  }}
                  className="py-1.5 px-3 rounded-xl bg-[#38bdf8] hover:bg-[#0284c7] text-gray-950 text-xs font-black transition-all cursor-pointer shadow-md shadow-cyan-500/10 active:scale-95"
                >
                  Abrir Chat
                </button>
              </div>

              {/* SERVICIO AL CLIENTE: CONSULTAS Y QUEJAS */}
              <div className="bg-[#121926] border border-[#223147] rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-[#38bdf8]">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Servicio al Cliente</span>
                    <span className="text-[11px] text-gray-400">Atención, consultas y quejas</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-300 leading-relaxed">
                  ¿Tienes alguna duda, consulta o queja? Escríbenos directamente a nuestro correo de soporte y te responderemos lo antes posible.
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      openSupportModal();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-black text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer active:scale-98"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Escribir Mensaje / Queja</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('offertgames@gmail.com');
                        showToast('Correo copiado al portapapeles: offertgames@gmail.com');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#192333] hover:bg-[#233147] border border-[#2a3c54] text-[11px] text-gray-300 hover:text-white font-medium transition-all cursor-pointer"
                      title="Copiar dirección de correo"
                    >
                      <Copy className="w-3 h-3 text-[#38bdf8]" />
                      <span className="font-mono text-gray-300 truncate">offertgames@gmail.com</span>
                    </button>

                    <a
                      href="mailto:offertgames@gmail.com?subject=Consulta o Queja - OffertGames"
                      title="Abrir en tu gestor de correo externo"
                      className="p-2 rounded-xl bg-[#192333] hover:bg-[#233147] border border-[#2a3c54] text-gray-300 hover:text-[#38bdf8] transition-all cursor-pointer shrink-0"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* ELEMENTO 7: NAVEGACIÓN RÁPIDA POR SECCIONES */}
              <div className="bg-[#121926] border border-[#223147] rounded-2xl p-3.5 space-y-1.5 shadow-md">
                <span className="text-xs font-bold text-gray-400 block mb-1">Secciones</span>
                
                <button
                  type="button"
                  onClick={() => handleNav('ofertas')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'ofertas' ? 'bg-[#38bdf8]/15 text-[#38bdf8]' : 'text-gray-300 hover:bg-[#192333] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Ofertas Destacadas</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('juegos')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'juegos' ? 'bg-[#38bdf8]/15 text-[#38bdf8]' : 'text-gray-300 hover:bg-[#192333] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Catálogo de Juegos</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('comunidades')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'comunidades' ? 'bg-[#38bdf8]/15 text-[#38bdf8]' : 'text-gray-300 hover:bg-[#192333] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    <span>Comunidad de Jugadores</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNav('avisos')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'avisos' ? 'bg-[#38bdf8]/15 text-[#38bdf8]' : 'text-gray-300 hover:bg-[#192333] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Avisos y Alertas</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                </button>
              </div>

            </div>

            {/* 3. Pie del Panel Lateral */}
            <div className="p-4 border-t border-[#1c2738] bg-[#111824] text-center text-[10px] text-gray-400 space-y-1">
              <p className="font-semibold text-gray-300">OffertGames • Seguridad & Rendimiento Activo</p>
              <p>Precios sincronizados directamente con Steam y CheapShark</p>
            </div>

          </aside>
        </div>
      )}
    </>
  );
};
