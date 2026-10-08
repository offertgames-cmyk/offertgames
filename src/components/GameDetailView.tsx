import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Star, 
  Bookmark, 
  Share2, 
  ExternalLink, 
  Play, 
  ChevronRight, 
  ChevronLeft,
  MessageSquare, 
  ThumbsUp, 
  Image as ImageIcon, 
  Video, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Bell 
} from 'lucide-react';
import { Game, GameVideo } from '../types/game';
import { fetchGameMediaFromSteam } from '../services/steamApi';
import { VideoPlayer } from './VideoPlayer';

export const GameDetailView: React.FC<{ game: Game }> = ({ game }) => {
  const { 
    setSelectedGame, 
    setActiveTab, 
    toggleWishlist, 
    currentUser, 
    openAuthModal, 
    showToast,
    alertSettings,
    updateAlertSettings,
    openAlertModal,
    viewMode
  } = useApp();

  // Media state
  const [screenshots, setScreenshots] = useState<string[]>(game.screenshots || []);
  const [videos, setVideos] = useState<GameVideo[]>(game.videos || []);
  const [selectedMediaType, setSelectedMediaType] = useState<'video' | 'photo'>(
    (game.videos && game.videos.length > 0) ? 'video' : 'photo'
  );
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [mediaAutoLoaded, setMediaAutoLoaded] = useState(false);

  // Review form state
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [newReviewBadge, setNewReviewBadge] = useState('Imprescindible');
  const [newReviewText, setNewReviewText] = useState('');
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const inWishlist = currentUser?.wishlist.includes(game.id);
  const isMobile = viewMode === 'mobile';

  // AUTOMATIC MEDIA FETCHER (Steam API Integration)
  useEffect(() => {
    setScreenshots(game.screenshots || []);
    setVideos(game.videos || []);
    setSelectedPhotoIndex(0);
    setSelectedVideoIndex(0);
    setMediaAutoLoaded(false);

    let isMounted = true;

    async function loadAutomaticMedia() {
      if (!game.steamAppId) return;

      setIsMediaLoading(true);
      try {
        const details = await fetchGameMediaFromSteam(game.steamAppId);
        if (isMounted && details) {
          if (details.screenshots && details.screenshots.length > 0) {
            setScreenshots(details.screenshots);
          }
          if (details.videos && details.videos.length > 0) {
            setVideos(details.videos);
            setSelectedMediaType('video');
          }
          setMediaAutoLoaded(true);
        }
      } catch (err) {
        console.warn('Could not load automatic media:', err);
      } finally {
        if (isMounted) setIsMediaLoading(false);
      }
    }

    loadAutomaticMedia();

    return () => {
      isMounted = false;
    };
  }, [game.id, game.steamAppId]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Enlace del juego copiado al portapapeles');
    } else {
      showToast('Enlace listo para compartir');
    }
  };

  const handleExternalStore = (url: string, storeName: string) => {
    window.open(url, '_blank');
    showToast(`Redirigiendo a ${storeName}...`);
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal('login', 'Debes iniciar sesión para publicar una recomendación sobre este juego.');
      return;
    }
    if (!newReviewText.trim()) return;

    game.reviews.unshift({
      id: `rev-user-${Date.now()}`,
      author: currentUser.name,
      avatar: currentUser.avatar,
      badge: newReviewBadge,
      timeAgo: 'ahora mismo',
      content: newReviewText.trim(),
      likes: 1,
      commentsCount: 0,
      recommended: true
    });

    setNewReviewText('');
    setIsReviewFormOpen(false);
    showToast('¡Tu recomendación ha sido publicada en la ficha del juego!');
  };

  const activeVideo = videos[selectedVideoIndex] || videos[0];
  const activeScreenshot = screenshots[selectedPhotoIndex] || game.coverImage;

  return (
    <div className={`w-full max-w-7xl mx-auto select-none ${isMobile ? 'px-3 py-3 space-y-4' : 'px-4 lg:px-8 py-6 space-y-6'}`}>
      
      {/* TOP NAVIGATION / BREADCRUMBS */}
      {isMobile ? (
        /* Mobile Top Bar (Matches mobile_ui_detail AI Layout) */
        <div className="flex items-center justify-between py-1">
          <button
            onClick={() => setSelectedGame(null)}
            className="flex items-center gap-1 text-xs font-bold text-gray-200 hover:text-white bg-[#141b27] px-2.5 py-1.5 rounded-lg border border-[#233145] active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 text-[#38bdf8]" />
            <span>Volver</span>
          </button>
          
          <span className="text-xs font-extrabold text-white truncate max-w-[170px]">
            {game.title}
          </span>

          <button
            onClick={handleShare}
            title="Compartir juego"
            className="p-1.5 rounded-lg bg-[#141b27] border border-[#233145] text-gray-300 hover:text-white active:scale-95"
          >
            <Share2 className="w-4 h-4 text-[#38bdf8]" />
          </button>
        </div>
      ) : (
        /* Desktop Breadcrumbs */
        <nav className="flex items-center gap-2 text-xs text-gray-400">
          <button
            onClick={() => {
              setSelectedGame(null);
              setActiveTab('ofertas');
            }}
            className="hover:text-white transition-colors"
          >
            Inicio
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <button
            onClick={() => {
              setSelectedGame(null);
              setActiveTab('juegos');
            }}
            className="hover:text-white transition-colors"
          >
            Juegos
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-gray-200 font-medium truncate max-w-xs">{game.title}</span>
        </nav>
      )}

      {/* MOBILE ADAPTED LAYOUT (Matches mobile_ui_detail AI Design) */}
      {isMobile ? (
        <div className="space-y-4">
          
          {/* 1. Large Widescreen Media Stage */}
          <div className="space-y-2">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-[#222d3d] shadow-xl">
              {selectedMediaType === 'video' && activeVideo ? (
                <VideoPlayer
                  key={activeVideo.videoUrl}
                  src={activeVideo.videoUrl}
                  poster={activeVideo.thumbnail}
                  title={activeVideo.title}
                />
              ) : (
                <div className="w-full h-full relative flex items-center justify-center bg-[#0d131d]">
                  <img
                    src={activeScreenshot}
                    alt={`${game.title} captura`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = game.coverImage;
                    }}
                    className="w-full h-full object-cover"
                  />
                  {/* Prev Photo Arrow Mobile */}
                  {screenshots.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1));
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-[#06b6d4] text-white hover:text-black border border-white/20 transition-all z-20 shadow-md active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                  {/* Next Photo Arrow Mobile */}
                  {screenshots.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhotoIndex((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-[#06b6d4] text-white hover:text-black border border-white/20 transition-all z-20 shadow-md active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-gray-300 z-10">
                    {selectedPhotoIndex + 1}/{screenshots.length}
                  </div>
                </div>
              )}
            </div>

            {/* Media toggle pills */}
            <div className="flex items-center justify-between text-xs font-semibold gap-2">
              <div className="flex items-center gap-1.5 shrink-0">
                {videos.length > 0 && (
                  <button
                    onClick={() => setSelectedMediaType('video')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedMediaType === 'video'
                        ? 'bg-[#06b6d4] text-black shadow-sm'
                        : 'bg-[#151e2b] text-gray-300'
                    }`}
                  >
                    Tráiler ({videos.length})
                  </button>
                )}
                <button
                  onClick={() => setSelectedMediaType('photo')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedMediaType === 'photo'
                      ? 'bg-[#06b6d4] text-black shadow-sm'
                      : 'bg-[#151e2b] text-gray-300'
                  }`}
                >
                  Fotos ({screenshots.length})
                </button>
              </div>

              {/* Thumbnails row (Scrollable for all photos) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[200px]">
                {screenshots.map((shot, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedMediaType('photo');
                      setSelectedPhotoIndex(idx);
                    }}
                    className={`w-10 h-6 rounded overflow-hidden shrink-0 border transition-all ${
                      selectedPhotoIndex === idx && selectedMediaType === 'photo'
                        ? 'border-[#06b6d4] ring-1 ring-[#06b6d4] scale-105'
                        : 'border-[#222d3d] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={shot} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Game Title, Rating & Pricing Row */}
          <div className="space-y-2 bg-[#121822] p-3.5 rounded-2xl border border-[#202c3d]">
            <h1 className="text-xl font-black text-white leading-tight">
              {game.title}
            </h1>

            {/* Rating row */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold text-[#f59e0b] flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                {game.rating}/5
              </span>
              <span className="text-gray-400">
                ({(game.ratingCount / 1000).toFixed(1)}k reseñas)
              </span>
            </div>

            {/* Price & Discount Row */}
            <div className="flex items-baseline gap-2 pt-1">
              {game.discountPercent > 0 && game.currentPrice < game.originalPrice && (
                <span className="bg-[#f59e0b] text-black font-black text-xs px-2 py-0.5 rounded-md shadow-sm">
                  -{game.discountPercent}%
                </span>
              )}
              <span className="text-2xl font-black text-white">
                {game.currentPrice.toFixed(2).replace('.', ',')} €
              </span>
              {game.discountPercent > 0 && game.currentPrice < game.originalPrice && (
                <span className="text-xs text-gray-500 line-through">
                  {game.originalPrice.toFixed(2).replace('.', ',')} €
                </span>
              )}
            </div>

            {/* 3. Primary Big CTA: VER OFERTA EN TIENDA */}
            {(() => {
              const bestStore = game.stores?.find(s => s.isBest) || game.stores?.[0];
              const storeUrl = bestStore?.url || (game.steamAppId ? `https://store.steampowered.com/app/${game.steamAppId}/` : 'https://store.steampowered.com');
              const storeName = bestStore?.storeName || (game.steamAppId ? 'Steam' : 'Tienda');
              return (
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => handleExternalStore(storeUrl, storeName)}
                    className="w-full py-3 bg-[#06b6d4] hover:bg-[#0891b2] text-black font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>VER OFERTA EN {storeName.toUpperCase()}</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => toggleWishlist(game.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    inWishlist
                      ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#22d3ee]'
                      : 'bg-[#18212e] border-[#29374a] text-gray-300'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${inWishlist ? 'fill-[#22d3ee]' : ''}`} />
                  <span>{inWishlist ? 'En Wishlist' : 'Añadir a Wishlist'}</span>
                </button>

                <button
                  onClick={() => {
                    if (!currentUser) {
                      openAuthModal('login', 'Inicia sesión para recibir avisos de bajadas de precio.');
                      return;
                    }
                    openAlertModal(game.id);
                  }}
                  className="py-2 px-3 rounded-xl bg-[#18212e] border border-[#29374a] text-gray-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Bell className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Avisar de bajada</span>
                </button>
              </div>
          </div>

          {/* 4. MEJORES OFERTAS (Cards matching AI layout) */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Mejores Ofertas Disponibles
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {game.stores.slice(0, 3).map((st, idx) => (
                <div
                  key={idx}
                  onClick={() => handleExternalStore(st.url, st.storeName)}
                  className="bg-[#121822] p-2.5 rounded-xl border border-[#202c3d] flex flex-col justify-between items-center text-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
                >
                  <span className="text-[11px] font-bold text-white truncate max-w-full">
                    {st.storeName}
                  </span>
                  <span className="text-xs font-black text-[#38bdf8]">
                    {st.currentPrice.toFixed(2).replace('.', ',')} €
                  </span>
                  <button className="w-full py-1 bg-[#1a2433] hover:bg-[#233145] text-gray-200 text-[10px] font-bold rounded border border-[#2a3a50]">
                    Ir a tienda
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Short Description */}
          <div className="bg-[#121822] p-3.5 rounded-2xl border border-[#202c3d] space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Acerca del juego</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              {game.description}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {game.categories.map(c => (
                <span key={c} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1a2332] text-gray-300 border border-[#2b3a4e]">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* 6. Community Reviews */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Opiniones ({game.reviews.length})</h3>
              <button
                onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
                className="text-xs font-bold text-[#06b6d4]"
              >
                {isReviewFormOpen ? 'Cerrar' : '+ Escribir'}
              </button>
            </div>

            {isReviewFormOpen && (
              <form onSubmit={handleAddReview} className="bg-[#141b25] p-3 rounded-xl border border-[#233145] space-y-2.5">
                <input
                  type="text"
                  value={newReviewBadge}
                  onChange={(e) => setNewReviewBadge(e.target.value)}
                  placeholder="Etiqueta (ej: Imprescindible)"
                  className="w-full bg-[#1a2332] text-xs text-white px-2.5 py-1.5 rounded-lg border border-[#2b3a4e]"
                />
                <textarea
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  placeholder="Tu opinión..."
                  rows={2}
                  className="w-full bg-[#1a2332] text-xs text-white p-2.5 rounded-lg border border-[#2b3a4e]"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-[#06b6d4] text-black font-bold text-xs rounded-lg"
                >
                  Publicar
                </button>
              </form>
            )}

            <div className="space-y-2">
              {game.reviews.slice(0, 2).map((rev) => (
                <div key={rev.id} className="bg-[#131923] p-3 rounded-xl border border-[#1f2a3a] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <img src={rev.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                    <span className="text-xs font-bold text-white">{rev.author}</span>
                    <span className="text-[10px] text-[#22d3ee] bg-[#06b6d4]/10 px-1.5 py-0.2 rounded">
                      {rev.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-3">"{rev.content}"</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* DESKTOP 2-COLUMN LAYOUT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-32 sm:w-44 aspect-[3/4] rounded-xl overflow-hidden bg-[#141b26] border border-[#233145] shrink-0 shadow-xl">
                <img
                  src={game.coverImage}
                  alt={game.title}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (game.steamAppId && !target.dataset.fallback) {
                      target.dataset.fallback = '1';
                      target.src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steamAppId}/header.jpg`;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3 flex-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {game.title}
                </h1>

                <div className="flex flex-wrap items-center gap-2">
                  {game.platforms.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/30"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {game.categories.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-0.5 rounded text-xs font-medium bg-[#141d2a] text-gray-300 border border-[#233042]"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1 text-sm">
                  <span className="font-extrabold text-white text-base">{game.rating}/5</span>
                  <div className="flex items-center text-[#f59e0b]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    ({(game.ratingCount / 1000).toFixed(1)}k valoraciones)
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => toggleWishlist(game.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                      inWishlist
                        ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#22d3ee]'
                        : 'bg-[#18212e] border-[#29374a] text-gray-200 hover:text-white hover:border-[#38bdf8]'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${inWishlist ? 'fill-[#22d3ee]' : ''}`} />
                    <span>{inWishlist ? 'En tu Wishlist' : '+ Añadir a wishlist'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!currentUser) {
                        openAuthModal('login', 'Inicia sesión para recibir avisos de bajadas de precio.');
                        return;
                      }
                      openAlertModal(game.id);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      (alertSettings.customGameIds?.includes(game.id) || alertSettings.scope === 'all') && alertSettings.enabled
                        ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                        : 'bg-[#18212e] border-[#29374a] text-gray-200 hover:text-white hover:border-[#38bdf8]'
                    }`}
                  >
                    <Bell className="w-4 h-4 text-[#38bdf8]" />
                    <span>Crear aviso de precio</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg bg-[#18212e] border border-[#29374a] text-gray-300 hover:text-white"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Media Section */}
            <div className="space-y-4 pt-4 border-t border-[#1f2937]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Fotos y Vídeos Oficiales</span>
                  </h2>
                  {isMediaLoading ? (
                    <span className="flex items-center gap-1.5 text-xs text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded-full border border-[#38bdf8]/20">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Cargando de Steam...</span>
                    </span>
                  ) : mediaAutoLoaded ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Sincronizado con Steam</span>
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  {videos.length > 0 && (
                    <button
                      onClick={() => setSelectedMediaType('video')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                        selectedMediaType === 'video'
                          ? 'bg-[#06b6d4] text-black font-bold shadow-md shadow-cyan-500/20'
                          : 'bg-[#1a2332] text-gray-300 hover:text-white'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Tráileres ({videos.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedMediaType('photo')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      selectedMediaType === 'photo'
                        ? 'bg-[#06b6d4] text-black font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-[#1a2332] text-gray-300 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Capturas HD ({screenshots.length})</span>
                  </button>
                </div>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#222d3d] flex items-center justify-center shadow-2xl group">
                {selectedMediaType === 'video' && activeVideo ? (
                  <VideoPlayer
                    key={activeVideo.videoUrl}
                    src={activeVideo.videoUrl}
                    poster={activeVideo.thumbnail}
                    title={activeVideo.title}
                  />
                ) : (
                  <div className="w-full h-full relative flex items-center justify-center bg-[#0d131d]">
                    <img
                      src={activeScreenshot}
                      alt={`${game.title} captura`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = game.coverImage;
                      }}
                      className="w-full h-full object-contain"
                    />

                    {/* Previous Photo Button */}
                    {screenshots.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1));
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 hover:bg-[#06b6d4] text-white hover:text-black border border-white/20 transition-all cursor-pointer shadow-xl z-20 hover:scale-110 active:scale-95"
                        title="Foto anterior"
                      >
                        <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    )}

                    {/* Next Photo Button */}
                    {screenshots.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoIndex((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 hover:bg-[#06b6d4] text-white hover:text-black border border-white/20 transition-all cursor-pointer shadow-xl z-20 hover:scale-110 active:scale-95"
                        title="Siguiente foto"
                      >
                        <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    )}

                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-mono text-gray-300 z-10">
                      Captura {selectedPhotoIndex + 1} de {screenshots.length}
                    </div>
                  </div>
                )}
              </div>

              {/* THUMBNAILS CAROUSEL: ALL VIDEOS AND SCREENSHOTS */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Galería interactiva (haz clic en cualquier foto o tráiler para reproducir)</span>
                  <span>{videos.length} vídeos • {screenshots.length} capturas</span>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-gray-700">
                  
                  {/* All Videos Thumbnails */}
                  {videos.map((vid, idx) => (
                    <div
                      key={vid.id || idx}
                      onClick={() => {
                        setSelectedVideoIndex(idx);
                        setSelectedMediaType('video');
                      }}
                      className={`relative w-28 h-16 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all group ${
                        selectedMediaType === 'video' && selectedVideoIndex === idx
                          ? 'border-[#06b6d4] scale-95 shadow-md shadow-cyan-500/30'
                          : 'border-[#26354a] opacity-75 hover:opacity-100 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={vid.thumbnail || game.coverImage}
                        alt={vid.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = game.coverImage;
                        }}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-[#06b6d4] flex items-center justify-center shadow-lg">
                          <Play className="w-3.5 h-3.5 text-black fill-black translate-x-0.2" />
                        </div>
                      </div>
                      <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-white drop-shadow truncate bg-black/70 px-1 rounded">
                        {vid.title || `Tráiler ${idx + 1}`}
                      </span>
                    </div>
                  ))}

                  {/* All Screenshots Thumbnails */}
                  {screenshots.map((shot, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedPhotoIndex(idx);
                        setSelectedMediaType('photo');
                      }}
                      className={`relative w-28 h-16 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all group ${
                        selectedMediaType === 'photo' && selectedPhotoIndex === idx
                          ? 'border-[#06b6d4] scale-95 shadow-md shadow-cyan-500/30'
                          : 'border-[#26354a] opacity-75 hover:opacity-100 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={shot}
                        alt={`Captura ${idx + 1}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = game.coverImage;
                        }}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono text-gray-200 bg-black/70 px-1 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 pt-4 border-t border-[#1f2937]">
              <h2 className="text-base font-bold text-white tracking-wide">
                Descripción del Juego
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {game.description}
              </p>
            </div>

            {/* Community Reviews */}
            <div className="space-y-4 pt-4 border-t border-[#1f2937]">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Comunidad recomienda
                </h2>
                <button
                  onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
                  className="text-xs font-semibold text-[#06b6d4] hover:underline"
                >
                  {isReviewFormOpen ? 'Cancelar' : '+ Dejar mi opinión'}
                </button>
              </div>

              {isReviewFormOpen && (
                <form onSubmit={handleAddReview} className="bg-[#141b25] p-4 rounded-xl border border-[#233145] space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase">Escribe tu recomendación</h3>
                  <input
                    type="text"
                    value={newReviewBadge}
                    onChange={(e) => setNewReviewBadge(e.target.value)}
                    placeholder="Etiqueta (ej: Imprescindible, Muy divertido)"
                    className="w-full bg-[#1a2332] text-xs text-white px-3 py-1.5 rounded-lg border border-[#2b3a4e]"
                  />
                  <textarea
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="¿Por qué recomiendas este juego?"
                    rows={3}
                    className="w-full bg-[#1a2332] text-xs text-white p-3 rounded-lg border border-[#2b3a4e]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#06b6d4] text-black font-bold text-xs rounded-lg"
                  >
                    Publicar recomendación
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {game.reviews.slice(0, 3).map((rev) => (
                  <div key={rev.id} className="bg-[#131923] p-4 rounded-xl border border-[#1f2a3a] space-y-3">
                    <div className="flex items-center gap-2">
                      <img src={rev.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-bold text-white">{rev.badge || 'Recomendado'}</p>
                        <p className="text-[11px] text-gray-400">{rev.author}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">
                      "{rev.content}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Desktop Right Sidebar */}
          <aside className="lg:col-span-4 bg-[#121822] p-5 rounded-2xl border border-[#1f2937] space-y-4 sticky top-20">
            <h2 className="text-base font-extrabold text-white tracking-wide">
              Mejores precios
            </h2>

            <div className="space-y-2.5">
              {game.stores.map((st, idx) => (
                <div
                  key={idx}
                  className="bg-[#17202c] p-3 rounded-xl border border-[#222f42] flex items-center justify-between gap-3 hover:border-[#38bdf8]/50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">
                      {st.storeName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {st.discountPercent > 0 && st.currentPrice < st.originalPrice ? (
                        <>
                          <span className="bg-[#f59e0b] text-black font-black text-[10px] px-1.5 py-0.2 rounded">
                            -{st.discountPercent}%
                          </span>
                          <span className="text-[11px] text-gray-500 line-through">
                            {st.originalPrice.toFixed(2).replace('.', ',')} €
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-400">
                          Precio oficial
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black text-white">
                      {st.currentPrice.toFixed(2).replace('.', ',')} €
                    </span>

                    <button
                      onClick={() => handleExternalStore(st.url, st.storeName)}
                      className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-extrabold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <span>Ver oferta</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] text-black font-bold text-xs transition-colors shadow-md hover:shadow-cyan-500/20 active:scale-95"
            >
              Comparar todas las {game.stores.length} ofertas
            </button>
          </aside>
        </div>
      )}

      {/* COMPARISON MODAL FOR ALL STORES */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121822] w-full max-w-2xl rounded-2xl border border-[#233145] p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2838]">
              <div>
                <h3 className="text-base font-bold text-white">
                  Comparador de Precios: {game.title}
                </h3>
                <p className="text-xs text-gray-400">
                  Todas las tiendas oficiales con disponibilidad y descuentos actualizados
                </p>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {game.stores.map((st, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    st.isBest 
                      ? 'bg-[#06b6d4]/10 border-[#06b6d4]/50 shadow-sm' 
                      : 'bg-[#17202c] border-[#222f42] hover:border-[#38bdf8]/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{st.storeName}</span>
                      {st.isBest && (
                        <span className="text-[10px] font-extrabold text-[#22d3ee] bg-[#06b6d4]/20 px-2 py-0.5 rounded-full border border-[#06b6d4]/40">
                          Mejor Precio
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {st.discountPercent > 0 && st.currentPrice < st.originalPrice ? (
                        <>
                          <span className="bg-[#f59e0b] text-black font-black text-[11px] px-1.5 py-0.2 rounded">
                            -{st.discountPercent}%
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {st.originalPrice.toFixed(2).replace('.', ',')} €
                          </span>
                          <span className="text-xs text-emerald-400 font-semibold">
                            Ahorras {(st.originalPrice - st.currentPrice).toFixed(2).replace('.', ',')} €
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Precio estándar oficial
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-white">
                      {st.currentPrice.toFixed(2).replace('.', ',')} €
                    </span>
                    <button
                      onClick={() => handleExternalStore(st.url, st.storeName)}
                      className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-extrabold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5"
                    >
                      <span>Ir a la tienda</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1f2838]">
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-2 bg-[#1a2332] text-xs font-semibold text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                Cerrar comparador
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
