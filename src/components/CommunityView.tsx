import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Star, 
  ThumbsUp, 
  MessageSquare, 
  Bookmark, 
  Flag, 
  Plus, 
  Send, 
  AlertTriangle, 
  X, 
  ShieldAlert, 
  Sparkles, 
  Users, 
  MessageCircle, 
  Award, 
  CheckCircle2, 
  Image as ImageIcon, 
  Search, 
  Share2, 
  MapPin, 
  Filter, 
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { CommunityPost } from '../types/game';
import { DonorBadge } from './DonorBadge';

const CATEGORIES = ['Todos', 'Ofertas', 'Juegos', 'Plataformas', 'Recomendaciones', 'General'];

const HIGHLIGHT_TAG_SUGGESTIONS = [
  'Calidad/Precio',
  'Gráficos 10/10',
  'Optimización top',
  'Chollo verificado',
  'Obra maestra',
  'Rendimiento portátil',
  'Banda sonora épica',
  'Historia inolvidable',
  'Multijugador top',
  'Imprescindible'
];

const QUICK_GAMES = [
  'Cyberpunk 2077: Ultimate Edition',
  'Elden Ring: Shadow of the Erdtree',
  'Hollow Knight',
  'Black Myth: Wukong',
  'The Witcher 3: Complete Edition',
  'Red Dead Redemption 2',
  'Steam Deck OLED'
];

