import React, { useState, useEffect } from 'react';
import { 
  Newspaper, 
  ExternalLink, 
  Calendar, 
  RefreshCw, 
  Gamepad2, 
  Flame, 
  Sparkles, 
  Clock, 
  Share2,
  Check,
  Languages
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getDailyGameNews, GameNewsItem, translateToSpanish } from '../services/gameNewsService';

export const NewsView: React.FC = () => {
  const { games, setSelectedGame, showToast } = useApp();

  const [news, setNews] = useState<GameNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados de traducción al español
  const [isSpanishMode, setIsSpanishMode] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translations, setTranslations] = useState<Record<string, { title: string; summary: string }>>({});
  const [cardTranslations, setCardTranslations] = useState<Record<string, boolean>>({});

  const todayFormatted = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const loadNews = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      const items = await getDailyGameNews(force);
      setNews(items);
      // Si se fuerza la recarga, reiniciar traducciones para el nuevo conjunto
      if (force) {
        setIsSpanishMode(false);
        setCardTranslations({});
        setTranslations({});
      }
    } catch (err) {
      console.error('[NewsView] Error loading daily news:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  // Función para traducir todas las noticias al español con un solo clic
  const handleToggleTranslateAll = async () => {
    if (isSpanishMode) {
      setIsSpanishMode(false);
      setCardTranslations({});
      showToast('Mostrando noticias en idioma original');
      return;
    }

    const untranslatedItems = news.filter(n => !translations[n.id]);
    if (untranslatedItems.length === 0) {
      setIsSpanishMode(true);
      showToast('Noticias mostradas en español');
      return;
    }

    setIsTranslating(true);
    try {
      const newTranslations: Record<string, { title: string; summary: string }> = { ...translations };

      await Promise.all(
        untranslatedItems.map(async (item) => {
          try {
            const [tTitle, tSummary] = await Promise.all([
              translateToSpanish(item.title),
              translateToSpanish(item.summary)
            ]);
            newTranslations[item.id] = { title: tTitle, summary: tSummary };
          } catch {
            newTranslations[item.id] = { title: item.title, summary: item.summary };
          }
        })
      );

      setTranslations(newTranslations);
      setIsSpanishMode(true);
      showToast('Noticias traducidas al español correctamente');
    } catch (err) {
      console.error('[NewsView] Error translating news:', err);
      showToast('Error al procesar la traducción');
    } finally {
      setIsTranslating(false);
    }
  };

  // Función para traducir una tarjeta individual
  const handleTranslateSingleCard = async (item: GameNewsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentlyActive = isSpanishMode || cardTranslations[item.id];
    if (currentlyActive) {
      setCardTranslations(prev => ({ ...prev, [item.id]: false }));
      return;
    }

    if (!translations[item.id]) {
      try {
        const [tTitle, tSummary] = await Promise.all([
          translateToSpanish(item.title),
          translateToSpanish(item.summary)
        ]);
        setTranslations(prev => ({
          ...prev,
          [item.id]: { title: tTitle, summary: tSummary }
        }));
      } catch {
        // Fallback al texto existente
      }
    }
    setCardTranslations(prev => ({ ...prev, [item.id]: true }));
  };

  // Extraer tags únicos
  const allTags = Array.from(new Set(news.flatMap(n => n.tags || []))).filter(Boolean);

  // Filtrar noticias
  const filteredNews = news.filter(item => {
    const isTranslated = isSpanishMode || cardTranslations[item.id];
    const currentTitle = isTranslated && translations[item.id]?.title ? translations[item.id].title : item.title;
    const currentSummary = isTranslated && translations[item.id]?.summary ? translations[item.id].summary : item.summary;

    const matchesTag = selectedTag === 'todos' || item.tags.includes(selectedTag);
    const matchesSearch = !searchFilter.trim() || 
      item.gameTitle.toLowerCase().includes(searchFilter.toLowerCase()) ||
      currentTitle.toLowerCase().includes(searchFilter.toLowerCase()) ||
      currentSummary.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const handleShare = (item: GameNewsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: `${item.gameTitle}: ${item.title}`,
        url: item.url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      showToast('Enlace de la noticia copiado al portapapeles');
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleGoToGame = (item: GameNewsItem) => {
    const matched = games.find(g => 
      (g.steamAppId && g.steamAppId === item.steamAppId) ||
      g.title.toLowerCase().includes(item.gameTitle.toLowerCase()) ||
      item.gameTitle.toLowerCase().includes(g.title.toLowerCase())
    );

    if (matched) {
      setSelectedGame(matched);
    } else {
      window.open(item.url, '_blank');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* 1. Header SaaS de Noticias Diarias */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e1624] via-[#111927] to-[#0a0f18] border border-[#223247] p-6 sm:p-10 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-[#38bdf8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Edición Diaria Actualizada</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">
              NOTICIAS DE <span className="text-[#38bdf8]">VIDEOJUEGOS</span>
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Selección diaria de 10 a 15 juegos con notas de parche oficiales, novedades y anuncios de desarrollo en tiempo real. Cada día a las 00:00 se renueva la selección con juegos diferentes y se eliminan las anteriores.
            </p>

            <div className="flex items-center gap-4 text-[11px] sm:text-xs text-gray-400 font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#38bdf8]" />
                <span className="capitalize">{todayFormatted}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>{news.length} Juegos cubiertos hoy</span>
              </span>
            </div>
          </div>

          {/* Botones de Acción: Traducir a Español y Actualizar */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* BOTÓN TRADUCIR A ESPAÑOL */}
            <button
              type="button"
              onClick={handleToggleTranslateAll}
              disabled={isTranslating || isLoading}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-95 ${
                isSpanishMode
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/90 shadow-emerald-500/10'
                  : 'bg-[#172233] hover:bg-[#202f45] border-[#2a3c54] text-gray-200 hover:text-white'
              }`}
              title={isSpanishMode ? 'Volver a idioma original' : 'Traducir todas las noticias al español con un clic'}
            >
              <Languages className={`w-4 h-4 ${isTranslating ? 'animate-spin' : isSpanishMode ? 'text-emerald-400' : 'text-[#38bdf8]'}`} />
              <span>
                {isTranslating ? 'Traduciendo...' : isSpanishMode ? 'Traducido al Español' : 'Traducir a Español'}
              </span>
            </button>

            {/* BOTÓN ACTUALIZAR */}
            <button
              type="button"
              onClick={() => loadNews(true)}
              disabled={isLoading || isTranslating}
              className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#172233] hover:bg-[#202f45] border border-[#2a3c54] text-xs font-bold text-gray-200 hover:text-white transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
              title="Refrescar noticias de hoy"
            >
              <RefreshCw className={`w-4 h-4 text-[#38bdf8] ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Cargando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Chips de Categorías / Etiquetas */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedTag('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedTag === 'todos'
                ? 'bg-[#38bdf8] text-gray-950 shadow-md shadow-cyan-500/20'
                : 'bg-[#121926] text-gray-400 hover:text-white border border-[#202d40]'
            }`}
          >
            Todos ({news.length})
          </button>
          {allTags.slice(0, 6).map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 capitalize ${
                selectedTag === tag
                  ? 'bg-[#38bdf8] text-gray-950 shadow-md shadow-cyan-500/20'
                  : 'bg-[#121926] text-gray-400 hover:text-white border border-[#202d40]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Buscador de Noticias */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filtrar por juego o titular..."
            className="w-full bg-[#101724] text-xs text-white placeholder-gray-500 rounded-xl px-4 py-2.5 border border-[#202f42] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-all"
          />
        </div>
      </div>

      {/* 3. Rejilla SaaS de Noticias */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#101724] border border-[#1e2c3e] rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="h-40 bg-[#162132] rounded-xl" />
              <div className="h-4 bg-[#162132] rounded w-3/4" />
              <div className="h-3 bg-[#162132] rounded w-full" />
              <div className="h-3 bg-[#162132] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-16 bg-[#101724] border border-[#202f42] rounded-3xl p-8">
          <Newspaper className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No se encontraron noticias</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
            No hay noticias que coincidan con los filtros aplicados.
          </p>
          <button
            type="button"
            onClick={() => { setSelectedTag('todos'); setSearchFilter(''); }}
            className="px-4 py-2 rounded-xl bg-[#1c2738] hover:bg-[#25344a] text-xs font-bold text-[#38bdf8] cursor-pointer"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item) => {
            const isCardTranslated = isSpanishMode || cardTranslations[item.id];
            const displayTitle = isCardTranslated && translations[item.id]?.title 
              ? translations[item.id].title 
              : item.title;
            const displaySummary = isCardTranslated && translations[item.id]?.summary 
              ? translations[item.id].summary 
              : item.summary;

            return (
              <article
                key={item.id}
                className="group bg-[#101724] hover:bg-[#131c2b] border border-[#202f42] hover:border-[#38bdf8]/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#38bdf8]/5"
              >
                <div>
                  {/* Portada del Juego */}
                  <div className="relative h-44 w-full overflow-hidden bg-[#0c1119]">
                    <img
                      src={item.gameCover}
                      alt={item.gameTitle}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101724] via-transparent to-black/40" />

                    {/* Badge del Título del Juego */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-white text-[11px] font-black uppercase tracking-wider">
                      <Gamepad2 className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span className="truncate max-w-[170px]">{item.gameTitle}</span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {/* Botón de Traducir Tarjeta Individual */}
                      <button
                        type="button"
                        onClick={(e) => handleTranslateSingleCard(item, e)}
                        className={`p-1.5 rounded-lg backdrop-blur-md border border-white/10 text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                          isCardTranslated
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                            : 'bg-black/75 text-gray-300 hover:text-white hover:bg-[#38bdf8] hover:text-gray-950'
                        }`}
                        title={isCardTranslated ? 'Ver en inglés original' : 'Traducir esta noticia al español'}
                      >
                        <Languages className="w-3.5 h-3.5" />
                        <span>{isCardTranslated ? 'ES' : 'EN'}</span>
                      </button>

                      {/* Botón de Compartir */}
                      <button
                        type="button"
                        onClick={(e) => handleShare(item, e)}
                        className="p-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-gray-300 hover:text-white hover:bg-[#38bdf8] hover:text-gray-950 transition-colors cursor-pointer"
                        title="Compartir noticia"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Feed / Fuente Oficial */}
                    <div className="absolute bottom-2 left-3 text-[10px] text-gray-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#38bdf8]" />
                      <span>{item.date}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-300 truncate max-w-[130px]">{item.feedLabel}</span>
                    </div>
                  </div>

                  {/* Contenido de la Noticia */}
                  <div className="p-5 space-y-3">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] font-bold text-gray-300 bg-[#162234] border border-[#24354c] px-2 py-0.5 rounded-md"
                        >
                          #{tag}
                        </span>
                      ))}
                      {isCardTranslated && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded-md">
                          Español
                        </span>
                      )}
                    </div>

                    {/* Titular */}
                    <h2 className="text-sm font-extrabold text-white leading-snug line-clamp-2 group-hover:text-[#38bdf8] transition-colors">
                      {displayTitle}
                    </h2>

                    {/* Resumen Breve */}
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                      {displaySummary}
                    </p>
                  </div>
                </div>

                {/* Acciones al pie */}
                <div className="p-5 pt-0 border-t border-[#182333] mt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleGoToGame(item)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#38bdf8] hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Ver en Catálogo</span>
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#162234] hover:bg-[#202f45] border border-[#24354c] text-xs font-semibold text-gray-200 hover:text-white transition-all cursor-pointer"
                    title="Leer noticia completa oficial"
                  >
                    <span>Fuente</span>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 4. Footer informativo SaaS */}
      <div className="mt-12 p-6 rounded-2xl bg-[#0e1520] border border-[#1d293b] text-center text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#38bdf8]" />
          <span>Noticias provistas mediante APIs públicas oficiales con traducción automática.</span>
        </div>
        <div className="text-[11px] text-gray-500">
          La rotación de juegos cambia diariamente de forma automática a las 00:00 UTC.
        </div>
      </div>

    </div>
  );
};
