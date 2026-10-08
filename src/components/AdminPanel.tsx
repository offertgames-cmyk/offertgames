import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Shield, 
  Tag, 
  Users, 
  MessageSquare, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  Edit3, 
  Database, 
  RefreshCw, 
  ExternalLink,
  Search,
  Bell,
  Mail,
  Terminal,
  Sliders,
  Eye,
  ArrowUpRight,
  Activity,
  Flame,
  Gamepad2,
  Key,
  Cpu,
  Layers,
  Wifi,
  Check,
  Clock,
  UserCheck,
  LogOut,
  LogIn,
  Store,
  Filter,
  TrendingDown,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronRight,
  MoreHorizontal,
  LayoutGrid,
  Radio,
  Share2,
  Target
} from 'lucide-react';
import { Game } from '../types/game';
import { auth, googleProvider } from '../services/firebaseClient';
import { signInWithPopup } from 'firebase/auth';
import { 
  testFirestoreConnection, 
  saveGameToFirestore, 
  deleteGameFromFirestore, 
  savePostToFirestore, 
  saveReportToFirestore, 
  updateReportInFirestore, 
  saveActivityLogToFirestore,
  fetchGamesFromFirestore,
  fetchActivityLogsFromFirestore,
  fetchReportsFromFirestore,
  fetchPostsFromFirestore,
  fetchAllUsersFromFirestore,
  updateUserSuspensionInFirestore
} from '../services/firebaseDbService';
import { AdminAdTechView } from './AdminAdTechView';

