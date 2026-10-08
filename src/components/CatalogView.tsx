import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bookmark, ChevronDown, Check, RotateCcw, Filter, SlidersHorizontal } from 'lucide-react';
import { Platform, Category, Game } from '../types/game';

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'PC', label: 'PC (Steam)' },
  { id: 'PlayStation', label: 'PlayStation' },
  { id: 'Xbox', label: 'Xbox' },
  { id: 'Nintendo', label: 'Nintendo' },
  { id: 'Epic Games', label: 'Epic Games' },
  { id: 'GOG', label: 'GOG' }
];

const CATEGORIES: Category[] = [
  'Acción',
  'Aventura',
  'RPG',
  'Estrategia',
  'Simulación',
  'Deportes',
  'Indie',
  'Carreras',
  'Terror'
];

export const CatalogView: React.FC = () => {
  const {
    filteredGames,
    selectedPlatforms,
    togglePlatform,
    selectedCategories,
    toggleCategory,
    priceRange,
    setPriceRange,
    minDiscount,
    setMinDiscount,
    sortBy,
    setSortBy,
    clearFilters,
    setSelectedGame,
    toggleWishlist,
    currentUser,
    refreshSteamPrices,
    viewMode
  } = useApp();

  // Automatic background refresh from Steam on mount
  useEffect(() => {
    refreshSteamPrices();
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Reset to page 1 whenever filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatforms, selectedCategories, priceRange, minDiscount, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / pageSize));
  const paginatedGames = pageSize >= filteredGames.length 
    ? filteredGames 
    : filteredGames.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isMobile = viewMode === 'mobile';
  const activeFiltersCount = selectedPlatforms.length + selectedCategories.length + (minDiscount > 0 ? 1 : 0);

  return (
    <div className={`w-full max-w-7xl mx-auto select-none ${isMobile ? 'px-3 py-3 space-y-3' : 'px-4 lg:px-8 py-6'}`}>
      
      {/* MOBILE FILTER & SORT BAR (Matches AI Design) */}
      {isMobile && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                activeFiltersCount > 0
                  ? 'bg-[#06b6d4]/15 border-[#06b6d4]/50 text-[#22d3ee]'
                  : 'bg-[#141b27] border-[#223145] text-gray-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Filtros {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isMobileFiltersOpen ? 'rotate-180 text-[#38bdf8]' : ''}`} />
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-[#141b27] text-xs font-bold text-white border border-[#223145] rounded-xl px-3 py-2 pr-7 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="discount">Descuento</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="rating">Valorados</option>
                <option value="title">Título A-Z</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Collapsible Mobile Filter Drawer */}
          {isMobileFiltersOpen && (
            <div className="bg-[#121822] p-4 rounded-xl border border-[#223145] space-y-4 animate-in fade-in slide-in-from-top-2 duration-150 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#1f2937]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Filtrar Catálogo</span>
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-400 hover:text-[#38bdf8] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpiar</span>
                </button>
              </div>

              {/* Plataformas */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Plataformas</span>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((plat) => {
                    const checked = selectedPlatforms.includes(plat.id);
                    return (
                      <button
                        key={plat.id}
                        onClick={() => togglePlatform(plat.id)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          checked
                            ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#22d3ee]'
                            : 'bg-[#151d2a] border-[#222e3f] text-gray-400'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? 'bg-[#06b6d4] border-[#06b6d4] text-black' : 'border-gray-600'}`}>
                          {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate">{plat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categorías */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Categorías</span>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#22d3ee]'
                            : 'bg-[#151d2a] border-[#222e3f] text-gray-400'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* LEFT SIDEBAR: FILTROS (Desktop only or when not in mobile view) */}
        {!isMobile && (
          <aside className="w-full lg:w-64 shrink-0 space-y-6 bg-[#121822] p-5 rounded-2xl border border-[#1f2937]">
            <div className="flex items-center justify-between pb-3 border-b border-[#222d3d]">
              <h2 className="text-base font-bold text-white tracking-wide">Filtros</h2>
              <button
                onClick={clearFilters}
                title="Restablecer todos los filtros"
                className="text-xs text-gray-400 hover:text-[#38bdf8] flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            </div>

            {/* Plataformas */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Plataformas
              </h3>
              <div className="space-y-2">
                {PLATFORMS.map((plat) => {
                  const checked = selectedPlatforms.includes(plat.id);
                  return (
                    <label
                      key={plat.id}
                      className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-white cursor-pointer select-none"
                    >
                      <div
                        onClick={() => togglePlatform(plat.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          checked
                            ? 'bg-[#06b6d4] border-[#06b6d4] text-black'
                            : 'border-gray-600 bg-[#17212e]'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{plat.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Categorías */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Categorías
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                        active
                          ? 'bg-[#06b6d4] text-black border-[#06b6d4] font-semibold'
                          : 'bg-[#17202c] text-gray-300 border-[#253245] hover:text-white hover:border-[#38bdf8]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Descuento mínimo */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-300 uppercase tracking-wider">Descuento</span>
                <span className="font-bold text-[#38bdf8]">
                  {minDiscount === 0 ? 'Cualquiera' : `≥ ${minDiscount}%`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 20, 50, 75].map((d) => (
                  <button
                    key={d}
                    onClick={() => setMinDiscount(d)}
                    className={`flex-1 py-1 rounded text-xs font-semibold border transition-all ${
                      minDiscount === d
                        ? 'bg-[#f59e0b] text-black border-[#f59e0b]'
                        : 'bg-[#17202c] text-gray-400 border-[#253245] hover:text-white'
                    }`}
                  >
                    {d === 0 ? 'Todos' : `-${d}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Rango de Precio Máximo */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-300 uppercase tracking-wider">Precio Máx.</span>
                <span className="font-bold text-white">
                  {priceRange >= 100 ? 'Sin límite' : `${priceRange} €`}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-[#06b6d4] cursor-pointer"
              />
            </div>
          </aside>
        )}

        {/* MAIN RESULTS SECTION */}
        <main className="flex-1 min-w-0 space-y-4">
          
          {/* Header Bar Desktop */}
          {!isMobile && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1f2937]">
              <div>
                <h1 className="text-xl font-extrabold text-white">
                  Catálogo de Videojuegos
                </h1>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {filteredGames.length} juegos encontrados con los filtros activos
                </p>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-xs text-gray-400">Ordenar por:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-[#121822] text-xs font-semibold text-white border border-[#253245] rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-[#38bdf8] cursor-pointer appearance-none"
                  >
                    <option value="discount">Mejores descuentos</option>
                    <option value="price_asc">Menor precio</option>
                    <option value="price_desc">Mayor precio</option>
                    <option value="rating">Mejor valorados</option>
                    <option value="title">Título (A-Z)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Cards List / Grid: 2 Columns on Mobile, Rows on Desktop */}
          {filteredGames.length === 0 ? (
            <div className="text-center py-12 bg-[#121822] rounded-2xl border border-[#1f2937] p-6 space-y-3">
              <p className="text-gray-400 text-xs sm:text-sm">No se encontraron juegos con los filtros seleccionados.</p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-[#06b6d4] text-black text-xs font-bold rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Restablecer filtros
              </button>
            </div>
          ) : isMobile ? (
            /* MOBILE 2-COLUMN GRID (Never cuts off) */
            <div className="grid grid-cols-2 gap-2.5">
              {paginatedGames.map((game) => {
                const inWish = currentUser?.wishlist.includes(game.id);
                return (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className="bg-[#131b26] border border-[#202c3d] hover:border-[#38bdf8]/50 rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-150 active:scale-[0.98] shadow-md group cursor-pointer"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0c1017]">
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steamAppId || 1245620}/capsule_616x353.jpg`;
                        }}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {game.discountPercent > 0 && game.currentPrice < game.originalPrice && (
                        <div className="absolute top-1.5 left-1.5 bg-[#06b6d4] text-black font-black text-[10px] px-1.5 py-0.5 rounded-md shadow-sm">
                          -{game.discountPercent}%
                        </div>
                      )}
                      <div className="absolute bottom-1.5 left-1.5 bg-black/85 backdrop-blur-xs border border-white/10 px-1.5 py-0.5 rounded text-white font-black text-[11px] shadow-md">
                        {game.currentPrice.toFixed(2).replace('.', ',')} €
                      </div>
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

                    <div className="p-2 space-y-1">
                      <h3 className="font-bold text-xs text-white line-clamp-1 truncate group-hover:text-[#38bdf8] transition-colors">
                        {game.title}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="truncate max-w-[80px]">{game.platforms[0] || 'Steam'}</span>
                        <span className="line-through text-gray-500">
                          {game.originalPrice.toFixed(2).replace('.', ',')} €
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DESKTOP LIST ROWS */
            <div className="space-y-3">
              {paginatedGames.map((game) => {
                const inWish = currentUser?.wishlist.includes(game.id);

                return (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className="bg-[#131a24] hover:bg-[#18212e] border border-[#1f2c3d] hover:border-[#334661] rounded-xl p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-150 cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-24 md:w-36 h-16 md:h-20 rounded-lg overflow-hidden bg-[#0d131d] shrink-0 border border-[#222d3d] relative">
                        <img
                          src={game.coverImage}
                          alt={game.title}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steamAppId || 1245620}/capsule_616x353.jpg`;
                          }}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <h3 className="font-bold text-sm md:text-base text-white group-hover:text-[#38bdf8] transition-colors truncate">
                          {game.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="font-medium text-gray-300">
                            {game.platforms.join(', ')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {game.categories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 text-[11px] font-medium bg-[#1c2636] text-gray-300 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1f2c3d]">
                      {game.discountPercent > 0 && game.currentPrice < game.originalPrice ? (
                        <span className="bg-[#f59e0b] text-black font-extrabold text-xs md:text-sm px-2.5 py-1 rounded-lg shadow-sm">
                          -{game.discountPercent}%
                        </span>
                      ) : (
                        <span className="bg-[#1c2636] text-gray-400 font-bold text-xs px-2.5 py-1 rounded-lg border border-[#2b3a4e]">
                          Estándar
                        </span>
                      )}

                      <div className="flex flex-col text-right">
                        {game.discountPercent > 0 && game.currentPrice < game.originalPrice && (
                          <span className="text-[11px] md:text-xs text-gray-400 line-through">
                            {game.originalPrice.toFixed(2).replace('.', ',')} €
                          </span>
                        )}
                        <span className="text-base md:text-lg font-black text-white">
                          {game.currentPrice.toFixed(2).replace('.', ',')} €
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(game.id);
                        }}
                        className={`p-2 rounded-lg border transition-all ${
                          inWish
                            ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#22d3ee]'
                            : 'bg-[#18212e] border-[#2b3a4e] text-gray-400 hover:text-white'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${inWish ? 'fill-[#22d3ee]' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#1f2937]">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Mostrar:</span>
              {[24, 48, 96].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    pageSize === size
                      ? 'bg-[#06b6d4] text-black font-bold'
                      : 'bg-[#141b26] text-gray-400 hover:text-white border border-[#222f42]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#141b26] border border-[#222f42] text-xs font-semibold text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                
                <span className="text-xs text-gray-400 px-2 font-mono">
                  {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#141b26] border border-[#222f42] text-xs font-semibold text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};
