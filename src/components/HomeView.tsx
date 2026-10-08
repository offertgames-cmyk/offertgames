import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Bookmark, ChevronDown, ExternalLink } from 'lucide-react';
import { Game } from '../types/game';

const GENRE_TABS = [
  { id: 'Todos', label: 'Todas las Ofertas' },
  { id: 'Shooters', label: 'Shooters (FPS)' },
  { id: 'Estrategia', label: 'Estrategia' },
  { id: 'RPG', label: 'Rol & RPG' },
  { id: 'Acción', label: 'Acción' },
  { id: 'Aventura', label: 'Aventura' },
  { id: 'Carreras', label: 'Carreras' },
  { id: 'Indie', label: 'Indie' }
];

export const HomeView: React.FC = () => {
  const { games, setSelectedGame, toggleWishlist, currentUser, viewMode } = useApp();

  // Find the exact mockup hero games
  const heroCandidates = [
    games.find(g => g.slug.includes('witcher-3') && g.steamAppId === 292030) || games[0],
    games.find(g => g.slug.includes('cyberpunk')) || games[6],
    games.find(g => g.slug.includes('elden-ring') && g.steamAppId === 1245620) || games[1],
    games.find(g => g.slug.includes('baldur') && g.steamAppId === 1086940) || games[4],
    games.find(g => g.slug.includes('red-dead') && g.steamAppId === 1174180) || games[3]
  ].filter(Boolean) as Game[];

  const [heroIndex, setHeroIndex] = useState(0);
  const activeHero = heroCandidates[heroIndex] || games[0];

  // Number of cards to display
  const [visibleCount, setVisibleCount] = useState(16);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Compute registered user genres from wishlist
  const userSavedGenreSummary = useMemo(() => {
    if (!currentUser?.wishlist || currentUser.wishlist.length === 0) return null;
    const wishGames = games.filter(g => currentUser.wishlist.includes(g.id));
    const counts: Record<string, number> = {};
    wishGames.forEach(g => {
      const full = `${(g.categories || []).join(' ')} ${g.title} ${g.description || ''}`.toLowerCase();
      if (full.includes('shoot') || full.includes('fps') || full.includes('dispar') || full.includes('doom') || full.includes('cyberpunk')) counts['Shooters'] = (counts['Shooters'] || 0) + 1;
      if (full.includes('estrateg') || full.includes('strategy') || full.includes('tactic') || full.includes('civilization')) counts['Estrategia'] = (counts['Estrategia'] || 0) + 1;
      if (full.includes('rpg') || full.includes('rol') || full.includes('witcher') || full.includes('elden') || full.includes('baldur')) counts['RPG'] = (counts['RPG'] || 0) + 1;
      if (full.includes('acción') || full.includes('action')) counts['Acción'] = (counts['Acción'] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [currentUser?.wishlist, games]);

  // Order games starting with the 4 exact featured games from the photo
  const allDeals = useMemo(() => {
    const top4 = [
      games.find(g => g.slug.includes('elden-ring') && g.steamAppId === 1245620),
      games.find(g => g.slug.includes('cyberpunk') && g.steamAppId === 1091500),
      games.find(g => g.slug.includes('hogwarts-legacy') && g.steamAppId === 990080),
      games.find(g => g.slug.includes('red-dead') && g.steamAppId === 1174180),
      games.find(g => g.slug.includes('baldur') && g.steamAppId === 1086940)
    ].filter(Boolean) as Game[];

    const top4Ids = new Set(top4.map(g => g.id));
    let rest = games.filter(g => !top4Ids.has(g.id));
    let combined = [...top4, ...rest];

    if (selectedCategory !== 'Todos') {
      const lower = selectedCategory.toLowerCase();
      combined = combined.filter(g => {
        const full = `${(g.categories || []).join(' ')} ${g.title} ${g.description || ''}`.toLowerCase();
        if (lower === 'shooters') {
          return full.includes('shoot') || full.includes('fps') || full.includes('dispar') || full.includes('doom') || full.includes('cyberpunk') || full.includes('battlefield') || full.includes('sniper') || full.includes('warfare') || full.includes('counter');
        }
        if (lower === 'estrategia') {
          return full.includes('estrateg') || full.includes('strategy') || full.includes('tactic') || full.includes('civilization') || full.includes('total war') || full.includes('crusader') || full.includes('empire') || full.includes('rts');
        }
        if (lower === 'rpg') {
          return full.includes('rpg') || full.includes('rol') || full.includes('witcher') || full.includes('elden') || full.includes('baldur') || full.includes('souls');
        }
        if (lower === 'acción') {
          return full.includes('acci') || full.includes('action') || full.includes('lucha') || full.includes('combate');
        }
        return full.includes(lower);
      });
    }

    return combined;
  }, [games, selectedCategory]);

  const displayedGames = allDeals.slice(0, visibleCount);
  const isMobile = viewMode === 'mobile';

  return (
    <div className={`w-full max-w-7xl mx-auto select-none ${isMobile ? 'px-3 py-3 space-y-4' : 'px-4 lg:px-8 py-6 space-y-8'}`}>
      
      {/* HERO BANNER - Adaptable for Mobile and Desktop based on AI Design */}
      {isMobile ? (
        /* MOBILE HERO BANNER (Matches mobile_ui_home AI layout) */
        <div 
          onClick={() => setSelectedGame(activeHero)}
          className="relative rounded-2xl overflow-hidden bg-gradient-to-t from-[#0b0e14] via-[#111824] to-[#1a2436] border border-[#233147] shadow-xl h-[260px] flex flex-col justify-between cursor-pointer group"
        >
          {/* Background Game Art */}
          <div className="absolute inset-0 z-0">
            <img
              src={activeHero.coverImage}
              alt={activeHero.title}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (activeHero.steamAppId && !target.dataset.fallback) {
                  target.dataset.fallback = '1';
                  target.src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${activeHero.steamAppId}/capsule_616x353.jpg`;
                }
              }}
              className="w-full h-full object-cover object-center opacity-85 group-hover:scale-105 transition-transform duration-500"
            />
            {/* Dark gradient fade for crisp readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090d14] via-[#090d14]/65 to-transparent z-10"></div>
          </div>

          {/* Top Row: Tag + Glowing Discount Badge */}
          <div className="relative z-20 p-3.5 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#06b6d4]/20 border border-[#06b6d4]/50 text-[#22d3ee] text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse"></span>
              DESTACADA
            </div>

            {activeHero.discountPercent > 0 && activeHero.currentPrice < activeHero.originalPrice && (
              <div className="bg-[#06b6d4]/20 border border-[#06b6d4] text-[#22d3ee] font-black text-sm px-2.5 py-1 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] backdrop-blur-xs">
                -{activeHero.discountPercent}%
              </div>
            )}
          </div>

          {/* Bottom Row: Title, Price Pill, Platforms, Bookmark */}
          <div className="relative z-20 p-3.5 space-y-2">
            <h2 className="text-base font-black text-white leading-tight drop-shadow-md line-clamp-1 group-hover:text-[#38bdf8] transition-colors">
              {activeHero.title}
            </h2>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Vibrant Price Pill */}
                <div className="bg-gradient-to-r from-[#06b6d4] to-[#38bdf8] text-black font-black text-xs px-2.5 py-1 rounded-lg shadow-md flex items-baseline gap-1">
                  <span>{activeHero.currentPrice.toFixed(2).replace('.', ',')} €</span>
                </div>
                {activeHero.discountPercent > 0 && activeHero.currentPrice < activeHero.originalPrice && (
                  <span className="text-[11px] text-gray-400 line-through">
                    {activeHero.originalPrice.toFixed(2).replace('.', ',')} €
                  </span>
                )}
              </div>

              {/* Platform Chips */}
              <div className="flex items-center gap-1">
                {activeHero.platforms.slice(0, 3).map((plat) => (
                  <span
                    key={plat}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#141d2a]/80 text-gray-300 border border-[#2b3a4e]"
                  >
                    {plat === 'PlayStation' ? 'PS5' : plat}
                  </span>
                ))}

                {/* Bookmark */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(activeHero.id);
                  }}
                  className={`p-1.5 rounded-lg border transition-all ${
                    currentUser?.wishlist.includes(activeHero.id)
                      ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#22d3ee]'
                      : 'bg-[#141b27]/80 border-[#2b3a4e] text-gray-300'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${currentUser?.wishlist.includes(activeHero.id) ? 'fill-[#22d3ee]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="flex justify-center items-center gap-1.5 pt-1">
              {heroCandidates.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeroIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    heroIndex === idx ? 'w-5 bg-[#38bdf8]' : 'w-1.5 bg-gray-600'
                  }`}
                  aria-label={`Ver oferta ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* DESKTOP HERO BANNER */
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#0d131d] via-[#131b28] to-[#1c2738] border border-[#233044] shadow-2xl min-h-[380px] flex flex-col justify-between">
          <div className="absolute right-0 top-0 w-full md:w-3/5 h-full pointer-events-none z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d131d] via-[#0d131d]/60 to-transparent z-10 hidden md:block"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d131d] via-transparent to-transparent z-10 md:hidden"></div>
            <img
              src={activeHero.coverImage}
              alt={activeHero.title}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (activeHero.steamAppId && !target.dataset.fallback) {
                  target.dataset.fallback = '1';
                  target.src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${activeHero.steamAppId}/capsule_616x353.jpg`;
                }
              }}
              className="w-full h-full object-cover object-center md:object-right opacity-80 transition-all duration-700 transform hover:scale-105"
            />
          </div>

          <div className="relative z-10 p-6 md:p-10 max-w-2xl flex flex-col justify-between flex-1">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#06b6d4]/15 border border-[#06b6d4]/40 text-[#22d3ee] text-xs font-bold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse"></span>
                OFERTA DESTACADA
              </div>

              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
                {activeHero.title}
              </h1>

              <p className="text-sm md:text-base text-gray-300 font-normal leading-relaxed line-clamp-2 max-w-lg">
                {activeHero.subtitle || activeHero.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {activeHero.platforms.map((plat) => (
                  <span
                    key={plat}
                    className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#1a2332] text-gray-300 border border-[#2b3a4e]"
                  >
                    {plat}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6 flex flex-wrap items-center gap-4">
              {activeHero.discountPercent > 0 && activeHero.currentPrice < activeHero.originalPrice && (
                <div className="bg-[#f59e0b] text-black font-extrabold text-lg md:text-xl px-3 py-1.5 rounded-lg shadow-sm">
                  -{activeHero.discountPercent}%
                </div>
              )}

              <div className="flex flex-col">
                {activeHero.discountPercent > 0 && activeHero.currentPrice < activeHero.originalPrice && (
                  <span className="text-xs md:text-sm text-gray-400 line-through">
                    {activeHero.originalPrice.toFixed(2).replace('.', ',')} €
                  </span>
                )}
                <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {activeHero.currentPrice.toFixed(2).replace('.', ',')} €
                </span>
              </div>

              <button
                onClick={() => setSelectedGame(activeHero)}
                className="ml-2 bg-[#06b6d4] hover:bg-[#0891b2] text-black font-bold text-sm px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-cyan-500/25 active:scale-95 cursor-pointer"
              >
                <span>Ver oferta</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                onClick={() => toggleWishlist(activeHero.id)}
                title={currentUser?.wishlist.includes(activeHero.id) ? "Guardado en wishlist" : "Guardar en wishlist"}
                className={`p-2.5 rounded-lg border transition-all ${
                  currentUser?.wishlist.includes(activeHero.id)
                    ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#22d3ee]'
                    : 'bg-[#18212e] border-[#2b3a4e] text-gray-300 hover:text-white hover:border-[#38bdf8]'
                }`}
              >
                <Bookmark className={`w-5 h-5 ${currentUser?.wishlist.includes(activeHero.id) ? 'fill-[#22d3ee]' : ''}`} />
              </button>
            </div>
          </div>

          <div className="relative z-10 px-6 pb-4 flex justify-end items-center gap-2">
            {heroCandidates.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setHeroIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  heroIndex === idx ? 'w-6 bg-white' : 'w-2 bg-gray-600 hover:bg-gray-400'
                }`}
                aria-label={`Ver oferta ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY & GENRE SELECTOR (Simple, Visual, Interactivo) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {GENRE_TABS.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all border shadow-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-[#06b6d4] to-[#38bdf8] text-black border-transparent shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105'
                    : 'bg-[#121926] border-[#223145] text-gray-300 hover:text-white hover:border-[#38bdf8]/40'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* TUS PREFERENCIAS REGISTRADAS (Visual & Sencillo) */}
        <div className="bg-gradient-to-r from-[#101828] via-[#142136] to-[#101828] border border-[#1f2d42] rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Bookmark className="w-5 h-5 fill-cyan-400/20" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Tus Preferencias Registradas
              </div>
              <div className="text-sm font-extrabold text-white mt-0.5 flex flex-wrap items-center gap-1.5">
                {userSavedGenreSummary && userSavedGenreSummary.length > 0 ? (
                  <>
                    <span className="text-gray-300 font-normal text-xs mr-1">Tus géneros favoritos:</span>
                    {userSavedGenreSummary.map(([genre, count]) => (
                      <span 
                        key={genre} 
                        onClick={() => setSelectedCategory(genre)}
                        className="cursor-pointer hover:border-cyan-400 px-2.5 py-0.5 rounded-lg bg-[#0c131f] text-cyan-300 border border-cyan-800/80 text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        title={`Filtrar por ${genre}`}
                      >
                        <span>{genre}</span>
                        <span className="text-cyan-400 font-extrabold text-[10px]">({count})</span>
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-gray-300 text-xs font-normal">
                    Haz clic en el icono <strong className="text-cyan-400">Guardar</strong> de cualquier juego para registrar tus géneros (Shooters, Estrategia...).
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Ofertas destacadas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#1f2937]/60">
          <h2 className={`${isMobile ? 'text-base font-extrabold' : 'text-xl md:text-2xl font-black'} text-white tracking-wide`}>
            Ofertas destacadas
          </h2>
          <span className="text-[11px] text-gray-400 font-mono">
            {allDeals.length} ofertas
          </span>
        </div>

        {/* CARDS GRID: 2 COLUMNS ON MOBILE (Matches AI Design), 4 COLUMNS ON DESKTOP */}
        <div className={isMobile ? 'grid grid-cols-2 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'}>
          {displayedGames.map((game) => {
            const inWish = currentUser?.wishlist.includes(game.id);

            if (isMobile) {
              /* MOBILE COMPACT CARD (Exact replica of mobile_ui_home cards) */
              return (
                <div
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
                  className="bg-[#131b26] border border-[#202c3d] hover:border-[#38bdf8]/50 rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-150 active:scale-[0.98] shadow-md group cursor-pointer"
                >
                  {/* Image with overlay tags */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0c1017]">
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (game.steamAppId && !target.dataset.fallback) {
                          target.dataset.fallback = '1';
                          target.src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steamAppId}/capsule_616x353.jpg`;
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    {/* Glowing Discount Tag (Top-Left) */}
                    {game.discountPercent > 0 && game.currentPrice < game.originalPrice && (
                      <div className="absolute top-1.5 left-1.5 bg-[#06b6d4] text-black font-black text-[10px] px-1.5 py-0.5 rounded-md shadow-sm">
                        -{game.discountPercent}%
                      </div>
                    )}

                    {/* Price Tag Pill (Bottom-Left of Image) */}
                    <div className="absolute bottom-1.5 left-1.5 bg-black/85 backdrop-blur-xs border border-white/10 px-2 py-0.5 rounded text-white font-black text-[11px] shadow-md">
                      {game.currentPrice.toFixed(2).replace('.', ',')} €
                    </div>

                    {/* Bookmark Heart (Top-Right of Image) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(game.id);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 backdrop-blur-xs text-gray-300 hover:text-white"
                    >
                      <Bookmark className={`w-3 h-3 ${inWish ? 'fill-[#22d3ee] text-[#22d3ee]' : ''}`} />
                    </button>
                  </div>

                  {/* Card Title & Info */}
                  <div className="p-2 space-y-1">
                    <h3 className="font-bold text-xs text-white line-clamp-1 truncate group-hover:text-[#38bdf8] transition-colors">
                      {game.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span className="truncate max-w-[80px]">{game.platforms[0] || 'Steam'}</span>
                      {game.discountPercent > 0 && game.currentPrice < game.originalPrice ? (
                        <span className="line-through text-gray-500">
                          {game.originalPrice.toFixed(2).replace('.', ',')} €
                        </span>
                      ) : (
                        <span className="text-gray-400 font-semibold">
                          Oficial
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            /* DESKTOP CARD */
            return (
              <div
                key={game.id}
                className="bg-[#141b26] border border-[#202c3d] hover:border-[#334661] rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-lg group cursor-pointer"
                onClick={() => setSelectedGame(game)}
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0d131d]">
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (game.steamAppId && !target.dataset.fallback) {
                        target.dataset.fallback = '1';
                        target.src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steamAppId}/capsule_616x353.jpg`;
                      }
                    }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141b26] via-transparent to-transparent opacity-80"></div>
                </div>

                <div className="p-3.5 space-y-2">
                  <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-[#38bdf8] transition-colors">
                    {game.title}
                  </h3>

                  <div className="flex items-center justify-between pt-1">
                    {game.discountPercent > 0 && game.currentPrice < game.originalPrice ? (
                      <span className="bg-[#f59e0b] text-black font-extrabold text-xs px-2 py-0.5 rounded">
                        -{game.discountPercent}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs font-semibold">
                        Oficial
                      </span>
                    )}

                    <div className="flex items-baseline gap-1.5">
                      {game.discountPercent > 0 && game.currentPrice < game.originalPrice && (
                        <span className="text-xs text-gray-500 line-through">
                          {game.originalPrice.toFixed(2).replace('.', ',')} €
                        </span>
                      )}
                      <span className="text-base font-extrabold text-white">
                        {game.currentPrice.toFixed(2).replace('.', ',')} €
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(game.id);
                      }}
                      className={`p-1.5 rounded-lg border transition-all ${
                        inWish
                          ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#22d3ee]'
                          : 'bg-[#18212e] border-[#2b3a4e] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${inWish ? 'fill-[#22d3ee]' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MOSTRAR MÁS BUTTON */}
        {visibleCount < allDeals.length && (
          <div className="pt-4 pb-4 flex flex-col items-center justify-center gap-2">
            <button
              onClick={() => setVisibleCount(prev => Math.min(prev + 16, allDeals.length))}
              className={`rounded-xl bg-[#151d2a] hover:bg-[#1c2738] text-white border border-[#26374d] hover:border-[#06b6d4] font-bold flex items-center justify-center gap-2 shadow-xl hover:shadow-cyan-500/10 transition-all active:scale-95 group cursor-pointer ${
                isMobile ? 'w-full py-2.5 text-xs' : 'px-8 py-3 text-sm'
              }`}
            >
              <span>Mostrar más ofertas</span>
              <ChevronDown className="w-4 h-4 text-[#38bdf8] group-hover:translate-y-0.5 transition-transform" />
            </button>
            <span className="text-[11px] text-gray-500 font-mono">
              Mostrando {displayedGames.length} de {allDeals.length} ofertas
            </span>
          </div>
        )}
      </section>

    </div>
  );
};
