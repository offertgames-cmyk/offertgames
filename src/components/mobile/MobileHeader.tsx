import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Bell, Monitor, Smartphone, RefreshCw, X, LogOut, Award } from 'lucide-react';
import { NotificationDropdown } from '../NotificationDropdown';

export const MobileHeader: React.FC = () => {
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
    openDonationModal
  } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleNav = (tab: any) => {
    setSelectedGame(null);
    setActiveTab(tab);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f141c]/95 backdrop-blur-md border-b border-[#1f2838] px-3 py-2.5 select-none">
      <div className="flex items-center justify-between gap-2">
        {/* Logo and Brand */}
        <div 
          onClick={() => handleNav('ofertas')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <img 
            src="/logo.png" 
            alt="OffertGames" 
            className="w-7 h-7 object-contain drop-shadow-[0_2px_6px_rgba(6,182,212,0.4)]"
          />
          <span className="font-black text-sm tracking-wider text-white uppercase">
            OFFERT<span className="text-[#38bdf8]">GAMES</span>
          </span>
        </div>

        {/* View Mode Toggle: PC / Móvil Selector */}
        <div className="flex items-center bg-[#151c27] p-0.5 rounded-lg border border-[#223145] text-[10px] font-bold">
          <button
            onClick={() => setViewMode('pc')}
            title="Cambiar a Vista PC"
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
              viewMode === 'pc'
                ? 'bg-[#38bdf8] text-black font-extrabold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3 h-3" />
            <span>PC</span>
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            title="Vista Móvil activa"
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
              viewMode === 'mobile'
                ? 'bg-[#f59e0b] text-black font-extrabold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Móvil</span>
          </button>
        </div>

        {/* Right Actions: Search toggle, Steam refresh, Bell */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-1.5 rounded-lg border transition-all ${
              isSearchOpen || searchQuery
                ? 'bg-[#38bdf8]/15 border-[#38bdf8]/50 text-[#38bdf8]'
                : 'bg-[#18212e] border-[#263447] text-gray-400 hover:text-white'
            }`}
            title="Buscar juegos"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Sync Steam */}
          <button
            onClick={() => refreshSteamPrices()}
            disabled={isSyncing}
            title="Sincronizar Steam"
            className="p-1.5 rounded-lg bg-[#18212e] border border-[#263447] text-gray-400 hover:text-[#38bdf8] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#38bdf8] ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Alert Bell */}
          <div className="relative">
            <button
              onClick={() => {
                if (!currentUser) {
                  openAuthModal('login', 'Inicia sesión para ver avisos.');
                  return;
                }
                setIsNotifOpen(!isNotifOpen);
              }}
              className="relative p-1.5 rounded-lg bg-[#18212e] border border-[#263447] text-gray-400 hover:text-white"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#f59e0b] px-0.5 text-[9px] font-black text-black">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <NotificationDropdown
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              onOpenSettings={() => openAlertModal()}
            />
          </div>

          {/* Donar Button */}
          <button
            onClick={openDonationModal}
            title="Apoyar la web"
            className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:text-white transition-all"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Expandable Search Input on Mobile */}
      {isSearchOpen && (
        <div className="mt-2 relative animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeTab !== 'ofertas' && activeTab !== 'juegos') {
                setActiveTab('ofertas');
              }
            }}
            placeholder="Buscar juegos, ofertas..."
            className="w-full bg-[#141b27] text-xs text-gray-200 placeholder-gray-500 rounded-lg pl-8 pr-8 py-2 border border-[#28384f] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </header>
  );
};
