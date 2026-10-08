import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, 
  Search, 
  Trash2, 
  CheckCircle2, 
  ExternalLink, 
  Sliders, 
  Send, 
  Bookmark, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Check, 
  ArrowRight,
  TrendingDown,
  Mail
} from 'lucide-react';
import { Game } from '../types/game';

export const AlertsView: React.FC = () => {
  const {
    games,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    alertSettings,
    updateAlertSettings,
    currentUser,
    openAuthModal,
    showToast,
    sendTestAlertEmail,
    setSelectedGame,
    viewMode
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'crear' | 'historial'>('crear');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string>(() => {
    return alertSettings.customGameIds?.[0] || games[0]?.id || '';
  });
  const [targetPrice, setTargetPrice] = useState<number>(20);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Selected game for creating/editing alert
  const activeGame = useMemo(() => {
    return games.find(g => g.id === selectedGameId) || games[0];
  }, [games, selectedGameId]);

  // Filtered games for quick search picker
  const matchingGames = useMemo(() => {
    if (!searchFilter.trim()) {
      // Prioritize user's wishlist or popular games
      if (currentUser?.wishlist && currentUser.wishlist.length > 0) {
        return games.filter(g => currentUser.wishlist.includes(g.id)).slice(0, 5);
      }
      return games.slice(0, 5);
    }
    return games.filter(g => 
      g.title.toLowerCase().includes(searchFilter.toLowerCase())
    ).slice(0, 6);
  }, [games, searchFilter, currentUser]);

  const handleSaveAlert = () => {
    if (!currentUser) {
      openAuthModal('login', 'Inicia sesión para activar y guardar tus alertas de precios.');
      return;
    }

    const currentList = alertSettings.customGameIds || [];
    const updatedList = Array.from(new Set([...currentList, activeGame.id]));

    updateAlertSettings({
      ...alertSettings,
      enabled: true,
      scope: 'custom',
      customGameIds: updatedList
    });

    showToast(`Alerta guardada para "${activeGame.title}" con precio objetivo ${targetPrice.toFixed(2)} €`);
  };

  const handleSendTestEmail = async () => {
    if (!currentUser) {
      openAuthModal('login', 'Inicia sesión para recibir el aviso de prueba.');
      return;
    }

    setIsSendingTest(true);
    try {
      const bestStore = activeGame.stores?.find(s => s.isBest) || activeGame.stores?.[0];
      const res = await sendTestAlertEmail({
        to: currentUser.email || 'offertgames@gmail.com',
        gameTitle: activeGame.title,
        steamAppId: activeGame.steamAppId || 0,
        currentPrice: activeGame.currentPrice,
        regularPrice: activeGame.originalPrice,
        maxPrice: targetPrice,
        storeName: bestStore?.storeName || (activeGame.steamAppId ? 'Steam' : 'Tienda Oficial'),
        buyUrl: bestStore?.url || (activeGame.steamAppId ? `https://store.steampowered.com/app/${activeGame.steamAppId}/` : ''),
        coverImage: activeGame.coverImage
      });

      if (res.ok) {
        showToast(`✉️ ¡Aviso de prueba de "${activeGame.title}" enviado a ${currentUser.email || 'tu correo'}!`);
      } else {
        showToast(res.message || 'Error al enviar el aviso de prueba');
      }
    } catch {
      showToast('Error de conexión al enviar el aviso de prueba');
    } finally {
      setIsSendingTest(false);
    }
  };

  const isMobile = viewMode === 'mobile';

  return (
    <div className={`w-full max-w-4xl mx-auto select-none ${isMobile ? 'px-3 py-3 space-y-4' : 'px-4 lg:px-8 py-6 space-y-6'}`}>
      
      {/* 1. TOP HEADER (Exact match of mobile_ui_alerts AI layout) */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1f2937]">
        <div>
          <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black text-white tracking-tight`}>
            Avisos y Notificaciones
          </h1>
          <p className="text-[11px] text-gray-400">
            Control en tiempo real de bajadas de precio en tus videojuegos.
          </p>
        </div>

        {/* Unread Bell Badge */}
        {unreadNotificationsCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] text-xs font-black animate-pulse shadow-sm">
            <Bell className="w-3.5 h-3.5 fill-current" />
            <span>{unreadNotificationsCount} nuevas</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#162130] border border-[#233145] text-gray-400 text-xs font-medium">
            <Bell className="w-3.5 h-3.5" />
            <span>Al día</span>
          </div>
        )}
      </div>

      {/* 2. SUBHEADER SWITCHER (Matches AI mockup) */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-[#121822] border border-[#202c3d] text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('crear')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'crear'
              ? 'bg-[#1e2a3d] text-white shadow-md font-extrabold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>Configurar Alerta</span>
        </button>

        <button
          onClick={() => setActiveSubTab('historial')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'historial'
              ? 'bg-[#1e2a3d] text-white shadow-md font-extrabold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Historial ({notifications.length})</span>
        </button>
      </div>

      {/* 3. ACTIVE SUBTAB: CONFIGURAR ALERTA (Matches AI card layout) */}
      {activeSubTab === 'crear' && (
        <div className="space-y-4">
          
          {/* Card: Monitorizar Juego */}
          <div className="bg-[#121822] p-4 sm:p-5 rounded-2xl border border-[#202c3d] space-y-4 shadow-xl">
            
            {/* Search Input for Game */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>Elegir videojuego para vigilar</span>
                <span className="text-[10px] text-gray-400 normal-case font-mono">
                  {matchingGames.length} resultados
                </span>
              </label>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar juego (ej: Elden Ring, Cyberpunk 2077...)"
                  className="w-full bg-[#17212e] text-xs sm:text-sm text-white rounded-xl pl-9 pr-4 py-2.5 border border-[#253448] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
                />
              </div>

              {/* Quick Game Selector Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {matchingGames.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGameId(g.id);
                      setTargetPrice(Math.round(g.currentPrice * 0.8));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                      selectedGameId === g.id
                        ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#22d3ee] font-bold'
                        : 'bg-[#151d2a] border-[#222e3f] text-gray-400 hover:text-white'
                    }`}
                  >
                    {g.title.split(':')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Game Card Preview */}
            <div className="bg-[#16202c] p-3 rounded-xl border border-[#26374d] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={activeGame.coverImage}
                  alt={activeGame.title}
                  className="w-14 h-14 rounded-lg object-cover border border-[#2b3d54] shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-white truncate">
                    {activeGame.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs pt-0.5">
                    <span className="text-[#38bdf8] font-black">
                      {activeGame.currentPrice.toFixed(2).replace('.', ',')} €
                    </span>
                    {activeGame.discountPercent > 0 && activeGame.currentPrice < activeGame.originalPrice && (
                      <>
                        <span className="text-gray-500 line-through text-[11px]">
                          {activeGame.originalPrice.toFixed(2).replace('.', ',')} €
                        </span>
                        <span className="bg-[#f59e0b] text-black font-black text-[10px] px-1.5 py-0.2 rounded">
                          -{activeGame.discountPercent}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedGame(activeGame)}
                className="p-2 rounded-lg bg-[#1f2b3b] text-gray-300 hover:text-white shrink-0"
                title="Ver ficha completa"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Price Target Range & Presets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Precio Objetivo
                </span>
                <span className="text-base font-black text-[#38bdf8] font-mono">
                  {targetPrice.toFixed(2)} €
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="3"
                max={Math.max(60, Math.round(activeGame.originalPrice))}
                step="1"
                value={targetPrice}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                className="w-full accent-[#06b6d4] cursor-pointer"
              />

              {/* Quick Preset Buttons (10€, 15€, 20€, 30€) */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTargetPrice(preset)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      targetPrice === preset
                        ? 'bg-[#06b6d4] text-black border-[#06b6d4] shadow-sm'
                        : 'bg-[#16202c] border-[#253448] text-gray-300 hover:text-white'
                    }`}
                  >
                    {preset} €
                  </button>
                ))}
              </div>
            </div>

            {/* Destination Email Info */}
            <div className="p-3 rounded-xl bg-[#141c28] border border-[#212f42] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#38bdf8]" />
                <span className="text-gray-300 truncate max-w-[200px]">
                  {currentUser?.email || 'offertgames@gmail.com'}
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Verificado
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {/* Primary: Activar Aviso */}
              <button
                onClick={handleSaveAlert}
                className="w-full py-3 bg-[#06b6d4] hover:bg-[#0891b2] text-black font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Bell className="w-4 h-4 fill-current" />
                <span>Activar aviso de precio para {activeGame.title.split(':')[0]}</span>
              </button>

              {/* Secondary: Enviar aviso de prueba */}
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
                className="w-full py-2.5 bg-[#17212e] hover:bg-[#1d2a3a] text-gray-200 border border-[#28394e] font-bold text-xs rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>{isSendingTest ? 'Enviando aviso de prueba...' : `Probar aviso por correo de "${activeGame.title.split(':')[0]}"`}</span>
              </button>
            </div>

          </div>

          {/* Monitored Games List */}
          {alertSettings.customGameIds && alertSettings.customGameIds.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Juegos actualmente monitorizados ({alertSettings.customGameIds.length})
              </h3>
              <div className="space-y-2">
                {alertSettings.customGameIds.map((gId) => {
                  const monGame = games.find(g => g.id === gId);
                  if (!monGame) return null;

                  return (
                    <div
                      key={gId}
                      className="bg-[#121822] p-3 rounded-xl border border-[#202c3d] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={monGame.coverImage}
                          alt={monGame.title}
                          className="w-10 h-10 rounded-lg object-cover border border-[#233145] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{monGame.title}</p>
                          <p className="text-[11px] text-gray-400">
                            Precio actual: <span className="text-[#38bdf8] font-bold">{monGame.currentPrice.toFixed(2)} €</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const updated = alertSettings.customGameIds?.filter(id => id !== gId) || [];
                          updateAlertSettings({ ...alertSettings, customGameIds: updated });
                          showToast(`Alerta de "${monGame.title}" eliminada`);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg"
                        title="Eliminar seguimiento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. ACTIVE SUBTAB: HISTORIAL DE BAJADAS (Matches AI notification card layout) */}
      {activeSubTab === 'historial' && (
        <div className="space-y-3">
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">
              {notifications.length} avisos registrados
            </span>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-xs text-[#38bdf8] hover:underline font-semibold"
                >
                  Marcar leídas
                </button>
                <span className="text-gray-600">·</span>
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-red-400 hover:underline font-semibold"
                >
                  Borrar todo
                </button>
              </div>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="bg-[#121822] rounded-2xl border border-[#1f2937] p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#16202c] border border-[#233145] flex items-center justify-center text-[#38bdf8]">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs text-gray-400">
                No tienes avisos pendientes todavía. Configura un aviso para tu juego preferido y te avisaremos cuando baje de precio.
              </p>
              <button
                onClick={() => setActiveSubTab('crear')}
                className="px-4 py-2 bg-[#06b6d4] text-black font-bold text-xs rounded-xl"
              >
                Configurar primer aviso
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                    !notif.read
                      ? 'bg-[#151e2c] border-[#38bdf8]/40 ring-1 ring-[#38bdf8]/20'
                      : 'bg-[#121822] border-[#1f2937]'
                  }`}
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={notif.gameCover || 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/capsule_616x353.jpg'}
                      alt={notif.gameTitle}
                      className="w-14 h-14 rounded-xl object-cover border border-[#243447] shrink-0"
                    />

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">
                          ¡Bajada de precio detectada!
                        </span>
                        {notif.dealCut && (
                          <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black px-1.5 py-0.2 rounded">
                            -{notif.dealCut}%
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-300 truncate">
                        {notif.gameTitle} ha bajado a <span className="font-extrabold text-[#38bdf8]">{notif.currentPrice.toFixed(2)} €</span> en {notif.storeName}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: CTA button to buy */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(notif.buyUrl, '_blank');
                      }}
                      className="px-3.5 py-1.5 bg-[#06b6d4] hover:bg-[#0891b2] text-black font-extrabold text-xs rounded-lg flex items-center gap-1.5 transition-transform active:scale-95 shadow-sm"
                    >
                      <span>Ir a oferta</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
