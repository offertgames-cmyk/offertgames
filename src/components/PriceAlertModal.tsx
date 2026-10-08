import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Bell, Check, AlertCircle, Mail, 
  Search, CheckCircle2, Lock, ShieldAlert, Send,
  Eye, CheckCircle, Monitor, Smartphone, Sparkles, Tag, ExternalLink
} from 'lucide-react';
import { PriceAlertSettings, Game } from '../types/game';

export const PriceAlertModal: React.FC = () => {
  const {
    isAlertModalOpen,
    closeAlertModal,
    alertSettings,
    updateAlertSettings,
    games,
    currentUser,
    openAuthModal,
    showToast,
    activeAlertGameId,
    setActiveAlertGameId,
    sendTestAlertEmail
  } = useApp();

  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(alertSettings.maxPrice || 20);
  const [notifyInApp, setNotifyInApp] = useState(alertSettings.notifyInApp ?? true);
  const [notifyEmail, setNotifyEmail] = useState(alertSettings.notifyEmail ?? true);
  const [targetEmail, setTargetEmail] = useState<string>('');

  const [gameSearch, setGameSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Email sending state
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    ok: boolean;
    sent: boolean;
    provider?: string;
    previewUrl?: string;
    message: string;
  } | null>(null);

  // Visual Email Preview Modal
  const [showVisualPreview, setShowVisualPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Determine active game
  const selectedGame: Game = games.find(g => g.id === selectedGameId) 
    || (activeAlertGameId ? games.find(g => g.id === activeAlertGameId) : null)
    || (currentUser?.wishlist?.length ? games.find(g => currentUser.wishlist.includes(g.id)) : null)
    || games[0];

  // Sync state when modal opens
  useEffect(() => {
    if (isAlertModalOpen) {
      setMaxPrice(alertSettings.maxPrice || 20);
      setNotifyInApp(alertSettings.notifyInApp ?? true);
      setNotifyEmail(alertSettings.notifyEmail ?? true);
      setEmailFeedback(null);
      setGameSearch('');

      if (currentUser?.email) {
        setTargetEmail(currentUser.email);
      }

      // Priority for game selection:
      // 1. activeAlertGameId passed from button/card
      // 2. First game from user's wishlist
      // 3. First game in catalog
      if (activeAlertGameId && games.some(g => g.id === activeAlertGameId)) {
        setSelectedGameId(activeAlertGameId);
      } else if (currentUser?.wishlist && currentUser.wishlist.length > 0) {
        const wishGame = games.find(g => currentUser.wishlist.includes(g.id));
        if (wishGame) setSelectedGameId(wishGame.id);
      } else if (games.length > 0) {
        setSelectedGameId(games[0].id);
      }
    }
  }, [isAlertModalOpen, activeAlertGameId, currentUser, games, alertSettings]);

  if (!isAlertModalOpen) return null;

  // STRICT SECURITY GATE: If not registered/logged in, user CANNOT use this feature
  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
        <div className="bg-[#121822] w-full max-w-md rounded-2xl border border-[#233145] shadow-2xl overflow-hidden p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold uppercase tracking-wider">
              <Lock className="w-3 h-3" />
              <span>Acceso para usuarios registrados</span>
            </div>
            <h2 className="text-xl font-bold text-white">Configura tus alertas de precios</h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Inicia sesión con tu cuenta de Google para seguir tus videojuegos favoritos y recibir avisos por correo electrónico cuando bajen al precio que elijas.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#161f2c] border border-[#233145] text-left text-xs text-gray-300 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Elige el importe máximo que estás dispuesto a pagar (€)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#38bdf8] shrink-0" />
              <span>Avisos por correo automáticos y sin coste</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Enlace directo a la oferta oficial verificada</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                closeAlertModal();
                openAuthModal('login', 'Inicia sesión con Google para activar avisos por correo.');
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-black font-extrabold text-xs shadow-lg hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Iniciar sesión con Google</span>
            </button>
            
            <button
              type="button"
              onClick={closeAlertModal}
              className="w-full py-2.5 px-4 rounded-xl bg-[#18212e] hover:bg-[#202d3f] text-gray-400 hover:text-white font-semibold text-xs border border-[#263447] transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter games based on search query
  const searchResults = gameSearch.trim().length > 0
    ? games.filter(g => g.title.toLowerCase().includes(gameSearch.toLowerCase().trim())).slice(0, 6)
    : [];

  const handleSelectGame = (game: Game) => {
    setSelectedGameId(game.id);
    if (setActiveAlertGameId) {
      setActiveAlertGameId(game.id);
    }
    setGameSearch('');
    setIsSearchFocused(false);
    setEmailFeedback(null);
  };

  const handleSave = () => {
    if (!selectedGame) return;
    const currentCustom = alertSettings.customGameIds || [];
    const updatedCustom = Array.from(new Set([...currentCustom, selectedGame.id]));

    const newSettings: PriceAlertSettings = {
      enabled: true,
      scope: 'custom',
      customGameIds: updatedCustom,
      maxPrice: Number(maxPrice) > 0 ? Number(maxPrice) : 20,
      notifyInApp,
      notifyEmail
    };

    updateAlertSettings(newSettings);
    showToast(`¡Alerta guardada para "${selectedGame.title}"! Te avisaremos cuando baje de ${newSettings.maxPrice} €.`);
    closeAlertModal();
  };

  const handleSendSingleEmailTest = async () => {
    const destination = (targetEmail || currentUser?.email || '').trim();
    if (!destination || !destination.includes('@')) {
      showToast('Introduce un correo electrónico válido.');
      return;
    }

    if (!selectedGame) {
      showToast('Selecciona un juego.');
      return;
    }

    setSendingTestEmail(true);
    setEmailFeedback(null);
    try {
      const targetPrice = Number(maxPrice) > 0 ? Number(maxPrice) : 20;
      const testPrice = Math.min(selectedGame.currentPrice, targetPrice > 5 ? targetPrice - 2 : targetPrice);
      const regPrice = selectedGame.originalPrice || (testPrice * 2);
      const storeName = (selectedGame.stores?.[0]?.storeName || 'Steam').replace(/\s*\(España\)/i, '').trim();
      const buyUrl = selectedGame.steamAppId 
        ? `https://store.steampowered.com/app/${selectedGame.steamAppId}/` 
        : (selectedGame.stores?.[0]?.url || `https://store.steampowered.com/search/?term=${encodeURIComponent(selectedGame.title)}`);
      const coverImage = selectedGame.coverImage || (selectedGame.steamAppId ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${selectedGame.steamAppId}/capsule_616x353.jpg` : '');

      const res = await sendTestAlertEmail({
        to: destination,
        gameTitle: selectedGame.title,
        currentPrice: Number(testPrice.toFixed(2)),
        regularPrice: Number(regPrice.toFixed(2)),
        maxPrice: targetPrice,
        storeName: `${storeName} (España)`,
        buyUrl,
        coverImage,
        steamAppId: selectedGame.steamAppId
      });

      setEmailFeedback(res);
      if (res.ok) {
        showToast(`¡Aviso de "${selectedGame.title}" enviado a ${destination}!`);
      } else {
        showToast(res.message || 'Error al enviar correo.');
      }
    } catch (err: any) {
      setEmailFeedback({
        ok: false,
        sent: false,
        message: err?.message || 'No se pudo conectar con el servidor de correo.'
      });
      showToast('Error al enviar correo de prueba.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // User wishlist games for quick chips
  const wishlistGames = (currentUser?.wishlist || [])
    .map(id => games.find(g => g.id === id))
    .filter((g): g is Game => Boolean(g));

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
        <div className="bg-[#121822] w-full max-w-xl rounded-2xl border border-[#233145] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#233145] bg-[#161f2c] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b] shadow-md shadow-amber-500/10">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Alerta de Bajada de Precio</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono font-bold">
                    SaaS Automático
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Te avisamos al instante por correo cuando baje del importe que tú elijas.
                </p>
              </div>
            </div>

            <button
              onClick={closeAlertModal}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1f2937] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">

            {/* CARD 1: Selected Game (Intelligent SaaS Game Picker) */}
            <div className="p-4 rounded-xl bg-[#161f2c] border border-[#233145] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Juego seleccionado para la alerta</span>
                </span>
                <span className="text-[10px] text-gray-400">
                  {games.length} juegos disponibles
                </span>
              </div>

              {/* Game Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={gameSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => setGameSearch(e.target.value)}
                  placeholder="Buscar otro juego (ej. Cyberpunk, Elden Ring, GTA...)"
                  className="w-full bg-[#111722] text-xs text-white pl-9 pr-3.5 py-2.5 rounded-xl border border-[#27364a] focus:outline-none focus:border-[#38bdf8] transition-colors placeholder:text-gray-500"
                />

                {/* Instant Search Results Dropdown */}
                {isSearchFocused && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#141d2b] border border-[#2d3f57] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#233145]">
                    {searchResults.map(game => (
                      <div
                        key={game.id}
                        onMouseDown={() => handleSelectGame(game)}
                        className="p-2.5 flex items-center justify-between hover:bg-[#1c2738] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={game.coverImage || (game.steamAppId ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steamAppId}/capsule_184x69.jpg` : '')}
                            alt={game.title}
                            className="w-12 h-7 object-cover rounded border border-[#2d3f57] shrink-0"
                          />
                          <div className="truncate text-xs font-bold text-white">
                            {game.title}
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <span className="text-xs font-bold text-emerald-400">{game.currentPrice.toFixed(2)} €</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Wishlist Chips */}
              {wishlistGames.length > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  <span className="text-[11px] text-gray-400 font-semibold block">De tu Lista de Deseos:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {wishlistGames.slice(0, 5).map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGame(g)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          selectedGame?.id === g.id
                            ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8]'
                            : 'bg-[#121822] border-[#253549] text-gray-300 hover:text-white hover:border-gray-500'
                        }`}
                      >
                        <span>★</span>
                        <span className="truncate max-w-[120px]">{g.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Selected Game Visual Card */}
              {selectedGame && (
                <div className="p-3.5 rounded-xl bg-[#111722] border border-[#28394e] flex items-center gap-3.5 shadow-inner">
                  <img
                    src={selectedGame.coverImage || (selectedGame.steamAppId ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${selectedGame.steamAppId}/capsule_616x353.jpg` : '')}
                    alt={selectedGame.title}
                    className="w-24 h-14 object-cover rounded-lg border border-[#31445b] shrink-0 shadow-md"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-[#1c2738] text-[#38bdf8] text-[10px] font-bold px-2 py-0.5 rounded">
                        Tienda Oficial: Steam (España)
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-white truncate">
                      {selectedGame.title}
                    </div>
                    <div className="text-xs text-gray-300 flex items-center gap-2">
                      <span>Precio actual: <strong className="text-emerald-400 font-bold">{selectedGame.currentPrice.toFixed(2)} €</strong></span>
                      {selectedGame.originalPrice > selectedGame.currentPrice && (
                        <span className="text-[10px] text-gray-400 line-through">
                          {selectedGame.originalPrice.toFixed(2)} €
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: Max Price Target */}
            <div className="p-4 rounded-xl bg-[#161f2c] border border-[#233145] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200">
                  ¿A qué precio quieres que te avisemos?
                </span>
                <span className="text-xs font-extrabold text-[#38bdf8]">
                  Objetivo: ≤ {maxPrice} €
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold text-sm">€</span>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    step="0.5"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111722] text-white text-base font-extrabold pl-8 pr-4 py-2 rounded-xl border border-[#27364a] focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>

                {/* Preset Pills */}
                <div className="flex items-center gap-1.5">
                  {[10, 15, 20, 30].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMaxPrice(val)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        maxPrice === val
                          ? 'bg-[#38bdf8] text-black border-[#38bdf8]'
                          : 'bg-[#111722] text-gray-300 border-[#27364a] hover:border-gray-500'
                      }`}
                    >
                      {val} €
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Te enviaremos un correo de aviso en cuanto <strong>{selectedGame?.title || 'este juego'}</strong> alcance o baje de <strong>{maxPrice} €</strong>.
              </p>
            </div>

            {/* CARD 3: Delivery Options */}
            <div className="p-4 rounded-xl bg-[#161f2c] border border-[#233145] space-y-3">
              <span className="text-xs font-bold text-gray-200 block">
                Destino del aviso
              </span>

              {/* Email Delivery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Correo electrónico:</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ✓ Cuenta vinculada
                  </span>
                </div>

                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder={currentUser.email || 'tu-correo@gmail.com'}
                  className="w-full bg-[#111722] text-white text-xs font-mono px-3 py-2.5 rounded-xl border border-[#27364a] focus:outline-none focus:border-[#38bdf8]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Avisos directos con portada oficial, precio y enlace verificado.</span>
              </div>
            </div>

            {/* Test Email Result Banner */}
            {emailFeedback && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-in fade-in ${
                emailFeedback.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {emailFeedback.ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                    <span>{emailFeedback.ok ? `¡Aviso de "${selectedGame.title}" enviado!` : 'Error al enviar'}</span>
                  </span>
                  {emailFeedback.provider && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      {emailFeedback.provider}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-200">
                  {emailFeedback.message}
                </p>
              </div>
            )}

            {/* Actions Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSendSingleEmailTest}
                disabled={sendingTestEmail}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] text-black font-extrabold text-xs shadow-lg hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${sendingTestEmail ? 'animate-spin' : ''}`} />
                <span>
                  {sendingTestEmail 
                    ? `Enviando aviso de "${selectedGame.title}"...` 
                    : `Enviar aviso de prueba de "${selectedGame.title}" a mi correo`}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowVisualPreview(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#16202c] hover:bg-[#1d2938] text-gray-300 hover:text-white font-bold text-xs border border-[#2b3a4f] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Ver diseño del correo</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#38bdf8] hover:bg-[#0ea5e9] text-black font-extrabold text-xs shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Guardar alerta activa</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Visual Email Preview Modal */}
      {showVisualPreview && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
          <div className="bg-[#0f1722] w-full max-w-2xl rounded-2xl border border-[#233145] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            
            {/* Preview Header */}
            <div className="p-4 sm:p-5 border-b border-[#233145] bg-[#141d2b] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b]">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Diseño visual del aviso: {selectedGame.title}</span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Así es exactamente como se envía a tu correo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#1c2636] p-1 rounded-lg border border-[#2b3a4f]">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-[#38bdf8] text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-[#38bdf8] text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVisualPreview(false)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#090d14] flex justify-center items-start">
              <div
                className={`transition-all duration-300 w-full ${
                  previewDevice === 'mobile' ? 'max-w-sm border border-[#233145] rounded-3xl p-3 bg-[#0b1017] shadow-2xl' : 'max-w-xl'
                }`}
              >
                <div className="rounded-2xl overflow-hidden border border-[#233145] bg-[#121a24] shadow-2xl">
                  {/* Email Header */}
                  <div className="bg-gradient-to-b from-[#182230] to-[#121a24] p-6 text-center border-b border-[#233145]">
                    <div className="text-2xl font-black text-[#f59e0b] tracking-tight">
                      Offert<span className="text-[#38bdf8]">Games</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Tu comparador inteligente de precios de videojuegos en España
                    </p>
                  </div>

                  {/* Email Content */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <span className="inline-block bg-[#38bdf8]/15 text-[#38bdf8] text-[10px] font-extrabold px-3 py-1 rounded-full border border-[#38bdf8]/30 tracking-wider uppercase">
                      PRECIO POR DEBAJO DE TU LÍMITE
                    </span>

                    <h2 className="text-xl font-extrabold text-white leading-snug">
                      ¡{selectedGame.title} ha bajado de precio!
                    </h2>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      Buenas noticias. El juego que estabas siguiendo ha alcanzado o bajado de tu precio máximo deseado de <strong className="text-white">{maxPrice} €</strong>.
                    </p>

                    {/* Game Card */}
                    <div className="rounded-xl overflow-hidden bg-[#16202c] border border-[#28394e] shadow-lg">
                      <img
                        src={selectedGame.coverImage || (selectedGame.steamAppId ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${selectedGame.steamAppId}/capsule_616x353.jpg` : '')}
                        alt={selectedGame.title}
                        className="w-full h-auto max-h-56 object-cover block border-b border-[#28394e]"
                      />
                      <div className="p-4 space-y-2">
                        <span className="inline-block bg-[#212e3e] text-[#38bdf8] text-[10px] font-bold px-2 py-0.5 rounded">
                          Tienda Oficial: Steam (España)
                        </span>
                        <h4 className="text-base font-extrabold text-white leading-snug">
                          {selectedGame.title}
                        </h4>
                        <div className="flex items-baseline gap-2 pt-0.5">
                          <span className="text-2xl font-black text-[#10b981]">
                            {selectedGame.currentPrice.toFixed(2)} €
                          </span>
                          {selectedGame.originalPrice > selectedGame.currentPrice && (
                            <span className="text-sm text-gray-500 line-through">
                              {selectedGame.originalPrice.toFixed(2)} €
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          ✓ Tu límite configurado: {maxPrice} €
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="pt-2">
                      <div className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-black text-sm text-center uppercase tracking-wide shadow-lg">
                        Ver oferta en Steam →
                      </div>
                    </div>
                  </div>

                  {/* Email Footer */}
                  <div className="bg-[#0b1017] p-4 text-center border-t border-[#1e293b] text-[11px] text-gray-500">
                    Has recibido este aviso en <strong>{targetEmail || currentUser.email}</strong> porque estás registrado en OffertGames.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