export const CommunityView: React.FC = () => {
  const {
    posts,
    activeCommunityCategory,
    setActiveCommunityCategory,
    likePost,
    savePost,
    createPost,
    addComment,
    reportPost,
    currentUser,
    openAuthModal,
    showToast,
    viewMode,
    openDonationModal
  } = useApp();

  // Create Review / Post Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newCategory, setNewCategory] = useState<'General' | 'Ofertas' | 'Juegos' | 'Plataformas' | 'Recomendaciones'>('Ofertas');
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newRecommended, setNewRecommended] = useState<boolean>(true);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Calidad/Precio']);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [simulateVideoUpload, setSimulateVideoUpload] = useState(false);
  const [ruleViolationError, setRuleViolationError] = useState<string | null>(null);

  // Active Comment Input per Post
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Search & Filter state (Google Maps style)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [filterWithPhotos, setFilterWithPhotos] = useState(false);
  const [filterRecommendedOnly, setFilterRecommendedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recientes' | 'utiles' | 'mejor_valoradas' | 'menor_valoradas'>('recientes');

  // Photo Lightbox modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Report modal
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('Incumple las normas de la comunidad');

  // Compute Google Maps style Rating Overview Stats
  const ratingStats = useMemo(() => {
    const total = posts.length;
    if (total === 0) {
      return {
        average: 5.0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentRecommended: 100
      };
    }

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    let recCount = 0;

    posts.forEach(p => {
      const r = Math.min(5, Math.max(1, p.rating ?? 5));
      dist[r] = (dist[r] || 0) + 1;
      sum += r;
      if (p.recommended !== false) recCount++;
    });

    const average = Number((sum / total).toFixed(1));
    const percentRecommended = Math.round((recCount / total) * 100);

    return {
      average,
      total,
      distribution: dist,
      percentRecommended
    };
  }, [posts]);

  // Filter and sort reviews
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      // Category filter
      if (activeCommunityCategory !== 'Todos' && p.category !== activeCommunityCategory) {
        return false;
      }
      // Star rating filter
      if (filterStar !== null) {
        const r = p.rating ?? 5;
        if (r !== filterStar) return false;
      }
      // Photos filter
      if (filterWithPhotos && !p.image) {
        return false;
      }
      // Recommended only
      if (filterRecommendedOnly && p.recommended === false) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = p.title.toLowerCase().includes(q);
        const inContent = p.content.toLowerCase().includes(q);
        const inGame = p.gameTitle ? p.gameTitle.toLowerCase().includes(q) : false;
        const inAuthor = p.author.toLowerCase().includes(q);
        const inTags = p.tags ? p.tags.some(t => t.toLowerCase().includes(q)) : false;
        if (!inTitle && !inContent && !inGame && !inAuthor && !inTags) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'utiles') {
        return (b.likes || 0) - (a.likes || 0);
      }
      if (sortBy === 'mejor_valoradas') {
        return (b.rating ?? 5) - (a.rating ?? 5);
      }
      if (sortBy === 'menor_valoradas') {
        return (a.rating ?? 5) - (b.rating ?? 5);
      }
      // 'recientes': maintain array order (newest first)
      return 0;
    });
  }, [posts, activeCommunityCategory, filterStar, filterWithPhotos, filterRecommendedOnly, searchQuery, sortBy]);

  const handleOpenCreateModal = () => {
    setRuleViolationError(null);
    setIsModalOpen(true);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setRuleViolationError(null);

    // Flowchart validation: "SIN SUBIDA DE VIDEO"
    if (simulateVideoUpload) {
      setRuleViolationError('Aviso: La publicación incumple las normas de la comunidad (Prohibida la subida de vídeos pesados directamente por los usuarios). Por favor, desmarca el vídeo o cancela.');
      return;
    }

    const res = createPost({
      title: newTitle,
      content: newContent,
      category: newCategory,
      rating: newRating,
      gameTitle: newGameTitle.trim() || undefined,
      recommended: newRecommended,
      tags: selectedTags,
      image: newImageUrl.trim() || undefined,
      hasVideo: simulateVideoUpload,
      authorName: newAuthorName.trim() || undefined
    });

    if (res.success) {
      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewAuthorName('');
      setNewGameTitle('');
      setNewImageUrl('');
      setSelectedTags(['Calidad/Precio']);
      setNewRating(5);
      setNewRecommended(true);
      setSimulateVideoUpload(false);
    } else {
      setRuleViolationError(res.error || 'Aviso: La reseña incumple las normas de la comunidad.');
    }
  };

  const handleSendComment = (postId: string) => {
    if (!commentText.trim()) return;
    const ok = addComment(postId, commentText);
    if (ok) {
      setCommentText('');
      setActiveCommentPostId(null);
    }
  };

  const handleConfirmReport = () => {
    if (reportingPostId) {
      reportPost(reportingPostId, reportReason);
      setReportingPostId(null);
    }
  };

  const handleShareReview = (post: CommunityPost) => {
    navigator.clipboard?.writeText(window.location.href);
    showToast(`¡Enlace copiado! Compartiendo reseña de ${post.author}`);
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1: return 'Pésimo - No lo recomiendo';
      case 2: return 'Regular - Deja bastante que desear';
      case 3: return 'Bueno - Cumple las expectativas';
      case 4: return 'Muy bueno - Gran experiencia';
      case 5: return 'Excelente - ¡Una obra maestra / compra obligada!';
      default: return '';
    }
  };

  const isMobile = viewMode === 'mobile';

  return (
    <div className={`w-full select-none ${isMobile ? 'px-3 py-3 space-y-4 max-w-lg mx-auto' : 'max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6'}`}>
      
      {/* ======================================================== */}
      {/* 1. CABECERA PRINCIPAL ESTILO GOOGLE MAPS DE RESEÑAS */}
      {/* ======================================================== */}
      <div className="bg-[#121822] rounded-2xl border border-[#1f2937] p-4 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#06b6d4]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#1c2636]">
          
          {/* Lugar & Identidad estilo Google Maps */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <MapPin className="w-3 h-3 text-amber-400" />
                Comunidad Oficial OffertGames
              </span>
              <span className="text-[11px] text-gray-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Reseñas y opiniones reales
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Opiniones y Reseñas de Jugadores</span>
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Valoraciones verificadas de videojuegos, ofertas y plataformas. Consulta lo que opina la gente antes de comprar y comparte tu propia experiencia como en Google Maps.
            </p>
          </div>

          {/* Botón Principal: Escribir una Reseña */}
          <div className="shrink-0 flex items-center gap-2.5">
            <button
              onClick={handleOpenCreateModal}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Star className="w-4 h-4 fill-black stroke-black" />
              <span>Escribir una reseña</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RESUMEN DE PUNTUACIONES & BARRAS ESTILO GOOGLE MAPS */}
        {/* ======================================================== */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Tarjeta de puntuación media (Score Gigante) */}
          <div className="md:col-span-4 flex items-center sm:items-start gap-4 p-4 rounded-xl bg-[#0e141f] border border-[#1e2a3c]">
            <div className="text-center sm:text-left space-y-1">
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
                {ratingStats.average}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1 py-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(ratingStats.average)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-600 fill-gray-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Basado en <span className="font-bold text-white">{ratingStats.total}</span> opiniones de la comunidad
              </p>
              <div className="pt-1">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {ratingStats.percentRecommended}% de recomendación positiva
                </span>
              </div>
            </div>
          </div>

          {/* Barras de distribución horizontal (Las barras de Google Maps) */}
          <div className="md:col-span-8 space-y-1.5 p-4 rounded-xl bg-[#0e141f] border border-[#1e2a3c]">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingStats.distribution[stars] || 0;
              const percent = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;
              const isSelected = filterStar === stars;

              return (
                <div
                  key={stars}
                  onClick={() => setFilterStar(isSelected ? null : stars)}
                  className={`flex items-center gap-3 text-xs cursor-pointer p-1 rounded-lg transition-colors ${
                    isSelected ? 'bg-amber-500/15 text-amber-300 font-bold' : 'hover:bg-[#16202e] text-gray-400'
                  }`}
                  title={`Filtrar por ${stars} estrellas`}
                >
                  <span className="w-8 text-[11px] font-mono font-bold flex items-center gap-1 justify-end shrink-0">
                    <span>{stars}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </span>

                  {/* Barra de progreso Google Maps */}
                  <div className="flex-1 h-2.5 bg-[#172232] rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected 
                          ? 'bg-amber-400' 
                          : stars >= 4 
                            ? 'bg-gradient-to-r from-amber-500 to-amber-400' 
                            : 'bg-gradient-to-r from-amber-600 to-amber-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <span className="w-8 text-[11px] font-mono text-gray-400 text-right shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. BARRA DE FILTROS, BÚSQUEDA Y CHIPS DE GOOGLE MAPS */}
      {/* ======================================================== */}
      <div className="bg-[#121822] rounded-2xl border border-[#1f2937] p-3.5 sm:p-4 space-y-3 shadow-md">
        
        {/* Barra superior: Búsqueda y Ordenar por */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Buscador de reseñas */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar opiniones (ej: Cyberpunk, Steam Deck, oferta, rendimiento...)"
              className="w-full bg-[#17202c] text-xs text-white pl-9 pr-3 py-2 rounded-xl border border-[#273548] focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selector de ordenamiento estilo Google Maps */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-gray-400 font-medium">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-[#17202c] text-xs font-bold text-white px-3 py-2 rounded-xl border border-[#273548] focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="recientes">Más recientes</option>
              <option value="utiles">Más útiles (más votos)</option>
              <option value="mejor_valoradas">Mejor valoradas (5★)</option>
              <option value="menor_valoradas">Menor puntuación</option>
            </select>
          </div>

        </div>

        {/* Chips de filtro rápido tipo Google Maps */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          {/* Reset button */}
          {(filterStar !== null || filterWithPhotos || filterRecommendedOnly || activeCommunityCategory !== 'Todos') && (
            <button
              onClick={() => {
                setFilterStar(null);
                setFilterWithPhotos(false);
                setFilterRecommendedOnly(false);
                setActiveCommunityCategory('Todos');
                setSearchQuery('');
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1 shrink-0 hover:bg-red-500/20 transition-all"
            >
              <X className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          )}

          {/* Categorías Principales */}
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCommunityCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeCommunityCategory === cat
                  ? 'bg-[#06b6d4] text-black font-black shadow-sm'
                  : 'bg-[#151c27] text-gray-300 hover:text-white border border-[#233145]'
              }`}
            >
              {cat}
            </button>
          ))}

          {/* Filtro por 5 Estrellas */}
          <button
            onClick={() => setFilterStar(filterStar === 5 ? null : 5)}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1 ${
              filterStar === 5
                ? 'bg-amber-400 text-black font-black shadow-sm'
                : 'bg-[#151c27] text-gray-300 hover:text-white border border-[#233145]'
            }`}
          >
            <Star className={`w-3 h-3 ${filterStar === 5 ? 'fill-black' : 'fill-amber-400 text-amber-400'}`} />
            <span>5 estrellas</span>
          </button>

          {/* Filtro con fotos */}
          <button
            onClick={() => setFilterWithPhotos(!filterWithPhotos)}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1 ${
              filterWithPhotos
                ? 'bg-[#06b6d4] text-black font-black shadow-sm'
                : 'bg-[#151c27] text-gray-300 hover:text-white border border-[#233145]'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>Con fotos</span>
          </button>

          {/* Filtro recomendados */}
          <button
            onClick={() => setFilterRecommendedOnly(!filterRecommendedOnly)}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1 ${
              filterRecommendedOnly
                ? 'bg-emerald-400 text-black font-black shadow-sm'
                : 'bg-[#151c27] text-gray-300 hover:text-white border border-[#233145]'
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
            <span>Recomendados</span>
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. CONTENEDOR PRINCIPAL: FEED DE RESEÑAS + SIDEBAR */}
      {/* ======================================================== */}
      <div className={isMobile ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'}>
        
        {/* FEED DE RESEÑAS */}
        <div className={isMobile ? 'space-y-3.5' : 'lg:col-span-8 space-y-4'}>
          
          {filteredPosts.length === 0 ? (
            <div className="bg-[#121822] rounded-2xl border border-[#1f2937] p-8 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#16202e] border border-[#243447] flex items-center justify-center text-amber-400 shadow-inner">
                <Star className="w-7 h-7 stroke-[1.75]" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  No se encontraron opiniones con estos filtros
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Sé el primero en compartir tu reseña, calificar una oferta destacada o recomendar un videojuego.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStar(null);
                    setFilterWithPhotos(false);
                    setFilterRecommendedOnly(false);
                    setActiveCommunityCategory('Todos');
                  }}
                  className="px-4 py-2 bg-[#192333] hover:bg-[#202d42] text-xs font-bold text-gray-200 rounded-xl transition-all"
                >
                  Restablecer filtros
                </button>
                <button
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-black stroke-black" />
                  <span>Escribir una reseña ahora</span>
                </button>
              </div>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const stars = Math.min(5, Math.max(1, post.rating ?? 5));
              const isUseful = post.likedByMe;

              return (
                <article
                  key={post.id}
                  className={`bg-[#121822] rounded-2xl border border-[#1f2937] shadow-sm hover:border-[#2b3a4e] transition-all ${
                    isMobile ? 'p-3.5 space-y-3' : 'p-5 space-y-4'
                  }`}
                >
                  {/* Google Maps Review Header: Avatar, Name, Badges, Time */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      
                      {/* Avatar o Círculo de Inicial con color de Google Maps */}
                      {post.avatar ? (
                        <img
                          src={post.avatar}
                          alt={post.author}
                          className="w-10 h-10 rounded-full object-cover border border-[#233247] shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center text-white font-black text-sm uppercase shrink-0 shadow-sm">
                          {post.author ? post.author.charAt(0) : 'J'}
                        </div>
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white truncate max-w-[150px]">
                            {post.author}
                          </span>

                          {/* Medalla Donador */}
                          {post.authorDonorTier && (
                            <DonorBadge tier={post.authorDonorTier} size="xs" />
                          )}

                          {/* Insignia Guía de la Comunidad / Local Guide estilo Google Maps */}
                          {post.isLocalGuide !== false && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                              <span>Guía Local</span>
                            </span>
                          )}

                          {/* Rol o número de opiniones */}
                          {post.authorRole && (
                            <span className="text-[9px] text-[#38bdf8] bg-[#38bdf8]/10 px-1.5 py-0.2 rounded border border-[#38bdf8]/20 font-medium">
                              {post.authorRole}
                            </span>
                          )}
                        </div>

                        {/* Metadatos secundarios: Tiempo & Categoría */}
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span>{post.timeAgo}</span>
                          <span>•</span>
                          <span className="text-cyan-400 font-medium">{post.category}</span>
                          {post.userReviewCount && (
                            <>
                              <span>•</span>
                              <span>{post.userReviewCount} reseñas</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botón de denunciar (Bandera) */}
                    <button
                      onClick={() => setReportingPostId(post.id)}
                      title="Denunciar reseña"
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded-md"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Fila de Calificación con Estrellas Doradas Google Maps & Etiqueta de Juego */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Estrellas doradas */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= stars
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-600 fill-gray-700'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-amber-400 ml-1.5">
                        {stars}.0
                      </span>
                    </div>

                    {/* Título del Juego o Producto Reseñado */}
                    {post.gameTitle && (
                      <span className="text-[11px] font-bold text-gray-200 bg-[#172232] px-2 py-0.5 rounded-md border border-[#27384d] flex items-center gap-1">
                        <span>🎮</span>
                        <span>{post.gameTitle}</span>
                      </span>
                    )}

                    {/* Distintivo de recomendación */}
                    {post.recommended !== false ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <ThumbsUp className="w-2.5 h-2.5" />
                        <span>Recomienda la compra</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                        <span>No recomendado</span>
                      </span>
                    )}
                  </div>

                  {/* Título de la Reseña & Contenido Detallado */}
                  <div className="space-y-1.5">
                    {post.title && (
                      <h2 className={`font-bold text-white hover:text-amber-300 transition-colors leading-snug ${
                        isMobile ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                      }`}>
                        {post.title}
                      </h2>
                    )}
                    <p className={`text-gray-300 leading-relaxed whitespace-pre-line ${
                      isMobile ? 'text-xs' : 'text-xs sm:text-sm'
                    }`}>
                      {post.content}
                    </p>
                  </div>

                  {/* Etiquetas de aspectos destacados tipo Google Maps (tags) */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-gray-300 bg-[#16202e] border border-[#243346] px-2 py-0.5 rounded-md font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Foto adjunta con vista previa Google Maps */}
                  {post.image && (
                    <div className="pt-1">
                      <div
                        onClick={() => setPreviewImage(post.image!)}
                        className={`group relative rounded-xl overflow-hidden border border-[#233145] bg-[#0d131d] cursor-pointer max-w-md ${
                          isMobile ? 'max-h-48' : 'max-h-64'
                        }`}
                      >
                        <img
                          src={post.image}
                          alt="Foto de la reseña"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                          <ImageIcon className="w-4 h-4" />
                          <span>Ver captura completa</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Barra de Interacción estilo Google Maps: ¿Útil?, Comentar, Compartir, Guardar */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#1a2332] text-xs text-gray-400">
                    
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Botón "¿Te ha resultado útil?" con contador de Google Maps */}
                      <button
                        onClick={() => likePost(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                          isUseful
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-[#151d29] text-gray-300 hover:text-white border-[#243144] hover:bg-[#1a2433]'
                        }`}
                        title="¿Te ha resultado útil esta opinión?"
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${isUseful ? 'fill-amber-300' : ''}`} />
                        <span className="text-[11px]">
                          Útil • {post.likes}
                        </span>
                      </button>

                      {/* Botón Responder / Comentarios */}
                      <button
                        onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
                          activeCommentPostId === post.id
                            ? 'bg-[#06b6d4]/15 text-[#38bdf8] border-[#06b6d4]/40 font-bold'
                            : 'bg-[#151d29] text-gray-400 hover:text-white border-[#243144] hover:bg-[#1a2433]'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-[11px]">
                          {post.commentsCount > 0 ? `Respuestas (${post.commentsCount})` : 'Responder'}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                      {/* Compartir */}
                      <button
                        onClick={() => handleShareReview(post)}
                        title="Compartir reseña"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2433] transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Guardar reseña */}
                      <button
                        onClick={() => savePost(post.id)}
                        title="Guardar en favoritos"
                        className={`p-1.5 rounded-lg transition-colors ${
                          post.savedByMe ? 'text-amber-400' : 'text-gray-400 hover:text-white hover:bg-[#1a2433]'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${post.savedByMe ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                  </div>

                  {/* ======================================================== */}
                  {/* SECCIÓN DE RESPUESTAS ESTILO GOOGLE MAPS (RESPUESTAS DEL LOCAL / COMUNIDAD) */}
                  {/* ======================================================== */}
                  {(post.comments.length > 0 || activeCommentPostId === post.id) && (
                    <div className="pt-3 space-y-3 border-t border-[#1a2332]">
                      
                      {/* Lista de respuestas existentes */}
                      {post.comments.map((c) => (
                        <div
                          key={c.id}
                          className="bg-[#0e141f] p-3 rounded-xl border-l-2 border-l-[#06b6d4] border border-[#1b2535] flex items-start gap-3 ml-2 sm:ml-4 shadow-sm"
                        >
                          <img
                            src={c.avatar}
                            alt={c.author}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-[#253448]"
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white">{c.author}</span>
                                <span className="text-[9px] text-[#38bdf8] bg-[#38bdf8]/10 px-1 py-0.2 rounded border border-[#38bdf8]/20 font-medium">
                                  Respuesta de la Comunidad
                                </span>
                                {c.authorDonorTier && (
                                  <DonorBadge tier={c.authorDonorTier} size="xs" />
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500">{c.timeAgo}</span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed pt-0.5">{c.content}</p>
                          </div>
                        </div>
                      ))}

                      {/* Input para responder */}
                      {activeCommentPostId === post.id && (
                        <div className="flex items-center gap-2 pt-1 ml-2 sm:ml-4">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendComment(post.id);
                            }}
                            placeholder="Escribe una respuesta a esta opinión..."
                            className="flex-1 bg-[#17202c] text-xs text-white px-3 py-2.5 rounded-xl border border-[#2b3a4e] focus:outline-none focus:border-amber-400"
                          />
                          <button
                            onClick={() => handleSendComment(post.id)}
                            className="p-2.5 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition-colors shrink-0 flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-xs">Enviar</span>
                          </button>
                        </div>
                      )}

                    </div>
                  )}

                </article>
              );
            })
          )}

        </div>

        {/* SIDEBAR DERECHO (DESKTOP) */}
        {!isMobile && (
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Canales y Categorías de la Comunidad */}
            <div className="bg-[#121822] p-5 rounded-2xl border border-[#1f2937] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Canales de Reseñas
                </h2>
                <span className="text-[10px] text-gray-500 font-mono">Oficial</span>
              </div>
              <div className="space-y-1">
                {[
                  { title: 'Ofertas y Chollos', category: 'Ofertas' as const, desc: 'Reseñas de precios mínimos y compras' },
                  { title: 'Juegos y Novedades', category: 'Juegos' as const, desc: 'Análisis detallados de lanzamientos' },
                  { title: 'Plataformas y Hardware', category: 'Plataformas' as const, desc: 'Steam Deck, PC, consolas y accesorios' },
                  { title: 'Recomendaciones', category: 'Recomendaciones' as const, desc: 'Joyas ocultas y qué jugar a continuación' },
                  { title: 'General y Off-topic', category: 'General' as const, desc: 'Charlas y comunidad gamer' }
                ].map((item) => (
                  <div
                    key={item.category}
                    onClick={() => {
                      setActiveCommunityCategory(item.category);
                      showToast(`Filtrando por canal: ${item.title}`);
                    }}
                    className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                      activeCommunityCategory === item.category
                        ? 'bg-[#1a2536] border border-amber-400/40'
                        : 'hover:bg-[#161e2b] border border-transparent'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-white transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-gray-400 leading-tight pt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Apoyar OffertGames - Hazte Donador */}
            <div className="bg-[#121822] p-5 rounded-2xl border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)] space-y-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Award className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Apoyar la Web
                </h2>
              </div>
              
              <p className="text-xs text-gray-300 leading-relaxed">
                Ayuda a mantener la infraestructura de alertas y servidores activa. Recibe una medallita oficial de donador de distinto color al lado de tu nombre en tus reseñas.
              </p>

              {/* Badges preview row */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <div className="flex items-center justify-between p-1.5 bg-[#0e141e] rounded-lg border border-[#1e2b3d]">
                  <DonorBadge tier="bronce" size="xs" showLabel={true} />
                  <span className="text-[10px] text-amber-300 font-bold font-mono">2€</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-[#0e141e] rounded-lg border border-[#1e2b3d]">
                  <DonorBadge tier="plata" size="xs" showLabel={true} />
                  <span className="text-[10px] text-slate-300 font-bold font-mono">5€</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-[#0e141e] rounded-lg border border-[#1e2b3d]">
                  <DonorBadge tier="oro" size="xs" showLabel={true} />
                  <span className="text-[10px] text-yellow-300 font-bold font-mono">10€</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-[#0e141e] rounded-lg border border-[#1e2b3d]">
                  <DonorBadge tier="diamante" size="xs" showLabel={true} />
                  <span className="text-[10px] text-cyan-300 font-bold font-mono">20€</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={openDonationModal}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs py-2.5 px-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Hazte Donador con PayPal</span>
                </button>
              </div>
            </div>

            {/* Normas de Reseñas de la Comunidad */}
            <div className="bg-[#121822] p-5 rounded-2xl border border-[#1f2937] space-y-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#06b6d4]/10 border border-[#06b6d4]/30 flex items-center justify-center text-[#22d3ee]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Normas de Reseñas
                </h2>
              </div>
              <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Opina con honestidad basada en tu experiencia de juego o compra.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Solo enlaces a tiendas oficiales legales (Steam, Epic, GOG, PS Store).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Prohibida la subida de vídeos pesados no autorizados o piratería.</span>
                </div>
              </div>
            </div>

          </aside>
        )}

      </div>

      {/* ======================================================== */}
      {/* 4. MODAL "ESCRIBIR UNA RESEÑA" ESTILO GOOGLE MAPS */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#121822] w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-[#233145] p-5 sm:p-6 space-y-5 shadow-2xl my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1f2838]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">Escribir una reseña</h2>
                  <p className="text-[11px] text-gray-400">Estilo Google Maps para la comunidad gamer</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ERROR DE INFRACCIÓN DE NORMAS SI APLICA */}
            {ruleViolationError && (
              <div className="bg-red-500/15 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-200">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold leading-relaxed">
                    {ruleViolationError}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSimulateVideoUpload(false);
                        setRuleViolationError(null);
                      }}
                      className="px-3 py-1 bg-red-500 text-white font-bold text-[11px] rounded-md hover:bg-red-600 transition-colors"
                    >
                      Editar y quitar vídeo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-3 py-1 bg-[#1a2332] text-gray-300 text-[11px] rounded-md hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              
              {/* PASO 1: SELECCIÓN DE ESTRELLAS INTERACTIVA (ESTILO GOOGLE MAPS) */}
              <div className="bg-[#17202c] p-4 rounded-xl border border-[#27364a] text-center space-y-2">
                <label className="text-xs font-bold text-gray-200 block uppercase tracking-wider">
                  Tu puntuación general
                </label>
                
                {/* 5 Estrellas Interactivas */}
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const active = (hoverRating || newRating) >= s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            active
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              : 'text-gray-600 fill-gray-800'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Texto descriptivo de la puntuación en vivo */}
                <p className="text-xs font-bold text-amber-300 min-h-[18px]">
                  {getRatingLabel(hoverRating || newRating)}
                </p>
              </div>

              {/* Nombre o alias del autor si no ha iniciado sesión */}
              {!currentUser && (
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Tu nombre o apodo (para firmar la reseña)
                  </label>
                  <input
                    type="text"
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    placeholder="Ej: Nacho, GamerPro, Carlos..."
                    className="w-full bg-[#17202c] text-xs text-white rounded-lg p-2.5 border border-[#2b3a4e] focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* PASO 2: JUEGO O TEMA A VALORAR & CANAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Juego u oferta que valoras
                  </label>
                  <input
                    type="text"
                    value={newGameTitle}
                    onChange={(e) => setNewGameTitle(e.target.value)}
                    placeholder="Ej: Cyberpunk 2077, Elden Ring..."
                    className="w-full bg-[#17202c] text-xs text-white rounded-lg p-2.5 border border-[#2b3a4e] focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Canal / Categoría
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-[#17202c] text-xs text-white rounded-lg p-2.5 border border-[#2b3a4e] focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="Ofertas">Ofertas</option>
                    <option value="Juegos">Juegos</option>
                    <option value="Plataformas">Plataformas</option>
                    <option value="Recomendaciones">Recomendaciones</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Sugerencias rápidas de juego */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[10px] text-gray-500 uppercase shrink-0 font-bold">Rápido:</span>
                {QUICK_GAMES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setNewGameTitle(g)}
                    className="px-2 py-0.5 rounded text-[10px] bg-[#1a2332] text-gray-300 hover:text-white hover:bg-[#223044] border border-[#263548] shrink-0"
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* PASO 3: TÍTULO DEL RESUMEN */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Título del resumen
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Rendimiento brutal a 60fps y un descuento histórico imperdible..."
                  className="w-full bg-[#17202c] text-xs text-white rounded-lg p-2.5 border border-[#2b3a4e] focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {/* PASO 4: OPINIÓN DETALLADA */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Tu opinión detallada
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  placeholder="Comparte tu experiencia: ¿Qué tal la historia, la dificultad o los fps? ¿Recomiendas comprarlo al precio actual?..."
                  className="w-full bg-[#17202c] text-xs text-white rounded-lg p-2.5 border border-[#2b3a4e] focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {/* PASO 5: ¿RECOMIENDAS LA COMPRA? */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#17202c] border border-[#28384d]">
                <span className="text-xs font-bold text-gray-200">
                  ¿Recomiendas este juego / oferta?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRecommended(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      newRecommended
                        ? 'bg-emerald-500 text-black font-black shadow-sm'
                        : 'bg-[#121822] text-gray-400 hover:text-white border border-[#2b3a4e]'
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>Sí, lo recomiendo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRecommended(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !newRecommended
                        ? 'bg-rose-500 text-white font-black shadow-sm'
                        : 'bg-[#121822] text-gray-400 hover:text-white border border-[#2b3a4e]'
                    }`}
                  >
                    <span>No lo recomiendo</span>
                  </button>
                </div>
              </div>

              {/* PASO 6: ASPECTOS DESTACADOS (CHIPS TIPO GOOGLE MAPS) */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Aspectos a destacar (haz clic para añadir)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {HIGHLIGHT_TAG_SUGGESTIONS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-amber-400 text-black font-bold shadow-sm'
                            : 'bg-[#17202c] text-gray-300 hover:text-white border border-[#2a3a4e]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PASO 7: FOTO O CAPTURA DE PANTALLA (OPCIONAL) */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  URL de foto o captura de pantalla (opcional)
                </label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#17202c] text-xs text-white rounded-lg p-2.5 border border-[#2b3a4e] focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* REGLA DEL DIAGRAMA DE FLUJO: Checkbox de testeo de vídeo */}
              <div className="bg-[#17202c] p-3 rounded-xl border border-[#28384d] space-y-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={simulateVideoUpload}
                    onChange={(e) => setSimulateVideoUpload(e.target.checked)}
                    className="accent-red-500 rounded"
                  />
                  <span>Intentar adjuntar archivo de vídeo (.mp4/.mov)</span>
                </label>
                <p className="text-[10px] text-gray-400 pl-5">
                  Regla de la comunidad: Las publicaciones comunitarias NO permiten subida de vídeos pesados directos.
                </p>
              </div>

              {/* ACCIONES DEL FORMULARIO */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#1a2332] text-xs text-gray-300 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Publicar Reseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. LIGHTBOX MODAL PARA FOTOS (AMPLIAR CAPTURAS) */}
      {/* ======================================================== */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-700 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Foto ampliada"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL DE DENUNCIA DE RESEÑAS */}
      {/* ======================================================== */}
      {reportingPostId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121822] w-full max-w-md rounded-2xl border border-red-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-5 h-5" />
              <h2 className="text-sm font-bold text-white">Denunciar reseña</h2>
            </div>
            <p className="text-xs text-gray-300">
              Esta reseña será enviada al Panel del Administrador para su revisión y posible retirada si incumple las normas.
            </p>
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Motivo</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-[#17202c] text-xs text-white p-2.5 rounded-lg border border-[#29384c]"
              >
                <option value="Incumple las normas de la comunidad">Incumple las normas de la comunidad</option>
                <option value="Spam o publicidad engañosa">Spam o publicidad engañosa</option>
                <option value="Piratería o software ilegal">Piratería o software ilegal</option>
                <option value="Conducta tóxica o insultos">Conducta tóxica o insultos</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReportingPostId(null)}
                className="px-3 py-1.5 bg-[#1a2332] text-xs text-gray-300 rounded-lg hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReport}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Enviar denuncia
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