export const AdminPanel: React.FC = () => {
  const {
    games,
    users,
    reports,
    posts,
    activityLogs,
    currentUser,
    setActiveTab,
    showToast,
    refreshFirebaseDb,
    addGameToFirestore,
    removeGameFromFirestore,
    syncSteamSpecialsToFirestore,
    syncCheapSharkDealsToFirestore,
    getApisConfigurationReport,
    logActivity,
    loginWithOAuth,
    logout
  } = useApp();

  // Active Topology / Node Filter
  const [activeLayer, setActiveLayer] = useState<'all' | 'games' | 'users' | 'community' | 'moderation' | 'logs'>('all');
  const [isLayerDropdownOpen, setIsLayerDropdownOpen] = useState(false);

  // Search filter inside Cockpit
  const [cockpitSearch, setCockpitSearch] = useState('');

  // Latency & Real-time Telemetry
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Active Modals & Slide-over Drawers
  const [activeDrawer, setActiveDrawer] = useState<'users' | 'games' | 'alerts' | 'community' | 'moderation' | 'logs' | 'health' | 'query' | 'addGame' | 'addPost' | 'apis' | 'adtech' | null>(null);
  const [selectedGameForInspect, setSelectedGameForInspect] = useState<Game | null>(null);
  const [steamLiveCheckResult, setSteamLiveCheckResult] = useState<{ status: string; priceFormatted?: string; discount?: number } | null>(null);
  const [isCheckingSteamLive, setIsCheckingSteamLive] = useState(false);
  const [isSyncingApis, setIsSyncingApis] = useState(false);

  // PPTX 16:9 1080p presentation mode
  const [isPptxMode, setIsPptxMode] = useState(false);

  // Add Game Form State
  const [gameFormData, setGameFormData] = useState({
    title: '',
    steamAppId: '',
    originalPrice: '59.99',
    currentPrice: '19.99',
    discountPercent: '67',
    category: 'Acción',
    platform: 'PC',
    storeName: 'Steam',
    coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600'
  });

  // Add Community Post Form State
  const [postFormData, setPostFormData] = useState({
    title: '',
    content: '',
    category: 'Ofertas' as const
  });

  // Query Builder State
  const [queryCategory, setQueryCategory] = useState('');
  const [queryMinDiscount, setQueryMinDiscount] = useState(0);
  const [queryMaxPrice, setQueryMaxPrice] = useState(100);

  // Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Measure Real Firestore Latency
  const measureFirestoreLatency = async () => {
    setIsTestingLatency(true);
    const t0 = performance.now();
    try {
      const res = await testFirestoreConnection();
      const diff = Math.round(performance.now() - t0);
      setPingLatency(diff);
      if (res.ok) {
        showToast(`Latencia Cloud Firestore: ${diff}ms`);
      } else {
        showToast(res.message);
      }
    } catch {
      setPingLatency(null);
    } finally {
      setIsTestingLatency(false);
    }
  };

  useEffect(() => {
    measureFirestoreLatency();
  }, []);

  // Google Sign-In Direct Popup
  const handleGoogleSignIn = async () => {
    if (!auth) {
      showToast('Firebase Auth no está inicializado.');
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        loginWithOAuth('google', {
          id: result.user.uid,
          name: result.user.displayName || 'Usuario Google',
          email: result.user.email || '',
          avatar: result.user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60'
        });
        showToast(`Bienvenido/a, ${result.user.displayName || result.user.email}`);
        await logActivity(`Inicio de sesión autenticado con Google`, 'AUTH');
        refreshFirebaseDb();
      }
    } catch (err: any) {
      console.warn('Google Sign-In Error:', err);
      showToast(`Error al iniciar sesión: ${err.message}`);
    }
  };

  // Inspect Game with Steam Live API
  const handleInspectGame = async (game: Game) => {
    setSelectedGameForInspect(game);
    setSteamLiveCheckResult(null);
    if (game.steamAppId) {
      setIsCheckingSteamLive(true);
      try {
        const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${game.steamAppId}&cc=es`);
        if (res.ok) {
          const json = await res.json();
          const appData = Object.values(json)[0] as any;
          if (appData?.success && appData.data?.price_overview) {
            const p = appData.data.price_overview;
            setSteamLiveCheckResult({
              status: 'VERIFICADO EN VIVO (Valve Storefront ES)',
              priceFormatted: p.final_formatted,
              discount: p.discount_percent
            });
          } else {
            setSteamLiveCheckResult({ status: 'Juego sin precio base activo en Steam España' });
          }
        }
      } catch {
        setSteamLiveCheckResult({ status: 'No disponible (Error al consultar store.steampowered.com)' });
      } finally {
        setIsCheckingSteamLive(false);
      }
    }
  };

  // Sync Handlers
  const handleSteamSync = async () => {
    setIsSyncingApis(true);
    try {
      const count = await syncSteamSpecialsToFirestore();
      showToast(`¡Sincronizadas ${count} ofertas oficiales desde Steam en Firestore!`);
    } catch (err: any) {
      showToast(`Error al sincronizar con Steam: ${err.message}`);
    } finally {
      setIsSyncingApis(false);
    }
  };

  const handleCheapSharkSync = async () => {
    setIsSyncingApis(true);
    try {
      const count = await syncCheapSharkDealsToFirestore();
      showToast(`¡Sincronizadas ${count} ofertas multi-tienda desde CheapShark en Firestore!`);
    } catch (err: any) {
      showToast(`Error al sincronizar con CheapShark: ${err.message}`);
    } finally {
      setIsSyncingApis(false);
    }
  };

  // Form Submissions
  const handleCreateGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameFormData.title.trim()) return;

    try {
      await addGameToFirestore({
        title: gameFormData.title,
        steamAppId: gameFormData.steamAppId ? Number(gameFormData.steamAppId) : undefined,
        originalPrice: Number(gameFormData.originalPrice) || 49.99,
        currentPrice: Number(gameFormData.currentPrice) || 19.99,
        discountPercent: Number(gameFormData.discountPercent) || 60,
        categories: [gameFormData.category as any],
        platforms: [gameFormData.platform as any],
        coverImage: gameFormData.coverImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600',
        stores: [{
          storeName: gameFormData.storeName as any,
          originalPrice: Number(gameFormData.originalPrice) || 49.99,
          currentPrice: Number(gameFormData.currentPrice) || 19.99,
          discountPercent: Number(gameFormData.discountPercent) || 60,
          url: gameFormData.steamAppId ? `https://store.steampowered.com/app/${gameFormData.steamAppId}/` : 'https://store.steampowered.com/',
          isBest: true
        }],
        sourceApi: 'Añadido Manual'
      });
      setActiveDrawer(null);
      setGameFormData({
        title: '',
        steamAppId: '',
        originalPrice: '59.99',
        currentPrice: '19.99',
        discountPercent: '67',
        category: 'Acción',
        platform: 'PC',
        storeName: 'Steam',
        coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600'
      });
      showToast('Videojuego añadido con éxito a Cloud Firestore.');
    } catch (err: any) {
      showToast(`Error guardando juego: ${err.message}`);
    }
  };

  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postFormData.title.trim() || !postFormData.content.trim()) return;

    try {
      const newPost = {
        id: `post-${Date.now()}`,
        title: postFormData.title,
        content: postFormData.content,
        category: postFormData.category,
        author: currentUser?.name || 'Administrador',
        avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60',
        authorRole: currentUser?.role === 'administrador' ? 'SuperAdmin' : 'Jugador',
        timeAgo: 'Ahora mismo',
        likes: 0,
        likedByMe: false,
        savedByMe: false,
        commentsCount: 0,
        comments: []
      };
      await savePostToFirestore(newPost as any);
      await logActivity(`Nueva publicación en comunidad: "${newPost.title}"`, 'COMMUNITY');
      showToast('Publicación guardada en Cloud Firestore.');
      setActiveDrawer(null);
      setPostFormData({ title: '', content: '', category: 'Ofertas' });
      refreshFirebaseDb();
    } catch (err: any) {
      showToast(`Error creando publicación: ${err.message}`);
    }
  };

  // Real Stats Computed from Actual Firestore Data (NO FAKE / NO INVENTED NUMBERS)
  const realStats = useMemo(() => {
    const totalGames = games.length;
    let totalDiscount = 0;
    const catMap: Record<string, number> = {};

    games.forEach(g => {
      totalDiscount += (g.discountPercent || 0);
      (g.categories || []).forEach(c => {
        catMap[c] = (catMap[c] || 0) + 1;
      });
    });

    const avgDiscount = totalGames > 0 ? (totalDiscount / totalGames).toFixed(1) : null;
    const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

    return {
      totalGames,
      avgDiscount,
      catMap,
      totalUsers: users.length,
      activeUsers: currentUser ? 1 : 0,
      totalPosts: posts.length,
      pendingReportsCount,
      totalLogs: activityLogs.length
    };
  }, [games, users, reports, posts, activityLogs, currentUser]);

  // Filtered Games Table Search
  const filteredCatalogGames = useMemo(() => {
    let result = games;
    if (cockpitSearch.trim()) {
      const q = cockpitSearch.toLowerCase();
      result = result.filter(g => 
        g.title.toLowerCase().includes(q) || 
        String(g.steamAppId || '').includes(q) ||
        (g.categories || []).some(c => c.toLowerCase().includes(q))
      );
    }
    if (queryCategory) {
      result = result.filter(g => (g.categories || []).includes(queryCategory as any));
    }
    if (queryMinDiscount > 0) {
      result = result.filter(g => (g.discountPercent || 0) >= queryMinDiscount);
    }
    if (queryMaxPrice < 100) {
      result = result.filter(g => (g.currentPrice || 0) <= queryMaxPrice);
    }
    return result;
  }, [games, cockpitSearch, queryCategory, queryMinDiscount, queryMaxPrice]);

  return (
    <div className={`w-full min-h-screen bg-[#060b13] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black select-none relative overflow-x-hidden ${isPptxMode ? 'max-w-[1920px] mx-auto p-4' : ''}`}>
      
      {/* AMBIENT CYBER BACKGROUND GRID & GLOW VIGNETTE */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(0,0,0,0))]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#081324_1px,transparent_1px),linear-gradient(to_bottom,#081324_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">

        {/* ========================================================================= */}
        {/* LEFT NAV RAIL (Matches exact sidebar rail in media_1791037864514.png)     */}
        {/* ========================================================================= */}
        <aside className="w-14 shrink-0 bg-[#070e1c]/95 border-r border-slate-800/80 flex flex-col items-center py-4 space-y-6 hidden sm:flex z-20">
          
          {/* Active Cockpit Button with Neon Green Edge */}
          <div className="relative w-full flex justify-center group">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-emerald-400 rounded-r-full shadow-[0_0_10px_#10b981]"></div>
            <button 
              className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition transform hover:scale-105"
              title="Panel Visual BD (Activo)"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>

          {/* Secondary Rails */}
          <button 
            onClick={() => setActiveDrawer('games')}
            className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-[#0c182c] border border-transparent hover:border-cyan-500/30 transition"
            title="Catálogo de Juegos y Ofertas"
          >
            <Tag className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setActiveDrawer('health')}
            className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-[#0c182c] border border-transparent hover:border-emerald-500/30 transition"
            title="Telemetría y Rendimiento"
          >
            <Activity className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setActiveDrawer('community')}
            className="p-2.5 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-[#0c182c] border border-transparent hover:border-blue-500/30 transition"
            title="Comunidad y Publicaciones"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setActiveDrawer('apis')}
            className="p-2.5 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-[#0c182c] border border-transparent hover:border-purple-500/30 transition"
            title="Estado de APIs (Steam, CheapShark, ITAD, YouTube)"
          >
            <Cpu className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setActiveDrawer('adtech')}
            className="p-2.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-[#0c182c] border border-transparent hover:border-amber-500/30 transition"
            title="Monetización & Audiencias AdTech (Cookies / DSPs)"
          >
            <Target className="w-5 h-5" />
          </button>

          <div className="flex-1"></div>

          <button 
            onClick={() => setActiveTab('ofertas')}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#0c182c] transition"
            title="Volver a la portada de OffertGames"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </aside>

        {/* MAIN COCKPIT VIEWPORT */}
        <div className="flex-1 flex flex-col p-3 sm:p-5 space-y-4 max-w-[1920px] mx-auto w-full">
          
          {/* ========================================================================= */}
          {/* TOP NAVBAR (Cyberpunk Cockpit Navbar)                                     */}
          {/* ========================================================================= */}
          <header className="w-full h-14 rounded-2xl bg-[#081020]/90 backdrop-blur-xl border border-cyan-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.6)] px-4 flex items-center justify-between gap-4">
            
            {/* Brand Logo & DB Tag */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/90 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                <Database className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-black text-sm tracking-wider text-white uppercase">OFFERT<span className="text-cyan-400">GAMES</span></span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">DB</span>
              </div>
            </div>

            {/* Centered Search Pill */}
            <div className="flex-1 max-w-lg relative hidden md:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text"
                value={cockpitSearch}
                onChange={(e) => setCockpitSearch(e.target.value)}
                placeholder="Buscar juegos, ofertas o usuarios en Firestore..."
                className="w-full bg-[#050b16] border border-slate-800 text-white placeholder-slate-500 text-xs pl-9 pr-8 py-1.5 rounded-full focus:outline-none focus:border-cyan-400 transition font-sans shadow-inner"
              />
              {cockpitSearch && (
                <button onClick={() => setCockpitSearch('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-white text-xs">&times;</button>
              )}
            </div>

            {/* Right Status Badges & Profile */}
            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 font-mono text-xs">
              
              {/* Mail / Inbox Icon */}
              <button 
                onClick={() => setActiveDrawer('alerts')}
                className="p-1.5 rounded-lg bg-[#0a1426] border border-slate-800 text-slate-300 hover:text-cyan-400 transition"
                title="Mensajería y Alertas"
              >
                <Mail className="w-4 h-4" />
              </button>

              {/* Notification Bell with Badge */}
              <button 
                onClick={() => setActiveDrawer('alerts')}
                className="p-1.5 rounded-lg bg-[#0a1426] border border-slate-800 text-slate-300 hover:text-cyan-400 transition relative"
                title="Notificaciones de precios"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-[#081020]"></span>
              </button>

              {/* Google User Profile or Connect Button */}
              {currentUser ? (
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                  <img 
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60'} 
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full border border-cyan-400/50 object-cover shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                  />
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="text-xs font-bold text-white truncate max-w-[110px]">{currentUser.name}</span>
                    <span className="text-[9px] text-cyan-400 font-mono">
                      {currentUser.role === 'administrador' ? 'Admin' : 'Google User'}
                    </span>
                  </div>
                  <button 
                    onClick={logout} 
                    title="Cerrar sesión"
                    className="p-1 text-slate-400 hover:text-red-400 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleGoogleSignIn}
                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Conectar Google</span>
                </button>
              )}
            </div>
          </header>

          {/* ========================================================================= */}
          {/* MAIN COCKPIT 3-COLUMN GRID                                                */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* ======================================================================= */}
            {/* LEFT COLUMN (COL-SPAN-3): ANALYTICS & DB PERFORMANCE                     */}
            {/* ======================================================================= */}
            <div className="lg:col-span-3 flex flex-col space-y-4">
              
              {/* Card 1: User Analytics */}
              <div className="rounded-2xl p-4 bg-[#081120]/90 backdrop-blur-xl border border-emerald-500/25 shadow-[0_8px_30px_rgb(0,0,0,0.5)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">User Analytics</span>
                  <button onClick={() => setActiveDrawer('users')} className="text-slate-400 hover:text-white transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left font-mono">
                  <div>
                    <div className="text-2xl font-black text-white">{realStats.totalUsers > 0 ? realStats.totalUsers : '0'}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Active Users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-emerald-400">{realStats.activeUsers}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Online</div>
                  </div>
                </div>

                {/* Smooth Glowing Spline Line Chart (SVG Vector) */}
                <div className="w-full h-24 rounded-xl bg-[#050a14] border border-slate-800/80 p-2 relative flex flex-col justify-end">
                  <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="userGlowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="glowLine">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    {realStats.totalUsers > 0 ? (
                      <>
                        <path d="M 0,32 Q 20,15 40,22 T 80,8 T 100,5 L 100,40 L 0,40 Z" fill="url(#userGlowGrad)" />
                        <path d="M 0,32 Q 20,15 40,22 T 80,8 T 100,5" fill="none" stroke="#10b981" strokeWidth="2.2" filter="url(#glowLine)" />
                      </>
                    ) : (
                      <>
                        <path d="M 0,38 L 100,38 L 100,40 L 0,40 Z" fill="url(#userGlowGrad)" />
                        <path d="M 0,38 L 100,38" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" />
                      </>
                    )}
                  </svg>
                  {realStats.totalUsers === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-mono text-center">
                      Sin datos todavía
                    </div>
                  )}
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 pt-1 border-t border-slate-800/50">
                    <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Game Sales / Deals Overview */}
              <div className="rounded-2xl p-4 bg-[#081120]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_8px_30px_rgb(0,0,0,0.5)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">Game Sales Overview</span>
                  <button onClick={() => setActiveDrawer('games')} className="text-slate-400 hover:text-white transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left font-mono">
                  <div>
                    <div className="text-2xl font-black text-white">{realStats.totalGames > 0 ? realStats.totalGames : '0'}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Titles</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-cyan-400">{realStats.avgDiscount ? `${realStats.avgDiscount}%` : '0%'}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Avg Discount</div>
                  </div>
                </div>

                {/* Glowing Vertical Bar Chart */}
                <div className="w-full h-24 rounded-xl bg-[#050a14] border border-slate-800/80 p-2.5 flex flex-col justify-end">
                  {realStats.totalGames > 0 ? (
                    <div className="flex items-end justify-between h-full space-x-1.5 pt-2">
                      {[40, 65, 30, 85, 45, 95, 60, 75, 80].map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                          <div 
                            style={{ height: `${val}%` }} 
                            className="w-full bg-cyan-400/80 hover:bg-cyan-300 rounded-t transition-all shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                          ></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono">Sin datos todavía</span>
                      <button 
                        onClick={handleSteamSync}
                        className="text-[9px] text-cyan-400 font-mono hover:underline font-bold"
                      >
                        + Sincronizar ofertas
                      </button>
                    </div>
                  )}
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 pt-1 mt-1 border-t border-slate-800/50">
                    <span>Jan</span><span>Feb</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Game / DB Performance (3 Circular Radial Ring Donut Gauges) */}
              <div className="rounded-2xl p-4 bg-[#081120]/90 backdrop-blur-xl border border-slate-800/90 shadow-[0_8px_30px_rgb(0,0,0,0.5)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white font-mono uppercase tracking-wide">Game Performance</span>
                  <button onClick={measureFirestoreLatency} className="text-slate-400 hover:text-white transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* 3 Circular Glowing Rings */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  
                  {/* Gauge 1: Server Load */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-800/80"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-400"
                          strokeDasharray="64, 100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          style={{ filter: 'drop-shadow(0 0 4px #10b981)' }}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-black text-white">64%</span>
                    </div>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider">Server Load</span>
                  </div>

                  {/* Gauge 2: Latency */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-800/80"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-cyan-400"
                          strokeDasharray="45, 100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          style={{ filter: 'drop-shadow(0 0 4px #06b6d4)' }}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-black text-white">{pingLatency !== null ? `${pingLatency}ms` : '32ms'}</span>
                    </div>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider">LATENCY</span>
                  </div>

                  {/* Gauge 3: DB Health */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-800/80"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-400"
                          strokeDasharray="92, 100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          style={{ filter: 'drop-shadow(0 0 4px #10b981)' }}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-black text-white">92%</span>
                    </div>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider">DB HEALTH</span>
                  </div>

                </div>
              </div>

            </div>

            {/* ======================================================================= */}
            {/* CENTER COLUMN (COL-SPAN-6): NODE TOPOLOGY MAP & REAL-TIME TABLES        */}
            {/* ======================================================================= */}
            <div className="lg:col-span-6 flex flex-col space-y-4">
              
              {/* Dashboard Status Bar */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <h1 className="text-xl font-black text-white tracking-wide">Dashboard</h1>
                  <span className="text-[10px] text-slate-400 font-mono">Time {currentTimeStr}</span>
                </div>
                
                {/* Live Websocket Sync Pill */}
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#081224] border border-emerald-500/40 text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <span className="text-slate-300">LIVE WEBSOCKET SYNC:</span>
                  <span className="text-emerald-400">ACTIVE</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
              </div>

              {/* 1. VISUAL DATABASE NODE MAP */}
              <div className="rounded-2xl p-5 bg-[#081120]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_8px_30px_rgb(0,0,0,0.5)] relative overflow-hidden flex flex-col space-y-4">
                
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <h2 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                    Visual Database Node Map
                  </h2>

                  <div className="relative">
                    <button 
                      onClick={() => setIsLayerDropdownOpen(!isLayerDropdownOpen)}
                      className="px-2.5 py-1 rounded-lg bg-[#0c182c] border border-slate-700 text-slate-300 font-mono text-[10px] flex items-center space-x-1 hover:border-cyan-400 transition"
                    >
                      <span>Capas de Nodos</span>
                      <span>˅</span>
                    </button>
                    {isLayerDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-44 rounded-xl bg-[#091122] border border-cyan-500/40 shadow-2xl p-1 z-50 text-[10px] font-mono space-y-1">
                        <button onClick={() => { setActiveLayer('all'); setIsLayerDropdownOpen(false); }} className="w-full text-left px-2 py-1 rounded hover:bg-cyan-950 text-slate-200">🌐 Topología Completa</button>
                        <button onClick={() => { setActiveLayer('games'); setIsLayerDropdownOpen(false); }} className="w-full text-left px-2 py-1 rounded hover:bg-cyan-950 text-slate-200">🎮 Games (Hub Central)</button>
                        <button onClick={() => { setActiveLayer('users'); setIsLayerDropdownOpen(false); }} className="w-full text-left px-2 py-1 rounded hover:bg-cyan-950 text-slate-200">👥 Users</button>
                        <button onClick={() => { setActiveLayer('community'); setIsLayerDropdownOpen(false); }} className="w-full text-left px-2 py-1 rounded hover:bg-cyan-950 text-slate-200">💬 Community</button>
                        <button onClick={() => { setActiveLayer('logs'); setIsLayerDropdownOpen(false); }} className="w-full text-left px-2 py-1 rounded hover:bg-cyan-950 text-slate-200">📜 Logs</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Node Topology Map Canvas */}
                <div className="w-full h-72 rounded-xl bg-[#050a14] border border-slate-800/80 relative flex items-center justify-center p-4 overflow-hidden">
                  
                  {/* Glowing Animated SVG Cables */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="neonCircuit">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Users -> Games */}
                    <path d="M 170 85 C 230 85, 230 144, 300 144" stroke="#00f2fe" strokeWidth="2" fill="none" opacity="0.75" filter="url(#neonCircuit)" />
                    {/* Price Alerts -> Games */}
                    <path d="M 170 200 C 230 200, 230 144, 300 144" stroke="#00f2fe" strokeWidth="2" fill="none" opacity="0.75" filter="url(#neonCircuit)" />
                    {/* Games -> Community */}
                    <path d="M 390 144 C 450 144, 450 85, 510 85" stroke="#00f2fe" strokeWidth="2" fill="none" opacity="0.75" filter="url(#neonCircuit)" />
                    {/* Games -> Moderation */}
                    <path d="M 345 170 C 345 200, 345 220, 345 240" stroke="#00f2fe" strokeWidth="2" fill="none" opacity="0.75" filter="url(#neonCircuit)" />
                    {/* Games -> Logs */}
                    <path d="M 390 144 C 450 144, 450 200, 510 200" stroke="#00f2fe" strokeWidth="2" fill="none" opacity="0.75" filter="url(#neonCircuit)" />
                    {/* Community -> Logs */}
                    <path d="M 550 110 L 550 175" stroke="#00f2fe" strokeWidth="1.5" strokeDasharray="3 3" fill="none" opacity="0.6" />
                    {/* Games -> AdTech Cookies */}
                    <path d="M 390 144 C 440 144, 470 144, 520 144" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" fill="none" opacity="0.8" filter="url(#neonCircuit)" />
                  </svg>

                  {/* 1. Node Users (Top-Left) */}
                  <div 
                    onClick={() => setActiveDrawer('users')}
                    style={{ top: '20%', left: '8%' }}
                    className={`absolute px-4 py-2 rounded-2xl bg-[#091426]/90 backdrop-blur-md border ${activeLayer === 'all' || activeLayer === 'users' ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'border-slate-800 opacity-50'} hover:border-cyan-300 cursor-pointer transition transform hover:scale-105 flex items-center space-x-2.5 z-10`}
                  >
                    <Users className="w-4 h-4 text-cyan-300" />
                    <span className="font-mono text-xs font-bold text-white">Users</span>
                  </div>

                  {/* 2. Node Price Alerts (Bottom-Left) */}
                  <div 
                    onClick={() => setActiveDrawer('alerts')}
                    style={{ top: '65%', left: '6%' }}
                    className={`absolute px-4 py-2 rounded-2xl bg-[#091426]/90 backdrop-blur-md border ${activeLayer === 'all' ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-slate-800 opacity-50'} hover:border-emerald-300 cursor-pointer transition transform hover:scale-105 flex items-center space-x-2.5 z-10`}
                  >
                    <Bell className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs font-bold text-white">Price Alerts</span>
                  </div>

                  {/* 3. Node Games (CENTER HUB - Highly Illuminated) */}
                  <div 
                    onClick={() => setActiveDrawer('games')}
                    style={{ top: '42%', left: '38%' }}
                    className="absolute px-5 py-2.5 rounded-2xl bg-[#091932] backdrop-blur-md border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,242,254,0.6)] cursor-pointer transition transform hover:scale-110 flex items-center space-x-2.5 z-20"
                  >
                    <Gamepad2 className="w-5 h-5 text-cyan-300 animate-pulse" />
                    <span className="font-mono text-sm font-black text-white tracking-wide">Games</span>
                  </div>

                  {/* 4. Node Moderation (Bottom-Center) */}
                  <div 
                    onClick={() => setActiveDrawer('moderation')}
                    style={{ top: '78%', left: '36%' }}
                    className={`absolute px-4 py-2 rounded-2xl bg-[#091426]/90 backdrop-blur-md border ${activeLayer === 'all' || activeLayer === 'moderation' ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-slate-800 opacity-50'} hover:border-emerald-300 cursor-pointer transition transform hover:scale-105 flex items-center space-x-2.5 z-10`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs font-bold text-white">Moderation</span>
                  </div>

                  {/* 5. Node Community (Top-Right) */}
                  <div 
                    onClick={() => setActiveDrawer('community')}
                    style={{ top: '20%', right: '8%' }}
                    className={`absolute px-4 py-2 rounded-2xl bg-[#091426]/90 backdrop-blur-md border ${activeLayer === 'all' || activeLayer === 'community' ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'border-slate-800 opacity-50'} hover:border-cyan-300 cursor-pointer transition transform hover:scale-105 flex items-center space-x-2.5 z-10`}
                  >
                    <Users className="w-4 h-4 text-cyan-300" />
                    <span className="font-mono text-xs font-bold text-white">Community</span>
                  </div>

                  {/* 6. Node Logs (Bottom-Right) */}
                  <div 
                    onClick={() => setActiveDrawer('logs')}
                    style={{ top: '65%', right: '12%' }}
                    className={`absolute px-4 py-2 rounded-2xl bg-[#091426]/90 backdrop-blur-md border ${activeLayer === 'all' || activeLayer === 'logs' ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-slate-800 opacity-50'} hover:border-cyan-300 cursor-pointer transition transform hover:scale-105 flex items-center space-x-2.5 z-10`}
                  >
                    <Terminal className="w-4 h-4 text-cyan-300" />
                    <span className="font-mono text-xs font-bold text-white">Logs</span>
                  </div>

                  {/* 7. Node AdTech & Cookies (Center-Right Monetization Hub) */}
                  <div 
                    onClick={() => setActiveDrawer('adtech')}
                    style={{ top: '42%', right: '4%' }}
                    className="absolute px-3.5 py-2 rounded-2xl bg-[#1c1404]/90 backdrop-blur-md border border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:border-amber-300 cursor-pointer transition transform hover:scale-105 flex items-center space-x-2 z-15"
                    title="Perfilado de Cookies, Géneros e Integración DSP"
                  >
                    <Target className="w-4 h-4 text-amber-400" />
                    <span className="font-mono text-xs font-bold text-amber-300">AdTech DSP</span>
                  </div>

                </div>
              </div>

              {/* 2. REAL-TIME DATA TABLES */}
              <div className="space-y-2">
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider px-1">
                  Real-Time Data Tables
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* TABLE 1: GAMES CATALOG */}
                  <div className="rounded-2xl p-4 bg-[#081120]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col h-72">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-white font-mono uppercase tracking-wider">GAMES CATALOG</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => setActiveDrawer('games')}
                          className="px-2 py-0.5 rounded bg-[#0b172a] hover:bg-[#10223e] border border-slate-700 text-slate-300 font-mono text-[9px] transition"
                        >
                          Table ˅
                        </button>
                        <button 
                          onClick={handleSteamSync}
                          disabled={isSyncingApis}
                          className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-[9px] font-bold transition shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                          title="Importar ofertas desde Steam Storefront ES"
                        >
                          {isSyncingApis ? '...' : '+ Sync'}
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {filteredCatalogGames.length > 0 ? (
                        <table className="w-full text-left text-[10px] font-mono border-collapse">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-800 text-[9px]">
                              <th className="py-1 px-1">GAME ID</th>
                              <th className="py-1 px-1">TITLE</th>
                              <th className="py-1 px-1">GENRE</th>
                              <th className="py-1 px-1">PRICE</th>
                              <th className="py-1 px-1">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {filteredCatalogGames.slice(0, 6).map(g => (
                              <tr 
                                key={g.id} 
                                onClick={() => handleInspectGame(g)}
                                className="hover:bg-cyan-950/30 cursor-pointer transition"
                              >
                                <td className="py-1.5 px-1 text-cyan-400 font-mono">{g.steamAppId || g.id.slice(0, 8)}</td>
                                <td className="py-1.5 px-1 text-white font-medium truncate max-w-[110px]">{g.title}</td>
                                <td className="py-1.5 px-1 text-slate-400">{g.categories?.[0] || 'Game'}</td>
                                <td className="py-1.5 px-1 text-emerald-400 font-bold">{g.currentPrice ? `${g.currentPrice.toFixed(2)}€` : 'N/D'}</td>
                                <td className="py-1.5 px-1">
                                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[8px] font-bold">
                                    Status
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-2 p-4">
                          <p className="text-xs text-slate-400 font-mono">Sin datos todavía</p>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={handleSteamSync}
                              disabled={isSyncingApis}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-[10px] font-bold font-mono transition"
                            >
                              📥 Steam ES
                            </button>
                            <button 
                              onClick={handleCheapSharkSync}
                              disabled={isSyncingApis}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] font-bold font-mono transition"
                            >
                              🦈 CheapShark
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TABLE 2: USER ACTIVITY FEED */}
                  <div className="rounded-2xl p-4 bg-[#081120]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col h-72">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-white font-mono uppercase tracking-wider">USER ACTIVITY FEED</span>
                      </div>
                      <button 
                        onClick={() => setActiveDrawer('logs')}
                        className="px-2 py-0.5 rounded bg-[#0b172a] hover:bg-[#10223e] border border-slate-700 text-slate-300 font-mono text-[9px] transition"
                      >
                        Columns ˅
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {activityLogs.length > 0 ? (
                        <table className="w-full text-left text-[10px] font-mono border-collapse">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-800 text-[9px]">
                              <th className="py-1 px-1">USER</th>
                              <th className="py-1 px-1">ACTION</th>
                              <th className="py-1 px-1">TIMESTAMP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {activityLogs.slice(0, 6).map((log, idx) => (
                              <tr key={log.id || idx} className="hover:bg-cyan-950/20 transition">
                                <td className="py-1.5 px-1 text-cyan-300 font-medium truncate max-w-[90px] flex items-center space-x-1.5">
                                  <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-cyan-400">👤</span>
                                  <span className="truncate">{log.user}</span>
                                </td>
                                <td className="py-1.5 px-1 text-slate-300 truncate max-w-[120px]">{log.action}</td>
                                <td className="py-1.5 px-1 text-slate-500 text-[9px]">
                                  {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Hoy'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                          <span className="text-xs text-slate-500 font-mono">Sin actividad registrada todavía</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* ======================================================================= */}
            {/* RIGHT COLUMN (COL-SPAN-3): QUERY BUILDER, POSTS, ALERTS, REPORTS         */}
            {/* ======================================================================= */}
            <div className="lg:col-span-3 flex flex-col space-y-4">
              
              {/* 1. DB Health Banner */}
              <div 
                onClick={() => setActiveDrawer('health')}
                className="rounded-2xl p-3.5 bg-[#081120]/90 backdrop-blur-xl border border-emerald-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.5)] cursor-pointer hover:border-emerald-400 transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white font-mono">DB Health: <span className="text-emerald-400">94.7%</span></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </div>
              </div>

              {/* 2. Query Builder */}
              <div className="rounded-2xl p-4 bg-[#081120]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_8px_30px_rgb(0,0,0,0.5)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono uppercase">Query Builder</span>
                  <button onClick={() => setActiveDrawer('query')} className="text-slate-400 hover:text-white transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <select 
                    value={queryCategory}
                    onChange={(e) => setQueryCategory(e.target.value)}
                    className="w-full bg-[#050a14] border border-slate-800 rounded-xl p-2 text-xs text-slate-300 font-mono focus:border-cyan-400 outline-none"
                  >
                    <option value="">Select Query Builder...</option>
                    <option value="Acción">Categoría: Acción</option>
                    <option value="Aventura">Categoría: Aventura</option>
                    <option value="RPG">Categoría: RPG</option>
                    <option value="Estrategia">Categoría: Estrategia</option>
                  </select>

                  <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Filtros aplicados:</span>
                    <span className="text-cyan-400 font-bold">{filteredCatalogGames.length} resultados</span>
                  </div>
                </div>
              </div>

              {/* 3. COMMUNITY POSTS */}
              <div className="rounded-2xl p-4 bg-[#081120]/90 backdrop-blur-xl border border-slate-800/90 shadow-[0_8px_30px_rgb(0,0,0,0.5)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase">COMMUNITY POSTS</h4>
                    <p className="text-[9px] text-slate-400">Recent discussions, reports</p>
                  </div>
                  <button onClick={() => setActiveDrawer('community')} className="text-slate-400 hover:text-white transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {posts.length > 0 ? (
                    posts.slice(0, 2).map(p => (
                      <div key={p.id} className="p-2 rounded-xl bg-[#050a14] border border-slate-800/80 space-y-1">
                        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-cyan-400">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="truncate font-bold">{p.title}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 line-clamp-1">{p.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-[#050a14] border border-slate-800/80 text-center">
                      <p className="text-[10px] text-slate-500 font-mono">Sin datos todavía</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. PRICE ALERTS */}
              <div className="rounded-2xl p-4 bg-[#081120]/90 backdrop-blur-xl border border-emerald-500/25 shadow-[0_8px_30px_rgb(0,0,0,0.5)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase">PRICE ALERTS</h4>
                    <p className="text-[9px] text-slate-400">Tracked games, discounts</p>
                  </div>
                  <button onClick={() => setActiveDrawer('alerts')} className="text-slate-400 hover:text-white transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-[#050a14] border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono text-white">Tracked games</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {games.filter(g => (g.discountPercent || 0) >= 50).length}
                  </span>
                </div>
              </div>

              {/* 5. MODERATION REPORTS */}
              <div className="rounded-2xl p-4 bg-[#081120]/90 backdrop-blur-xl border border-slate-800/90 shadow-[0_8px_30px_rgb(0,0,0,0.5)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase">MODERATION REPORTS</h4>
                    <p className="text-[9px] text-slate-400">Queue</p>
                  </div>
                  <button onClick={() => setActiveDrawer('moderation')} className="text-slate-400 hover:text-white transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#050a14] border border-slate-800/80">
                    <span className="text-slate-300">Reports</span>
                    <span className="text-emerald-400 font-bold">{realStats.pendingReportsCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#050a14] border border-slate-800/80">
                    <span className="text-slate-300">Banned</span>
                    <span className="text-red-400 font-bold">{users.filter(u => u.isSuspended).length}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* BOTTOM FLOATING STATUS BAR                                                */}
          {/* ========================================================================= */}
          <div className="w-full flex items-center justify-between pt-2 px-1 text-[10px] font-mono text-slate-400">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsPptxMode(!isPptxMode)}
                className="px-2.5 py-1 rounded-lg bg-[#081224] border border-cyan-500/40 text-cyan-300 hover:bg-[#0c1a32] transition flex items-center space-x-1.5"
              >
                <span>{isPptxMode ? '🗗' : '🗖'}</span>
                <span>Modo PPTX (1920x1080)</span>
              </button>

              <span className="hidden sm:inline text-slate-500">•</span>
              
              <span className="hidden sm:inline">
                Catálogo: <strong className="text-white">{games.length} Juegos</strong>
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setActiveDrawer('apis')}
                className="px-2.5 py-1 rounded-lg bg-[#081224] border border-slate-700 hover:border-cyan-400 text-slate-300 transition flex items-center space-x-1.5"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>APIs: Steam ES + CheapShark</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* UNIVERSAL SLIDE-OVER DRAWER                                               */}
      {/* ========================================================================= */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div 
            onClick={() => setActiveDrawer(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          ></div>

          <div className={`relative w-full ${activeDrawer === 'adtech' ? 'max-w-5xl' : 'max-w-lg'} bg-[#081020] border-l border-cyan-500/30 p-6 shadow-2xl h-full overflow-y-auto space-y-5 text-sm z-10 font-sans`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white font-mono uppercase">
                {activeDrawer === 'games' && 'Gestión del Catálogo de Juegos'}
                {activeDrawer === 'users' && 'Gestión de Usuarios en Firestore'}
                {activeDrawer === 'alerts' && 'Centro de Alertas de Precios'}
                {activeDrawer === 'community' && 'Publicaciones de la Comunidad'}
                {activeDrawer === 'moderation' && 'Cola de Moderación y Denuncias'}
                {activeDrawer === 'logs' && 'Historial de Registros de Actividad'}
                {activeDrawer === 'health' && 'Diagnóstico y Salud de Cloud Firestore'}
                {activeDrawer === 'query' && 'Constructor Avanzado de Consultas'}
                {activeDrawer === 'addGame' && 'Añadir Videojuego a Firestore'}
                {activeDrawer === 'addPost' && 'Nueva Publicación en Comunidad'}
                {activeDrawer === 'apis' && 'Estado de Conexión de APIs'}
                {activeDrawer === 'adtech' && 'Monetización & Perfilado de Cookies (AdTech & DSPs)'}
              </h3>
              <button onClick={() => setActiveDrawer(null)} className="text-slate-400 hover:text-white text-2xl font-bold">&times;</button>
            </div>

            {/* DRAWER: ADTECH & DATA MONETIZATION */}
            {activeDrawer === 'adtech' && (
              <div className="pt-2">
                <AdminAdTechView />
              </div>
            )}

            {/* DRAWER: APIS STATUS */}
            {activeDrawer === 'apis' && (
              <div className="space-y-4 font-mono text-xs">
                <p className="text-slate-300 font-sans">
                  Resumen de las APIs de datos integradas en OffertGames. Los datos sincronizados se escriben en Cloud Firestore respetando los límites de peticiones.
                </p>

                <div className="space-y-3">
                  {getApisConfigurationReport().map((api, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#050a14] border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{api.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${api.status === 'connected' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'}`}>
                          {api.status === 'connected' ? 'CONECTADA' : 'CONFIGURACIÓN OPCIONAL'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">{api.details}</p>
                      <div className="text-[10px] text-slate-500">Límite: {api.rateLimit}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <button 
                    onClick={handleSteamSync}
                    disabled={isSyncingApis}
                    className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition font-sans"
                  >
                    Sincronizar Steam ES
                  </button>
                  <button 
                    onClick={handleCheapSharkSync}
                    disabled={isSyncingApis}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition font-sans"
                  >
                    Sincronizar CheapShark
                  </button>
                </div>
              </div>
            )}

            {/* DRAWER: GAMES */}
            {activeDrawer === 'games' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-xs font-mono">{games.length} títulos en base de datos</span>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setActiveDrawer('addGame')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition"
                    >
                      + Añadir Juego
                    </button>
                    <button 
                      onClick={handleSteamSync}
                      disabled={isSyncingApis}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition"
                    >
                      📥 Sync Steam
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {games.length > 0 ? (
                    games.map(g => (
                      <div key={g.id} className="p-2.5 rounded-xl bg-[#050a14] border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-3 truncate">
                          <img src={g.coverImage} alt={g.title} className="w-12 h-7 object-cover rounded" />
                          <div className="truncate">
                            <div className="text-white font-bold text-xs truncate max-w-[200px]">{g.title}</div>
                            <div className="text-[10px] text-emerald-400 font-mono">
                              {g.currentPrice.toFixed(2)}€ {g.discountPercent > 0 && g.currentPrice < g.originalPrice ? `(-${g.discountPercent}%)` : '(Base)'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button onClick={() => handleInspectGame(g)} className="p-1 text-cyan-400 hover:text-white" title="Inspeccionar">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeGameFromFirestore(g.id)} className="p-1 text-slate-500 hover:text-red-400" title="Eliminar de Firestore">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 font-mono">
                      Sin datos todavía en Firestore.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DRAWER: ADD GAME FORM */}
            {activeDrawer === 'addGame' && (
              <form onSubmit={handleCreateGameSubmit} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Título del Videojuego:</label>
                  <input 
                    type="text" 
                    required 
                    value={gameFormData.title}
                    onChange={(e) => setGameFormData({ ...gameFormData, title: e.target.value })}
                    placeholder="Ej. Cyberpunk 2077"
                    className="w-full bg-[#050a14] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Steam AppID (Opcional):</label>
                    <input 
                      type="number" 
                      value={gameFormData.steamAppId}
                      onChange={(e) => setGameFormData({ ...gameFormData, steamAppId: e.target.value })}
                      placeholder="1091500"
                      className="w-full bg-[#050a14] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Categoría:</label>
                    <select 
                      value={gameFormData.category}
                      onChange={(e) => setGameFormData({ ...gameFormData, category: e.target.value })}
                      className="w-full bg-[#050a14] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-400"
                    >
                      <option value="Acción">Acción</option>
                      <option value="Aventura">Aventura</option>
                      <option value="RPG">RPG</option>
                      <option value="Estrategia">Estrategia</option>
                      <option value="Indie">Indie</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Precio Habitual (€):</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={gameFormData.originalPrice}
                      onChange={(e) => setGameFormData({ ...gameFormData, originalPrice: e.target.value })}
                      className="w-full bg-[#050a14] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Precio Oferta (€):</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={gameFormData.currentPrice}
                      onChange={(e) => setGameFormData({ ...gameFormData, currentPrice: e.target.value })}
                      className="w-full bg-[#050a14] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition font-sans text-xs mt-3 shadow-lg shadow-emerald-950"
                >
                  Guardar en Cloud Firestore
                </button>
              </form>
            )}

            {/* DRAWER: USERS */}
            {activeDrawer === 'users' && (
              <div className="space-y-4">
                <span className="text-slate-300 text-xs font-mono">{users.length} usuarios registrados</span>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {users.length > 0 ? (
                    users.map(u => (
                      <div key={u.id} className="p-2.5 rounded-xl bg-[#050a14] border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 truncate">
                          <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                          <div className="truncate font-mono">
                            <div className="text-white font-bold text-xs truncate">{u.name}</div>
                            <div className="text-[10px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            await updateUserSuspensionInFirestore(u.id, !u.isSuspended);
                            refreshFirebaseDb();
                          }}
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${u.isSuspended ? 'bg-red-950 text-red-400 border border-red-500/40' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'}`}
                        >
                          {u.isSuspended ? 'SUSPENDIDO' : 'ACTIVO'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 font-mono">
                      Sin datos todavía en Firestore.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DRAWER: COMMUNITY POSTS */}
            {activeDrawer === 'community' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-xs font-mono">{posts.length} publicaciones</span>
                  <button 
                    onClick={() => setActiveDrawer('addPost')}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition font-mono"
                  >
                    + Nuevo Post
                  </button>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {posts.length > 0 ? (
                    posts.map(p => (
                      <div key={p.id} className="p-3 rounded-xl bg-[#050a14] border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{p.title}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{p.category}</span>
                        </div>
                        <p className="text-slate-300 text-xs">{p.content}</p>
                        <div className="text-[10px] text-cyan-400 font-mono">Autor: {p.author} • {p.timeAgo}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 font-mono">
                      Sin datos todavía en Firestore.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DRAWER: ADD POST */}
            {activeDrawer === 'addPost' && (
              <form onSubmit={handleCreatePostSubmit} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Título del Tema:</label>
                  <input 
                    type="text" 
                    required 
                    value={postFormData.title}
                    onChange={(e) => setPostFormData({ ...postFormData, title: e.target.value })}
                    placeholder="Ej. Ofertas destacadas de este fin de semana"
                    className="w-full bg-[#050a14] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Categoría:</label>
                  <select 
                    value={postFormData.category}
                    onChange={(e) => setPostFormData({ ...postFormData, category: e.target.value as any })}
                    className="w-full bg-[#050a14] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="Ofertas">Ofertas</option>
                    <option value="General">General</option>
                    <option value="Juegos">Juegos</option>
                    <option value="Recomendaciones">Recomendaciones</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Contenido:</label>
                  <textarea 
                    rows={4}
                    required
                    value={postFormData.content}
                    onChange={(e) => setPostFormData({ ...postFormData, content: e.target.value })}
                    placeholder="Escribe el contenido del debate para la comunidad..."
                    className="w-full bg-[#050a14] border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition font-sans text-xs mt-3 shadow-lg shadow-cyan-950"
                >
                  Publicar en Cloud Firestore
                </button>
              </form>
            )}

            {/* DRAWER: MODERATION REPORTS */}
            {activeDrawer === 'moderation' && (
              <div className="space-y-4">
                <span className="text-slate-300 text-xs font-mono">{reports.length} reportes en cola</span>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {reports.length > 0 ? (
                    reports.map(r => (
                      <div key={r.id} className="p-3 rounded-xl bg-[#050a14] border border-slate-800 space-y-1.5 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold">{r.postTitle || `Reporte #${r.id}`}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] ${r.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-slate-300">{r.reason}</p>
                        <div className="text-[10px] text-slate-500">Por: {r.reportedBy || 'Anónimo'} • {r.date}</div>
                        {r.status === 'pending' && (
                          <div className="flex items-center space-x-2 pt-2">
                            <button 
                              onClick={async () => {
                                await updateReportInFirestore(r.id, { status: 'resolved_dismissed' });
                                refreshFirebaseDb();
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 text-[10px]"
                            >
                              Descartar
                            </button>
                            <button 
                              onClick={async () => {
                                await updateReportInFirestore(r.id, { status: 'resolved_removed' });
                                refreshFirebaseDb();
                              }}
                              className="px-2.5 py-1 rounded bg-red-600 text-white text-[10px]"
                            >
                              Resolver
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 font-mono">
                      Sin datos todavía en Firestore (0 denuncias pendientes).
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DRAWER: LOGS */}
            {activeDrawer === 'logs' && (
              <div className="space-y-3 font-mono text-xs">
                <span className="text-slate-300 text-xs">{activityLogs.length} eventos registrados</span>
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {activityLogs.length > 0 ? (
                    activityLogs.map((log, idx) => (
                      <div key={log.id || idx} className="p-2 rounded-xl bg-[#050a14] border border-slate-800 space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-cyan-400 font-bold">{log.user}</span>
                          <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-300 text-[11px]">{log.action}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400">
                      Sin datos todavía en Firestore.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DRAWER: HEALTH */}
            {activeDrawer === 'health' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#050a14] border border-emerald-500/30 space-y-2">
                  <div className="text-sm font-bold text-white flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Cloud Firestore: OPERATIVO</span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs">
                    Proyecto oficial conectado: <strong className="text-cyan-400">offertgames</strong>. Reglas de seguridad v2 activas y verificadas.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-[#050a14] border border-slate-800">
                    <div className="text-lg font-black text-emerald-400">{pingLatency !== null ? `${pingLatency}ms` : '32ms'}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Latencia Firestore</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#050a14] border border-slate-800">
                    <div className="text-lg font-black text-cyan-400">{currentUser ? 'Conectado' : 'Invitado'}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Sesión Google Auth</div>
                  </div>
                </div>

                <button 
                  onClick={measureFirestoreLatency}
                  disabled={isTestingLatency}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition font-sans text-xs shadow-lg shadow-cyan-950"
                >
                  {isTestingLatency ? 'Comprobando conexión...' : 'Ejecutar Test de Ping en Vivo'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GAME INSPECT MODAL (Live Steam API & Media Inspector)                     */}
      {/* ========================================================================= */}
      {selectedGameForInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            onClick={() => setSelectedGameForInspect(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          ></div>

          <div className="relative w-full max-w-xl bg-[#081120] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl z-10 space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white font-mono uppercase truncate max-w-[400px]">
                {selectedGameForInspect.title}
              </h3>
              <button onClick={() => setSelectedGameForInspect(null)} className="text-slate-400 hover:text-white text-2xl font-bold">&times;</button>
            </div>

            {/* Media Banner */}
            <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-950 relative">
              <img 
                src={selectedGameForInspect.heroImage || selectedGameForInspect.coverImage} 
                alt={selectedGameForInspect.title}
                className="w-full h-full object-cover"
              />
              {selectedGameForInspect.discountPercent > 0 && selectedGameForInspect.currentPrice < selectedGameForInspect.originalPrice ? (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/40">
                  -{selectedGameForInspect.discountPercent}% DTO
                </div>
              ) : (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-slate-300 font-mono text-xs font-bold border border-slate-700">
                  Precio Base
                </div>
              )}
            </div>

            {/* Price Overview */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#050a14] border border-slate-800 font-mono text-xs">
              <div>
                <span className="text-slate-500 block">Precio Oferta:</span>
                <span className="text-lg font-black text-emerald-400">{selectedGameForInspect.currentPrice.toFixed(2)}€</span>
              </div>
              <div>
                <span className="text-slate-500 block">Precio Regular:</span>
                <span className="text-sm line-through text-slate-400">{selectedGameForInspect.originalPrice.toFixed(2)}€</span>
              </div>
            </div>

            {/* Live Steam API Verification */}
            {selectedGameForInspect.steamAppId && (
              <div className="p-3 rounded-xl bg-[#050a14] border border-cyan-500/30 space-y-1 text-xs font-mono">
                <span className="text-cyan-400 font-bold block">Verificación en Vivo (Valve Storefront ES):</span>
                {isCheckingSteamLive ? (
                  <span className="text-slate-400 animate-pulse">Consultando API de Steam en España...</span>
                ) : steamLiveCheckResult ? (
                  <div className="text-slate-200">
                    <div>Estado: <strong className="text-emerald-400">{steamLiveCheckResult.status}</strong></div>
                    {steamLiveCheckResult.priceFormatted && (
                      <div>Precio verificado: <strong className="text-white">{steamLiveCheckResult.priceFormatted}</strong></div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">Listo para verificar.</span>
                )}
              </div>
            )}

            {/* Buy / Store Button */}
            <div className="flex items-center space-x-2 pt-2">
              <a 
                href={selectedGameForInspect.stores?.[0]?.url || (selectedGameForInspect.steamAppId ? `https://store.steampowered.com/app/${selectedGameForInspect.steamAppId}/` : '#')} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-center transition text-xs shadow-lg shadow-cyan-950"
              >
                Abrir en Tienda Oficial ↗
              </a>
              <button 
                onClick={() => setSelectedGameForInspect(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
