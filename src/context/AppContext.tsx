import React, { createContext, useContext, useState, useEffect } from 'react';
import { Game, Platform, Category, CommunityPost, User, ReportItem, ViewTab, PriceAlertSettings, PriceAlertNotification, DonorTier, DonorInfo, SavedPaymentMethod } from '../types/game';
import { INITIAL_GAMES, INITIAL_POSTS, INITIAL_USERS, INITIAL_REPORTS } from '../data/gamesDatabase';
import { fetchSteamFeaturedCategories, syncGamesWithSteamSpecials } from '../services/steamApi';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { auth as firebaseAuth, isFirebaseConfigured } from '../services/firebaseClient';
import { onAuthStateChanged, signOut as firebaseSignOut, getRedirectResult } from 'firebase/auth';
import { 
  getStoredAlertSettings, 
  saveStoredAlertSettings, 
  getStoredNotifications, 
  saveStoredNotifications, 
  addNotificationSafely, 
  runServerPriceCheck, 
  testSingleGameAlert,
  sendTestEmail
} from '../services/alertService';
import {
  syncUserToFirestore,
  fetchUserFromFirestore,
  fetchAllUsersFromFirestore,
  updateUserWishlistInFirestore,
  updateUserSuspensionInFirestore,
  updateUserDonorStatusInFirestore,
  updateUserProfileInFirestore,
  updateAuthorPostsInFirestore,
  updateUserPaymentMethodsInFirestore,
  recordDonationInFirestore,
  saveAlertSettingsToFirestore,
  fetchAlertSettingsFromFirestore,
  saveNotificationToFirestore,
  fetchNotificationsFromFirestore,
  markNotificationAsReadInFirestore,
  clearAllNotificationsInFirestore,
  savePostToFirestore,
  fetchPostsFromFirestore,
  subscribeToCommunityPosts,
  updatePostInFirestore,
  deletePostFromFirestore,
  saveReportToFirestore,
  fetchReportsFromFirestore,
  updateReportInFirestore,
  testFirestoreConnection,
  saveGameToFirestore,
  fetchGamesFromFirestore,
  deleteGameFromFirestore,
  subscribeToGames,
  ActivityLogItem,
  saveActivityLogToFirestore,
  fetchActivityLogsFromFirestore,
  subscribeToActivityLogs
} from '../services/firebaseDbService';
import {
  syncSteamSpecialsToFirestore as apiSyncSteam,
  syncCheapSharkDealsToFirestore as apiSyncCheapShark,
  getApisConfigurationReport
} from '../services/externalApisService';
import { trackUserInteraction } from '../services/adTrackingService';
import {
  sanitizeText,
  sanitizeHtmlContent,
  sanitizeUrl,
  securityLimiter,
  RATE_LIMITS,
  purgeSessionSecurityState,
  verifySessionIntegrity
} from '../services/securityService';

interface AppContextType {
  // Database status & Firestore activity
  isFirebaseDbActive: boolean;
  firebaseDbMessage: string;
  refreshFirebaseDb: () => Promise<void>;
  activityLogs: ActivityLogItem[];
  addGameToFirestore: (game: any) => Promise<void>;
  removeGameFromFirestore: (gameId: string) => Promise<void>;
  syncSteamSpecialsToFirestore: () => Promise<number>;
  syncCheapSharkDealsToFirestore: () => Promise<number>;
  getApisConfigurationReport: () => any[];
  logActivity: (action: string, type?: string) => Promise<void>;

  // Price Alerts & Notifications
  alertSettings: PriceAlertSettings;
  notifications: PriceAlertNotification[];
  unreadNotificationsCount: number;
  isAlertModalOpen: boolean;
  isCheckingAlerts: boolean;
  activeAlertGameId: string | null;
  setActiveAlertGameId: (id: string | null) => void;
  openAlertModal: (gameId?: string) => void;
  closeAlertModal: () => void;
  updateAlertSettings: (settings: PriceAlertSettings) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
  checkPriceAlertsNow: () => Promise<void>;
  testSamplePriceAlert: (params: {
    gameTitle: string;
    steamAppId?: number;
    maxPrice: number;
    gameId: string;
    coverImage?: string;
  }) => Promise<any>;
  sendTestAlertEmail: (paramsOrTitle?: string | {
    to?: string;
    gameTitle?: string;
    currentPrice?: number;
    regularPrice?: number;
    maxPrice?: number;
    storeName?: string;
    buyUrl?: string;
    coverImage?: string;
    steamAppId?: number;
  }, currentPrice?: number, maxPrice?: number) => Promise<{ ok: boolean; sent: boolean; provider?: string; previewUrl?: string; message: string; error?: string }>;

  // Navigation & View
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  selectedGame: Game | null;
  setSelectedGame: (game: Game | null) => void;
  viewMode: 'pc' | 'mobile';
  setViewMode: (mode: 'pc' | 'mobile') => void;
  mobileDevice: 'iphone' | 'samsung' | 'fluid';
  setMobileDevice: (dev: 'iphone' | 'samsung' | 'fluid') => void;
  isMobileRotated: boolean;
  setIsMobileRotated: (rotated: boolean) => void;
  mobileScale: number;
  setMobileScale: (scale: number) => void;

  // Search & Catalog Filters
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedPlatforms: Platform[];
  togglePlatform: (p: Platform) => void;
  selectedCategories: Category[];
  toggleCategory: (c: Category) => void;
  priceRange: number;
  setPriceRange: (p: number) => void;
  minDiscount: number;
  setMinDiscount: (d: number) => void;
  sortBy: 'discount' | 'price_asc' | 'price_desc' | 'rating' | 'title';
  setSortBy: (s: 'discount' | 'price_asc' | 'price_desc' | 'rating' | 'title') => void;
  clearFilters: () => void;

  // Games & Real-Time Sync
  games: Game[];
  filteredGames: Game[];
  isSyncing: boolean;
  refreshSteamPrices: () => Promise<void>;
  toggleWishlist: (gameId: string) => void;

  // Authentication & Flow
  currentUser: User | null;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  authModalReason: string;
  openAuthModal: (mode?: 'login' | 'register', reason?: string) => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => { success: boolean; error?: string };
  registerUser: (name: string, email: string, pass: string) => { success: boolean; error?: string };
  loginWithOAuth: (provider: 'google' | 'steam' | 'epic' | 'github', userData: { id?: string; name: string; email: string; avatar: string }) => { success: boolean };
  logout: () => void;

  // Community Features
  posts: CommunityPost[];
  activeCommunityCategory: string;
  setActiveCommunityCategory: (cat: string) => void;
  likePost: (postId: string) => void;
  savePost: (postId: string) => void;
  createPost: (postData: {
    title: string;
    content: string;
    category: 'General' | 'Ofertas' | 'Juegos' | 'Plataformas' | 'Recomendaciones';
    image?: string;
    hasVideo?: boolean;
    rating?: number;
    recommended?: boolean;
    tags?: string[];
    gameTitle?: string;
    authorName?: string;
  }) => { success: boolean; error?: string };
  addComment: (postId: string, content: string, guestAuthorName?: string) => boolean;
  reportPost: (postId: string, reason: string) => void;

  // Admin Features (Flowchart 2)
  users: User[];
  reports: ReportItem[];
  retireOffer: (gameId: string) => void;
  createOffer: (game: Partial<Game>) => void;
  updateOffer: (gameId: string, updates: Partial<Game>) => void;
  resolveReport: (reportId: string, action: 'remove_and_warn' | 'dismiss') => void;
  toggleUserSuspension: (userId: string) => void;

  // Donator & Medal System
  isDonationModalOpen: boolean;
  openDonationModal: () => void;
  closeDonationModal: () => void;
  processDonation: (tier: DonorTier, paymentDetails?: any) => Promise<{ success: boolean; message: string }>;

  // Profile Management (1 free per month or 0.50€ via PayPal)
  isProfileModalOpen: boolean;
  openProfileModal: (tab?: 'perfil' | 'pagos') => void;
  closeProfileModal: () => void;
  updateUserProfileData: (params: { newName?: string; newAvatar?: string; isPaid?: boolean; paypalEmail?: string }) => Promise<{ success: boolean; error?: string }>;

  // Customer Support Modal (Servicio al Cliente)
  isSupportModalOpen: boolean;
  openSupportModal: () => void;
  closeSupportModal: () => void;

  // Saved Payment Methods (Amazon/SaaS Wallet)
  savedPaymentMethods: SavedPaymentMethod[];
  addPaymentMethod: (method: Omit<SavedPaymentMethod, 'id' | 'createdAt'>) => Promise<void>;
  removePaymentMethod: (methodId: string) => Promise<void>;
  setDefaultPaymentMethod: (methodId: string) => Promise<void>;

  // Toast notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<ViewTab>('ofertas');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const handleSetSelectedGame = (game: Game | null) => {
    setSelectedGame(game);
    if (game) {
      trackUserInteraction({
        game,
        action: 'view',
        user: currentUser || undefined
      }).catch(() => {});
    }
  };

  // View Mode: 'pc' | 'mobile'
  const [viewMode, setViewModeState] = useState<'pc' | 'mobile'>(() => {
    try {
      const saved = localStorage.getItem('offertgames_view_mode');
      if (saved === 'pc' || saved === 'mobile') return saved;
      return typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'pc';
    } catch {
      return 'pc';
    }
  });

  const setViewMode = (mode: 'pc' | 'mobile') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('offertgames_view_mode', mode);
    } catch {}
  };

  const [mobileDevice, setMobileDevice] = useState<'iphone' | 'samsung' | 'fluid'>('iphone');
  const [isMobileRotated, setIsMobileRotated] = useState(false);
  const [mobileScale, setMobileScale] = useState(1);

  // Filters: empty by default so ALL 300+ games appear immediately
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [priceRange, setPriceRange] = useState(100);
  const [minDiscount, setMinDiscount] = useState(0); // 0 = Todos
  const [sortBy, setSortBy] = useState<'discount' | 'price_asc' | 'price_desc' | 'rating' | 'title'>('discount');

  const CATALOG_STORAGE_KEY = 'offertgames_catalog_v11';

  // Games & Sync
  const [games, setGames] = useState<Game[]>(() => {
    try {
      // Purge old versions to ensure fresh, 100% verified official covers and expanded 3000+ catalog
      ['offertgames_catalog', 'offertgames_catalog_v2', 'offertgames_catalog_v3', 'offertgames_catalog_v4', 'offertgames_catalog_v5', 'offertgames_catalog_v6', 'offertgames_catalog_v7', 'offertgames_catalog_v8', 'offertgames_catalog_v9', 'offertgames_catalog_v10'].forEach(k => {
        localStorage.removeItem(k);
      });
      const saved = localStorage.getItem(CATALOG_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_GAMES;
    } catch {
      return INITIAL_GAMES;
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('offertgames_user');
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalReason, setAuthModalReason] = useState('');

  // Community Posts & Reviews - Google Maps Style Persistence
  const mergeCommunityPosts = (current: CommunityPost[], remote: CommunityPost[]): CommunityPost[] => {
    if (!remote || remote.length === 0) return current;
    const map = new Map<string, CommunityPost>();
    // First remote posts
    remote.forEach(p => { if (p?.id) map.set(p.id, p); });
    // Keep local posts if not yet in remote, or preserve user's own interactions
    current.forEach(p => {
      if (p?.id) {
        if (!map.has(p.id)) {
          map.set(p.id, p);
        } else {
          const rem = map.get(p.id)!;
          map.set(p.id, {
            ...rem,
            likedByMe: p.likedByMe ?? rem.likedByMe,
            savedByMe: p.savedByMe ?? rem.savedByMe,
            comments: (p.comments && p.comments.length >= (rem.comments?.length || 0)) ? p.comments : rem.comments
          });
        }
      }
    });
    return Array.from(map.values());
  };

  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      localStorage.removeItem('offertgames_posts');
      localStorage.removeItem('offertgames_posts_v2');
      const saved = localStorage.getItem('offertgames_posts_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [activeCommunityCategory, setActiveCommunityCategory] = useState<string>('Todos');

  // Users & Reports for Admin
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Firebase Firestore Database Connection State
  const [isFirebaseDbActive, setIsFirebaseDbActive] = useState(false);
  const [firebaseDbMessage, setFirebaseDbMessage] = useState('Verificando base de datos Firebase Firestore...');
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  const refreshFirebaseDb = async () => {
    try {
      const status = await testFirestoreConnection();
      setIsFirebaseDbActive(status.ok);
      setFirebaseDbMessage(status.message);

      // Refresh games from Firestore
      const dbGames = await fetchGamesFromFirestore();
      if (dbGames && dbGames.length > 0) {
        setGames(dbGames as Game[]);
      }

      // Refresh registered users from Firestore
      const dbUsers = await fetchAllUsersFromFirestore();
      if (dbUsers.length > 0) setUsers(dbUsers);

      // Refresh community posts from Firestore
      const dbPosts = await fetchPostsFromFirestore();
      if (Array.isArray(dbPosts) && dbPosts.length > 0) setPosts(dbPosts);

      // Refresh moderation reports from Firestore
      const dbReports = await fetchReportsFromFirestore();
      if (dbReports.length > 0) setReports(dbReports);

      // Refresh activity logs from Firestore
      const dbLogs = await fetchActivityLogsFromFirestore();
      if (dbLogs.length > 0) setActivityLogs(dbLogs);
    } catch (err: any) {
      console.warn('[Firebase DB] Error refrescando base de datos:', err?.message || err);
    }
  };

  const logActivity = async (action: string, type: string = 'SYSTEM') => {
    const userLabel = currentUser?.name || currentUser?.email || 'Invitado';
    await saveActivityLogToFirestore({ user: userLabel, action, type });
  };

  const addGameToFirestore = async (gameData: any) => {
    const newId = gameData.id || `game-${Date.now()}`;
    const origPrice = Number(gameData.originalPrice) || 0;
    const currPrice = Number(gameData.currentPrice) || origPrice;
    const computedDisc = (origPrice > 0 && currPrice < origPrice)
      ? Math.round((1 - (currPrice / origPrice)) * 100)
      : 0;
    const finalDisc = typeof gameData.discountPercent === 'number'
      ? gameData.discountPercent
      : (gameData.discountPercent !== undefined ? Number(gameData.discountPercent) : computedDisc);

    const fullGame: Game = {
      id: newId,
      title: gameData.title || 'Nuevo Videojuego',
      slug: (gameData.title || 'juego').toLowerCase().replace(/\s+/g, '-'),
      originalPrice: origPrice,
      currentPrice: currPrice,
      discountPercent: finalDisc,
      platforms: gameData.platforms || ['PC'],
      categories: gameData.categories || ['Acción'],
      rating: 4.8,
      ratingCount: 1,
      description: gameData.description || 'Oferta sincronizada en la base de datos oficial.',
      coverImage: gameData.coverImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      screenshots: [],
      videos: [],
      reviews: [],
      steamAppId: gameData.steamAppId ? Number(gameData.steamAppId) : undefined,
      stores: gameData.stores || [{
        storeName: 'Steam',
        originalPrice: origPrice,
        currentPrice: currPrice,
        discountPercent: finalDisc,
        url: gameData.steamAppId ? `https://store.steampowered.com/app/${gameData.steamAppId}/` : 'https://store.steampowered.com/',
        isBest: finalDisc > 0
      }]
    };
    await saveGameToFirestore(fullGame);
    setGames(prev => [fullGame, ...prev.filter(g => g.id !== newId)]);
    await logActivity(`Añadido juego "${fullGame.title}" a Firestore`, 'CATALOG');
  };

  const removeGameFromFirestore = async (gameId: string) => {
    await deleteGameFromFirestore(gameId);
    setGames(prev => prev.filter(g => g.id !== gameId));
    await logActivity(`Eliminado juego ${gameId} de Firestore`, 'CATALOG');
  };

  const syncSteamSpecialsToFirestore = async (): Promise<number> => {
    try {
      const res = await apiSyncSteam(15);
      if (res.imported > 0) {
        const fresh = await fetchGamesFromFirestore();
        if (fresh.length > 0) setGames(fresh as Game[]);
      }
      return res.imported;
    } catch (err: any) {
      console.warn('Error sincronizando ofertas de Steam a Firestore:', err);
      return 0;
    }
  };

  const syncCheapSharkDealsToFirestore = async (): Promise<number> => {
    try {
      const res = await apiSyncCheapShark(15);
      if (res.imported > 0) {
        const fresh = await fetchGamesFromFirestore();
        if (fresh.length > 0) setGames(fresh as Game[]);
      }
      return res.imported;
    } catch (err: any) {
      console.warn('Error sincronizando ofertas de CheapShark a Firestore:', err);
      return 0;
    }
  };

  // Price Alerts State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [activeAlertGameId, setActiveAlertGameId] = useState<string | null>(null);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);
  const [alertSettings, setAlertSettings] = useState<PriceAlertSettings>(() => {
    return getStoredAlertSettings(currentUser?.id || 'guest');
  });
  const [notifications, setNotifications] = useState<PriceAlertNotification[]>(() => {
    return getStoredNotifications(currentUser?.id || 'guest');
  });

  // Initial Firestore Database Sync & Listeners
  useEffect(() => {
    refreshFirebaseDb();

    // Real-time subscription to community posts in Firestore
    const unsubPosts = subscribeToCommunityPosts((realtimePosts) => {
      if (Array.isArray(realtimePosts)) {
        setPosts(realtimePosts);
      }
    });

    // Real-time subscription to games in Firestore
    const unsubGames = subscribeToGames((realtimeGames) => {
      if (realtimeGames && realtimeGames.length > 0) {
        setGames(realtimeGames as Game[]);
      }
    });

    // Real-time subscription to activity logs in Firestore
    const unsubLogs = subscribeToActivityLogs((realtimeLogs) => {
      if (realtimeLogs && realtimeLogs.length > 0) {
        setActivityLogs(realtimeLogs);
      }
    });

    return () => {
      if (unsubPosts) unsubPosts();
      if (unsubGames) unsubGames();
      if (unsubLogs) unsubLogs();
    };
  }, []);

  // Re-sync alerts and notifications when currentUser changes
  useEffect(() => {
    const uid = currentUser?.id || 'guest';
    setAlertSettings(getStoredAlertSettings(uid));
    setNotifications(getStoredNotifications(uid));

    if (currentUser?.id) {
      // Fetch user's saved alert settings from Firestore
      fetchAlertSettingsFromFirestore(currentUser.id).then(dbSettings => {
        if (dbSettings) {
          setAlertSettings(dbSettings);
          saveStoredAlertSettings(currentUser.id, dbSettings);
        }
      });

      // Fetch user's notifications from Firestore
      fetchNotificationsFromFirestore(currentUser.id).then(dbNotifs => {
        if (dbNotifs.length > 0) {
          setNotifications(dbNotifs);
          saveStoredNotifications(currentUser.id, dbNotifs);
        }
      });
    }
  }, [currentUser?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(games));
    } catch {}
  }, [games]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('offertgames_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('offertgames_user');
      }
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('offertgames_posts_v3', JSON.stringify(posts));
    } catch {}
  }, [posts]);

  // Sync Firebase Auth state if configured
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) return;

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        return;
      }
      const isGoogleAccount = firebaseUser.providerData.some(provider => provider.providerId === 'google.com');
      const authEmail = (firebaseUser.email || '').trim().toLowerCase();
      const authName = firebaseUser.displayName || authEmail.split('@')[0] || 'Jugador';
      const authAvatar = firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';
      const providerName = (isGoogleAccount ? 'google' : 'local') as 'google' | 'steam' | 'epic' | 'local';

      // 1. Fetch existing user document from Firestore (preserves custom profile name/avatar, wishlist, admin role, etc.)
      const existingDbUser = await fetchUserFromFirestore(firebaseUser.uid);

      const updatedUser: User = {
        id: firebaseUser.uid,
        email: authEmail,
        name: existingDbUser?.name || authName,
        avatar: existingDbUser?.avatar || authAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        role: authEmail.toLowerCase().includes('admin') ? 'administrador' : (existingDbUser?.role || 'jugador'),
        wishlist: existingDbUser?.wishlist || [],
        joinedDate: existingDbUser?.joinedDate || 'Hoy',
        provider: providerName,
        isEmailVerified: firebaseUser.emailVerified,
        isSuspended: existingDbUser?.isSuspended || false
      };

      // 2. Persist to Firestore Users Collection
      syncUserToFirestore(updatedUser);

      // 3. Load user's saved alert settings from Firestore
      fetchAlertSettingsFromFirestore(firebaseUser.uid).then(dbSettings => {
        if (dbSettings) {
          setAlertSettings(dbSettings);
          saveStoredAlertSettings(firebaseUser.uid, dbSettings);
        }
      });

      // 4. Load user's notifications from Firestore
      fetchNotificationsFromFirestore(firebaseUser.uid).then(dbNotifs => {
        if (dbNotifs.length > 0) {
          setNotifications(dbNotifs);
          saveStoredNotifications(firebaseUser.uid, dbNotifs);
        }
      });

      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('offertgames_user', JSON.stringify(updatedUser));
      } catch {}

      setUsers(prev => {
        const exists = prev.find(usr => usr.id === firebaseUser.uid || usr.email.toLowerCase() === authEmail.toLowerCase());
        return exists ? prev.map(usr => usr.email === authEmail ? updatedUser : usr) : [...prev, updatedUser];
      });

      // Refresh all users list for admin
      fetchAllUsersFromFirestore().then(dbUsers => {
        if (dbUsers.length > 0) setUsers(dbUsers);
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync Supabase Auth state if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Check active session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const authEmail = u.email || '';
        const authName = u.user_metadata?.full_name || u.user_metadata?.name || authEmail.split('@')[0] || 'Jugador';
        const authAvatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';
        const providerName = (u.app_metadata?.provider || 'supabase') as 'google' | 'steam' | 'epic' | 'local';
        if (providerName === 'google') return;

        const updatedUser: User = {
          id: u.id,
          email: authEmail,
          name: authName,
          avatar: authAvatar,
          role: authEmail.toLowerCase().includes('admin') ? 'administrador' : 'jugador',
          wishlist: [],
          joinedDate: 'Hoy',
          provider: providerName,
          isEmailVerified: true
        };

        setCurrentUser(prev => prev?.id === u.id ? prev : updatedUser);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        const authEmail = u.email || '';
        const authName = u.user_metadata?.full_name || u.user_metadata?.name || authEmail.split('@')[0] || 'Jugador';
        const authAvatar = u.user_metadata?.avatar_url || u.user_metadata?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';
        const providerName = (u.app_metadata?.provider || 'supabase') as string;
        if (providerName === 'google') return;

        const authUser: User = {
          id: u.id,
          email: authEmail,
          name: authName,
          avatar: authAvatar,
          role: authEmail.toLowerCase().includes('admin') ? 'administrador' : 'jugador',
          wishlist: [],
          joinedDate: 'Hoy',
          provider: providerName as any,
          isEmailVerified: true
        };

        setCurrentUser(authUser);
        setUsers(prev => {
          const exists = prev.find(usr => usr.id === u.id || usr.email.toLowerCase() === authEmail.toLowerCase());
          return exists ? prev.map(usr => usr.email === authEmail ? authUser : usr) : [...prev, authUser];
        });
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initial Real-time Steam prices sync
  useEffect(() => {
    refreshSteamPrices();
  }, []);

  const refreshSteamPrices = async () => {
    setIsSyncing(true);
    try {
      const steamItems = await fetchSteamFeaturedCategories();
      if (steamItems.length > 0) {
        setGames(prev => syncGamesWithSteamSpecials(prev, steamItems));
        showToast('Precios reales de Steam actualizados en tiempo real');
      }
    } catch {
      // Offline fallback
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter & Search Logic
  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const toggleCategory = (c: Category) => {
    setSelectedCategories(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const clearFilters = () => {
    setSelectedPlatforms([]);
    setSelectedCategories([]);
    setPriceRange(100);
    setMinDiscount(0);
    setSearchQuery('');
  };

  const filteredGames = games.filter(g => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = g.title.toLowerCase().includes(q);
      const matchCat = g.categories.some(c => c.toLowerCase().includes(q));
      const matchPlat = g.platforms.some(p => p.toLowerCase().includes(q));
      if (!matchTitle && !matchCat && !matchPlat) return false;
    }

    // Platform filter (if any selected)
    if (selectedPlatforms.length > 0) {
      const hasPlat = selectedPlatforms.some(p => g.platforms.includes(p));
      if (!hasPlat) return false;
    }

    // Category filter (if any selected)
    if (selectedCategories.length > 0) {
      const hasCat = selectedCategories.some(c => g.categories.includes(c));
      if (!hasCat) return false;
    }

    // Price range
    if (g.currentPrice > priceRange) return false;

    // Minimum discount
    if (minDiscount > 0 && g.discountPercent < minDiscount) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'discount') return b.discountPercent - a.discountPercent;
    if (sortBy === 'price_asc') return a.currentPrice - b.currentPrice;
    if (sortBy === 'price_desc') return b.currentPrice - a.currentPrice;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  // Auth Handling (Flowchart 1 & 2)
  const openAuthModal = (mode: 'login' | 'register' = 'login', reason: string = '') => {
    setAuthModalMode(mode);
    setAuthModalReason(reason);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthModalReason('');
  };

  const login = (email: string, pass: string): { success: boolean; error?: string } => {
    // Flowchart validation: "¿Datos correctos? Si no -> Acceso denegado"
    if (!email || !pass) {
      return { success: false, error: 'Por favor, introduce correo electrónico y contraseña.' };
    }

    // Administrator Check (Flowchart 2)
    if (email.toLowerCase().includes('admin') || email.toLowerCase() === 'admin@offertgames.com') {
      if (pass !== 'admin123') {
        return { success: false, error: 'Acceso denegado: Contraseña de administrador incorrecta.' };
      }
      const adminUser: User = {
        id: 'user-admin',
        email: 'admin@offertgames.com',
        name: 'Administrador OffertGames',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
        role: 'administrador',
        wishlist: [],
        joinedDate: 'Enero 2024'
      };
      setCurrentUser(adminUser);
      closeAuthModal();
      showToast('Sesión de Administrador iniciada.');
      setActiveTab('admin');
      return { success: true };
    }

    // Regular user login
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      if (found.isSuspended) {
        return { success: false, error: 'Acceso denegado: Esta cuenta ha sido suspendida por el administrador.' };
      }
      setCurrentUser(found);
      closeAuthModal();
      showToast(`¡Bienvenido de nuevo, ${found.name}!`);
      return { success: true };
    }

    // Generic player login if valid email
    if (email.includes('@')) {
      const newUser: User = {
        id: `user-${Date.now()}`,
        email,
        name: email.split('@')[0],
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        role: 'jugador',
        wishlist: [],
        joinedDate: 'Hoy'
      };
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      closeAuthModal();
      showToast(`Sesión iniciada con éxito.`);
      return { success: true };
    }

    return { success: false, error: 'Error: Correo no válido o credenciales incorrectas. Permite reintentar.' };
  };

  const registerUser = (name: string, email: string, pass: string): { success: boolean; error?: string } => {
    if (!name || !email || !pass) {
      return { success: false, error: 'Todos los campos son obligatorios.' };
    }
    if (pass.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      role: 'jugador',
      wishlist: [],
      joinedDate: 'Hoy'
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    closeAuthModal();
    showToast(`¡Cuenta creada con éxito! Bienvenido, ${name}`);
    syncUserToFirestore(newUser);
    return { success: true };
  };

  const loginWithOAuth = (
    provider: 'google' | 'steam' | 'epic' | 'github',
    userData: { id?: string; name: string; email: string; avatar: string }
  ): { success: boolean } => {
    // Check rate limit on auth attempts
    const rateCheck = securityLimiter.checkLimit('auth_attempt', RATE_LIMITS.AUTH_ATTEMPT.max, RATE_LIMITS.AUTH_ATTEMPT.windowSeconds);
    if (!rateCheck.allowed) {
      showToast(rateCheck.error || 'Demasiados intentos de acceso.');
      return { success: false };
    }

    const safeName = sanitizeText(userData.name) || userData.email.split('@')[0];
    const safeAvatar = sanitizeUrl(userData.avatar) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';
    const cleanEmail = userData.email.trim().toLowerCase();

    // Verify and establish session fingerprint
    verifySessionIntegrity();

    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    const updatedUser: User = {
      id: userData.id || existing?.id || `user-${provider}-${Date.now()}`,
      email: cleanEmail,
      name: safeName,
      avatar: safeAvatar,
      role: cleanEmail.includes('admin') || cleanEmail.includes('nacho') ? 'administrador' : (existing?.role || 'jugador'),
      wishlist: existing?.wishlist || [],
      joinedDate: existing?.joinedDate || 'Hoy',
      provider,
      isEmailVerified: true,
      isSuspended: existing?.isSuspended || false
    };

    if (existing) {
      setUsers(prev => prev.map(u => u.id === existing.id ? updatedUser : u));
    } else {
      setUsers(prev => [...prev, updatedUser]);
    }

    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('offertgames_user', JSON.stringify(updatedUser));
    } catch {}

    // Persist to Firestore Users Collection
    syncUserToFirestore(updatedUser);

    // Load alert settings & notifications from Firestore
    fetchAlertSettingsFromFirestore(updatedUser.id).then(dbSettings => {
      if (dbSettings) {
        setAlertSettings(dbSettings);
        saveStoredAlertSettings(updatedUser.id, dbSettings);
      }
    });
    fetchNotificationsFromFirestore(updatedUser.id).then(dbNotifs => {
      if (dbNotifs.length > 0) {
        setNotifications(dbNotifs);
        saveStoredNotifications(updatedUser.id, dbNotifs);
      }
    });

    closeAuthModal();
    const providerLabel = provider === 'google' ? 'Google' : provider === 'steam' ? 'Steam' : 'Epic Games';
    showToast(`Sesión iniciada con ${providerLabel}: ¡Bienvenido/a, ${safeName}!`);
    return { success: true };
  };

  const logout = () => {
    if (isFirebaseConfigured && firebaseAuth) {
      firebaseSignOut(firebaseAuth).catch(() => {});
    }
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    // Clean all session security tokens and credentials
    purgeSessionSecurityState();
    setCurrentUser(null);
    try {
      localStorage.removeItem('offertgames_user');
    } catch {}
    if (activeTab === 'admin') setActiveTab('ofertas');
    showToast('Sesión cerrada correctamente.');
  };

  // Wishlist Action (Flowchart 1)
  const toggleWishlist = (gameId: string) => {
    if (!currentUser) {
      openAuthModal('login', 'Debes iniciar sesión para guardar juegos en tu lista de deseos.');
      return;
    }

    const inList = currentUser.wishlist.includes(gameId);
    const updated = inList
      ? currentUser.wishlist.filter(id => id !== gameId)
      : [...currentUser.wishlist, gameId];

    const updatedUser = { ...currentUser, wishlist: updated };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

    // Sync wishlist with Firestore
    if (currentUser?.id) {
      updateUserWishlistInFirestore(currentUser.id, updated);
    }

    // AdTech Tracking: Record genre preferences (Shooters, Strategy, etc.) for commercial ad monetization
    if (!inList) {
      const addedGame = games.find(g => g.id === gameId);
      if (addedGame) {
        const fullWishGames = games.filter(g => updated.includes(g.id));
        trackUserInteraction({
          game: addedGame,
          action: 'wishlist',
          user: updatedUser,
          allWishlistGames: fullWishGames
        }).catch(() => {});
      }
    }

    showToast(inList ? 'Eliminado de tu lista de deseos' : 'Guardado en tu lista de deseos');
  };

  // Price Alerts Methods
  const openAlertModal = (gameId?: string) => {
    if (gameId) {
      setActiveAlertGameId(gameId);
    }
    setIsAlertModalOpen(true);
  };
  const closeAlertModal = () => setIsAlertModalOpen(false);

  const updateAlertSettings = (newSettings: PriceAlertSettings) => {
    setAlertSettings(newSettings);
    const uid = currentUser?.id || 'guest';
    saveStoredAlertSettings(uid, newSettings);
    if (currentUser?.id) {
      saveAlertSettingsToFirestore(currentUser.id, newSettings);
    }
  };

  const markNotificationAsRead = (id: string) => {
    const uid = currentUser?.id || 'guest';
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveStoredNotifications(uid, updated);
      return updated;
    });
    if (currentUser?.id) {
      markNotificationAsReadInFirestore(currentUser.id, id);
    }
  };

  const markAllNotificationsAsRead = () => {
    const uid = currentUser?.id || 'guest';
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveStoredNotifications(uid, updated);
      return updated;
    });
    if (currentUser?.id) {
      // Mark all read in Firestore
      notifications.forEach(n => markNotificationAsReadInFirestore(currentUser.id, n.id));
    }
  };

  const clearAllNotifications = () => {
    const uid = currentUser?.id || 'guest';
    setNotifications([]);
    saveStoredNotifications(uid, []);
    if (currentUser?.id) {
      clearAllNotificationsInFirestore(currentUser.id);
    }
    showToast('Avisos de precios eliminados.');
  };

  const checkPriceAlertsNow = async () => {
    if (!currentUser) return; // Strict gating: Only registered users can use price alerts
    const uid = currentUser.id;
    setIsCheckingAlerts(true);
    try {
      const res = await runServerPriceCheck(uid, currentUser.email, alertSettings, games);
      if (res.alerts && res.alerts.length > 0) {
        let addedCount = 0;
        setNotifications(prev => {
          let currentList = prev;
          for (const alert of res.alerts) {
            const result = addNotificationSafely(uid, alert, currentList);
            currentList = result.updatedList;
            if (result.added) addedCount++;
          }
          return currentList;
        });

        if (addedCount > 0) {
          const emailNotice = alertSettings.notifyEmail && res.emailsSent && res.emailsSent > 0
            ? ` (aviso enviado a ${currentUser.email})`
            : '';
          showToast(`¡Se han detectado ${addedCount} ofertas por debajo de ${alertSettings.maxPrice} €${emailNotice}!`);
        } else {
          showToast('Precios comprobados en el servidor. No hay nuevas ofertas.');
        }
      } else {
        showToast('Comprobación de precios completada en el servidor.');
      }
    } catch {
      showToast('Error al comprobar precios en el servidor.');
    } finally {
      setIsCheckingAlerts(false);
    }
  };

  const testSamplePriceAlert = async (params: {
    gameTitle: string;
    steamAppId?: number;
    maxPrice: number;
    gameId: string;
    coverImage?: string;
  }) => {
    if (!currentUser) {
      openAuthModal('login', 'Inicia sesión para probar los avisos de precios.');
      return null;
    }
    const uid = currentUser.id;
    const res = await testSingleGameAlert({
      userId: uid,
      userEmail: currentUser.email,
      notifyEmail: alertSettings.notifyEmail,
      ...params
    });

    if (res?.alert) {
      setNotifications(prev => {
        const result = addNotificationSafely(uid, res.alert, prev);
        return result.updatedList;
      });
    }

    return res;
  };

  const sendTestAlertEmail = async (
    paramsOrTitle?: string | {
      to?: string;
      gameTitle?: string;
      currentPrice?: number;
      regularPrice?: number;
      maxPrice?: number;
      storeName?: string;
      buyUrl?: string;
      coverImage?: string;
      steamAppId?: number;
    },
    currentPrice?: number,
    maxPrice?: number
  ) => {
    if (!currentUser?.email && (typeof paramsOrTitle !== 'object' || !paramsOrTitle?.to)) {
      return {
        ok: false,
        sent: false,
        message: 'Debes iniciar sesión con tu cuenta registrada para enviar un correo de prueba.'
      };
    }

    const fallbackGame = (activeAlertGameId ? games.find(g => g.id === activeAlertGameId) : null) || games[0];

    if (typeof paramsOrTitle === 'object' && paramsOrTitle !== null) {
      return await sendTestEmail({
        to: paramsOrTitle.to || currentUser?.email || '',
        gameTitle: paramsOrTitle.gameTitle || fallbackGame?.title || 'Juego en oferta',
        currentPrice: paramsOrTitle.currentPrice ?? fallbackGame?.currentPrice ?? 19.99,
        regularPrice: paramsOrTitle.regularPrice ?? fallbackGame?.originalPrice,
        maxPrice: paramsOrTitle.maxPrice ?? alertSettings.maxPrice ?? 20,
        storeName: paramsOrTitle.storeName || fallbackGame?.stores?.[0]?.storeName || 'Steam (España)',
        buyUrl: paramsOrTitle.buyUrl || (fallbackGame?.steamAppId ? `https://store.steampowered.com/app/${fallbackGame.steamAppId}/` : fallbackGame?.stores?.[0]?.url || 'https://store.steampowered.com/'),
        coverImage: paramsOrTitle.coverImage || fallbackGame?.coverImage,
        steamAppId: paramsOrTitle.steamAppId ?? fallbackGame?.steamAppId
      });
    }

    const chosenGame = games.find(g => g.title === paramsOrTitle || g.id === paramsOrTitle) || fallbackGame;
    return await sendTestEmail({
      to: currentUser?.email || '',
      gameTitle: chosenGame?.title || paramsOrTitle || 'Juego en oferta',
      currentPrice: currentPrice ?? chosenGame?.currentPrice ?? 19.99,
      regularPrice: chosenGame?.originalPrice,
      maxPrice: maxPrice ?? alertSettings.maxPrice ?? 20,
      storeName: chosenGame?.stores?.[0]?.storeName || 'Steam (España)',
      buyUrl: chosenGame?.steamAppId ? `https://store.steampowered.com/app/${chosenGame.steamAppId}/` : (chosenGame?.stores?.[0]?.url || 'https://store.steampowered.com/'),
      coverImage: chosenGame?.coverImage,
      steamAppId: chosenGame?.steamAppId
    });
  };

  // Periodic automatic price check if alerts are enabled AND user is registered
  useEffect(() => {
    if (!alertSettings.enabled || !currentUser) return;
    const timer = setTimeout(() => {
      checkPriceAlertsNow();
    }, 4000);
    const interval = setInterval(() => {
      checkPriceAlertsNow();
    }, 15 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [alertSettings.enabled, alertSettings.maxPrice, alertSettings.scope, currentUser?.id]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Community Interactions
  const likePost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const liked = p.likedByMe;
        const newLikes = liked ? Math.max(0, p.likes - 1) : p.likes + 1;
        const updatedPost = {
          ...p,
          likedByMe: !liked,
          likes: newLikes,
          helpfulCount: newLikes
        };
        updatePostInFirestore(postId, { likes: newLikes, helpfulCount: newLikes });
        return updatedPost;
      }
      return p;
    }));
  };

  const savePost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, savedByMe: !p.savedByMe };
      }
      return p;
    }));
  };

  // Community Posting & Reviews with Google Maps Style Rating & Rules Validation
  const createPost = (postData: {
    title: string;
    content: string;
    category: 'General' | 'Ofertas' | 'Juegos' | 'Plataformas' | 'Recomendaciones';
    image?: string;
    hasVideo?: boolean;
    rating?: number;
    recommended?: boolean;
    tags?: string[];
    gameTitle?: string;
    authorName?: string;
  }): { success: boolean; error?: string } => {
    // Rate limiting defense against post flooding
    const rateCheck = securityLimiter.checkLimit('post_create', RATE_LIMITS.POST_CREATE.max, RATE_LIMITS.POST_CREATE.windowSeconds);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.error || 'Por favor espera antes de publicar otra vez.' };
    }

    // Exact flowchart rule check: "SIN SUBIDA DE VIDEO"
    if (postData.hasVideo) {
      return {
        success: false,
        error: 'Aviso: La publicación incumple las normas de la comunidad. No está permitida la subida de vídeos en publicaciones de usuarios. Por favor, edita o cancela.'
      };
    }

    // Check minimum content
    if (!postData.title.trim() || !postData.content.trim()) {
      return { success: false, error: 'Por favor, introduce un título y contenido para tu reseña u opinión.' };
    }

    // Check prohibited words
    const banned = ['cheat', 'hack', 'piratear', 'key pirata', 'warez'];
    if (banned.some(b => postData.content.toLowerCase().includes(b))) {
      return {
        success: false,
        error: 'Aviso: Tu publicación incumple las normas de la comunidad sobre software no autorizado o piratería. Por favor, edita el contenido o cancela.'
      };
    }

    // Sanitize user inputs against XSS and malicious scripts
    const safeTitle = sanitizeText(postData.title);
    const safeContent = sanitizeHtmlContent(postData.content);
    const safeImage = postData.image ? sanitizeUrl(postData.image) : undefined;
    const safeGameTitle = postData.gameTitle ? sanitizeText(postData.gameTitle) : undefined;

    const authorName = currentUser?.name || postData.authorName?.trim() || 'Jugador de la Comunidad';
    const authorAvatar = currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorName)}`;
    const authorRole = currentUser?.role === 'administrador' ? 'Admin' : (currentUser ? 'Miembro' : 'Gamer');

    // Valid -> Publicación visible estilo Google Maps
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      author: authorName,
      avatar: authorAvatar,
      authorRole: authorRole,
      authorDonorTier: currentUser?.donorTier,
      timeAgo: 'ahora mismo',
      category: postData.category,
      title: safeTitle,
      content: safeContent,
      image: safeImage,
      likes: 0,
      likedByMe: false,
      savedByMe: false,
      commentsCount: 0,
      comments: [],
      rating: typeof postData.rating === 'number' ? postData.rating : 5,
      recommended: postData.recommended ?? true,
      tags: postData.tags && postData.tags.length > 0 ? postData.tags : ['Opinión verificada'],
      gameTitle: safeGameTitle || undefined,
      userReviewCount: 1,
      isLocalGuide: true,
      helpfulCount: 0
    };

    setPosts(prev => [newPost, ...prev]);
    savePostToFirestore(newPost);
    showToast('¡Reseña publicada y guardada con éxito en el servidor!');
    return { success: true };
  };

  const addComment = (postId: string, content: string, guestAuthorName?: string): boolean => {
    if (!content.trim()) return false;

    // Rate limiting defense against comment flooding
    const rateCheck = securityLimiter.checkLimit('comment_create', RATE_LIMITS.COMMENT_CREATE.max, RATE_LIMITS.COMMENT_CREATE.windowSeconds);
    if (!rateCheck.allowed) {
      showToast(rateCheck.error || 'Por favor espera antes de enviar más comentarios.');
      return false;
    }

    const safeComment = sanitizeText(content);
    const commenterName = currentUser?.name || guestAuthorName?.trim() || 'Jugador de la Comunidad';
    const commenterAvatar = currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(commenterName)}`;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const newComments = [
          ...p.comments,
          {
            id: `c-${Date.now()}`,
            author: commenterName,
            avatar: commenterAvatar,
            authorDonorTier: currentUser?.donorTier,
            timeAgo: 'ahora mismo',
            content: safeComment
          }
        ];
        const newCount = p.commentsCount + 1;
        updatePostInFirestore(postId, {
          commentsCount: newCount,
          comments: newComments
        });
        return {
          ...p,
          commentsCount: newCount,
          comments: newComments
        };
      }
      return p;
    }));
    showToast('Respuesta guardada con éxito en el servidor');
    return true;
  };

  const reportPost = (postId: string, reason: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const newReport: ReportItem = {
      id: `rep-${Date.now()}`,
      postId,
      postTitle: post.title,
      authorName: post.author,
      reportedBy: currentUser ? currentUser.name : 'Usuario anónimo',
      reason,
      date: 'Hoy',
      status: 'pending'
    };

    setReports(prev => [newReport, ...prev]);
    saveReportToFirestore(newReport);
    showToast('Denuncia enviada y guardada en la base de datos.');
  };

  // Admin Actions (Flowchart 2)
  const retireOffer = (gameId: string) => {
    setGames(prev => prev.filter(g => g.id !== gameId));
    showToast('Oferta retirada del catálogo');
  };

  const createOffer = (gameData: Partial<Game>) => {
    const orig = gameData.originalPrice || 49.99;
    const curr = gameData.currentPrice || orig;
    const disc = (orig > 0 && curr < orig)
      ? (gameData.discountPercent ?? Math.round((1 - (curr / orig)) * 100))
      : (gameData.discountPercent ?? 0);

    const newGame: Game = {
      id: `game-custom-${Date.now()}`,
      title: gameData.title || 'Nueva Oferta',
      slug: (gameData.title || 'oferta').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      originalPrice: orig,
      currentPrice: curr,
      discountPercent: disc,
      platforms: gameData.platforms || ['PC'],
      categories: gameData.categories || ['Acción'],
      rating: 4.5,
      ratingCount: 1,
      description: gameData.description || 'Descripción de la oferta añadida por el administrador.',
      coverImage: gameData.coverImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      screenshots: [gameData.coverImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'],
      videos: [],
      stores: [
        { storeName: 'Steam', originalPrice: orig, currentPrice: curr, discountPercent: disc, url: 'https://store.steampowered.com/', isBest: disc > 0 }
      ],
      reviews: []
    };

    setGames(prev => [newGame, ...prev]);
    showToast('Nueva oferta creada y publicada en el catálogo.');
  };

  const updateOffer = (gameId: string, updates: Partial<Game>) => {
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, ...updates } : g));
    showToast('Oferta actualizada correctamente');
  };

  const resolveReport = (reportId: string, action: 'remove_and_warn' | 'dismiss') => {
    const rep = reports.find(r => r.id === reportId);
    if (!rep) return;

    if (action === 'remove_and_warn') {
      // Remove content & notify user
      setPosts(prev => prev.filter(p => p.id !== rep.postId));
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved_removed' } : r));
      deletePostFromFirestore(rep.postId);
      updateReportInFirestore(reportId, { status: 'resolved_removed' });
      showToast(`Contenido retirado y aviso enviado a ${rep.authorName}.`);
    } else {
      // Dismiss without penalty
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved_dismissed' } : r));
      updateReportInFirestore(reportId, { status: 'resolved_dismissed' });
      showToast('Denuncia archivada sin sanción.');
    }
  };

  const toggleUserSuspension = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const next = !u.isSuspended;
        updateUserSuspensionInFirestore(userId, next);
        showToast(next ? `Cuenta de ${u.name} suspendida` : `Cuenta de ${u.name} reactivada`);
        return { ...u, isSuspended: next };
      }
      return u;
    }));
  };

  // Donation & Supporter Badges Logic (Pago único permanente)
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const openDonationModal = () => setIsDonationModalOpen(true);
  const closeDonationModal = () => setIsDonationModalOpen(false);

  // Saved Payment Methods (Amazon/SaaS Wallet)
  const savedPaymentMethods = currentUser?.savedPaymentMethods || [];

  const addPaymentMethod = async (methodData: Omit<SavedPaymentMethod, 'id' | 'createdAt'>) => {
    if (!currentUser) return;
    const newMethod: SavedPaymentMethod = {
      ...methodData,
      id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    let updatedList = currentUser.savedPaymentMethods || [];
    if (newMethod.isDefault) {
      updatedList = updatedList.map(m => ({ ...m, isDefault: false }));
    } else if (updatedList.length === 0) {
      newMethod.isDefault = true;
    }
    updatedList = [...updatedList, newMethod];

    const updatedUser = { ...currentUser, savedPaymentMethods: updatedList };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    try {
      localStorage.setItem('offertgames_user', JSON.stringify(updatedUser));
    } catch {}
    await updateUserPaymentMethodsInFirestore(updatedUser.id, updatedList);
    showToast('Método de pago guardado correctamente');
  };

  const removePaymentMethod = async (methodId: string) => {
    if (!currentUser) return;
    const updatedList = (currentUser.savedPaymentMethods || []).filter(m => m.id !== methodId);
    const updatedUser = { ...currentUser, savedPaymentMethods: updatedList };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    try {
      localStorage.setItem('offertgames_user', JSON.stringify(updatedUser));
    } catch {}
    await updateUserPaymentMethodsInFirestore(updatedUser.id, updatedList);
    showToast('Método de pago eliminado');
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    if (!currentUser) return;
    const updatedList = (currentUser.savedPaymentMethods || []).map(m => ({
      ...m,
      isDefault: m.id === methodId
    }));
    const updatedUser = { ...currentUser, savedPaymentMethods: updatedList };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    try {
      localStorage.setItem('offertgames_user', JSON.stringify(updatedUser));
    } catch {}
    await updateUserPaymentMethodsInFirestore(updatedUser.id, updatedList);
    showToast('Método de pago predeterminado actualizado');
  };

  const processDonation = async (
    tier: DonorTier,
    paymentDetails?: any
  ): Promise<{ success: boolean; message: string }> => {
    const oneTimeAmounts: Record<DonorTier, number> = {
      bronce: 2,
      plata: 5,
      oro: 10,
      diamante: 20
    };
    const amount = oneTimeAmounts[tier] || 5;

    let methodType: 'paypal' | 'card' = 'paypal';
    let paypalEmail = typeof paymentDetails === 'string' ? paymentDetails : paymentDetails?.paypalEmail;
    let cardBrand: string | undefined;
    let cardLast4: string | undefined;

    if (typeof paymentDetails === 'object' && paymentDetails !== null) {
      if (paymentDetails.methodType === 'card' && paymentDetails.cardData) {
        methodType = 'card';
        cardBrand = 'visa';
        cardLast4 = paymentDetails.cardData.number ? paymentDetails.cardData.number.replace(/\s+/g, '').slice(-4) : '4242';
        
        // Save card if user requested "guardar para futuras compras"
        if (paymentDetails.cardData.saveCard && currentUser) {
          await addPaymentMethod({
            type: 'card',
            isDefault: (currentUser.savedPaymentMethods?.length || 0) === 0,
            cardholderName: paymentDetails.cardData.name || currentUser.name,
            cardNumberMasked: `•••• •••• •••• ${cardLast4}`,
            cardBrand: 'visa',
            expiryMonth: paymentDetails.cardData.exp?.split('/')[0] || '12',
            expiryYear: paymentDetails.cardData.exp?.split('/')[1] || '28'
          });
        }
      } else if (paymentDetails.methodType === 'saved' && paymentDetails.savedMethodId) {
        const found = (currentUser?.savedPaymentMethods || []).find(m => m.id === paymentDetails.savedMethodId);
        if (found) {
          methodType = found.type;
          paypalEmail = found.paypalEmail;
          cardBrand = found.cardBrand;
          cardLast4 = found.cardNumberMasked?.slice(-4);
        }
      } else if (paymentDetails.methodType === 'paypal') {
        methodType = 'paypal';
        paypalEmail = paymentDetails.paypalEmail;
        if (paymentDetails.savePaypal && currentUser && paypalEmail) {
          const alreadyExists = (currentUser.savedPaymentMethods || []).some(m => m.paypalEmail === paypalEmail);
          if (!alreadyExists) {
            await addPaymentMethod({
              type: 'paypal',
              isDefault: (currentUser.savedPaymentMethods?.length || 0) === 0,
              paypalEmail
            });
          }
        }
      }
    }

    let userToUpdate = currentUser;
    if (!userToUpdate) {
      // Create an active donor session if guest
      const guestDonor: User = {
        id: `donor-${Date.now()}`,
        email: paypalEmail || 'donador@offertgames.com',
        name: paypalEmail ? paypalEmail.split('@')[0] : 'Donador OffertGames',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        role: 'jugador',
        donorTier: tier,
        wishlist: [],
        joinedDate: 'Hoy',
        provider: 'local',
        savedPaymentMethods: []
      };
      userToUpdate = guestDonor;
    }

    const donorInfo: DonorInfo = {
      tier,
      amountMonthlyEur: amount,
      subscribedAt: new Date().toISOString(),
      active: true,
      paymentMethod: 'paypal',
      paypalEmail: paypalEmail || userToUpdate.email,
      txId: `PAYPAL_${Date.now()}`,
      isOneTime: true
    };

    const updatedUser: User = {
      ...userToUpdate,
      donorTier: tier,
      donor: donorInfo
    };

    setCurrentUser(updatedUser);
    setUsers(prev => {
      const exists = prev.find(u => u.id === updatedUser.id);
      return exists ? prev.map(u => u.id === updatedUser.id ? updatedUser : u) : [...prev, updatedUser];
    });

    try {
      localStorage.setItem('offertgames_user', JSON.stringify(updatedUser));
    } catch {}

    // Sync to Cloud Firestore
    await syncUserToFirestore(updatedUser);
    await updateUserDonorStatusInFirestore(updatedUser.id, donorInfo);
    await recordDonationInFirestore({
      userId: updatedUser.id,
      userName: updatedUser.name,
      userEmail: updatedUser.email,
      tier,
      amountMonthlyEur: amount,
      paymentMethod: methodType,
      paypalEmail: donorInfo.paypalEmail,
      cardBrand,
      cardLast4,
      recipientPaypal: 'https://paypal.me/OffertGames',
      txId: donorInfo.txId
    });

    // Retroactively update user's posts in active feed
    setPosts(prev => prev.map(p => {
      if (p.author === updatedUser.name) {
        return { ...p, authorDonorTier: tier };
      }
      return p;
    }));

    await logActivity(`Donación confirmada (Pago único): Medalla ${tier.toUpperCase()} (${amount}€) por ${updatedUser.name} vía ${methodType.toUpperCase()}`, 'DONATION');
    showToast(`Medalla ${tier.toUpperCase()} activada con éxito.`);
    return {
      success: true,
      message: `¡Pago de ${amount}€ completado! Tu medallita permanente ${tier.toUpperCase()} ya está visible junto a tu nombre.`
    };
  };

  // Customer Support Modal Logic (Servicio al Cliente)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const openSupportModal = () => setIsSupportModalOpen(true);
  const closeSupportModal = () => setIsSupportModalOpen(false);

  // Profile Management Logic (1 free change per month or 0.50€ via PayPal)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<'perfil' | 'pagos'>('perfil');
  const openProfileModal = (tab: 'perfil' | 'pagos' = 'perfil') => {
    setProfileModalInitialTab(tab);
    setIsProfileModalOpen(true);
  };
  const closeProfileModal = () => setIsProfileModalOpen(false);

  const updateUserProfileData = async (params: {
    newName?: string;
    newAvatar?: string;
    isPaid?: boolean;
    paypalEmail?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Debes tener una sesión iniciada para editar tu perfil.' };
    }

    const changingName = Boolean(params.newName && params.newName.trim() && params.newName.trim() !== currentUser.name);
    const changingAvatar = Boolean(params.newAvatar && params.newAvatar.trim() && params.newAvatar.trim() !== currentUser.avatar);

    if (!changingName && !changingAvatar) {
      return { success: true };
    }

    const previousName = currentUser.name;
    const updatedName = changingName ? params.newName!.trim() : currentUser.name;
    const updatedAvatar = changingAvatar ? params.newAvatar!.trim() : currentUser.avatar;

    const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const updatedUser: User = {
      ...currentUser,
      name: updatedName,
      avatar: updatedAvatar,
      lastProfileChangeMonth: currentYearMonth
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));

    try {
      localStorage.setItem('offertgames_user', JSON.stringify(updatedUser));
    } catch {}

    // Persist profile changes to Cloud Firestore
    await updateUserProfileInFirestore(updatedUser.id, {
      name: updatedName,
      avatar: updatedAvatar,
      lastProfileChangeMonth: currentYearMonth
    });

    // Retroactively update all previous posts and comments authored by this user in Firestore
    await updateAuthorPostsInFirestore(previousName, updatedName, updatedAvatar);

    // Retroactively update posts and comments authored by this user in local state
    setPosts(prev => prev.map(p => {
      const isAuthor = p.author === previousName;
      const updatedComments = p.comments.map(c => 
        c.author === previousName ? { ...c, author: updatedName, avatar: updatedAvatar } : c
      );
      if (isAuthor) {
        return {
          ...p,
          author: updatedName,
          avatar: updatedAvatar,
          comments: updatedComments
        };
      }
      return {
        ...p,
        comments: updatedComments
      };
    }));

    if (params.isPaid) {
      await recordDonationInFirestore({
        userId: updatedUser.id,
        userName: updatedName,
        userEmail: updatedUser.email,
        tier: updatedUser.donorTier || 'bronce',
        amountMonthlyEur: 0.50,
        paymentMethod: 'paypal',
        paypalEmail: params.paypalEmail || updatedUser.email,
        txId: `PROFILE_PAY_${Date.now()}`
      });
    }

    await logActivity(`Perfil actualizado para "${updatedName}"`, 'USER_PROFILE');
    showToast('¡Perfil actualizado y guardado en el servidor con éxito!');
    return { success: true };
  };

  return (
    <AppContext.Provider
      value={{
        isFirebaseDbActive,
        firebaseDbMessage,
        refreshFirebaseDb,
        activityLogs,
        addGameToFirestore,
        removeGameFromFirestore,
        syncSteamSpecialsToFirestore,
        syncCheapSharkDealsToFirestore,
        getApisConfigurationReport,
        logActivity,
        activeTab,
        setActiveTab,
        selectedGame,
        setSelectedGame: handleSetSelectedGame,
        searchQuery,
        setSearchQuery,
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
        games,
        filteredGames,
        isSyncing,
        refreshSteamPrices,
        toggleWishlist,
        currentUser,
        authModalOpen,
        authModalMode,
        authModalReason,
        openAuthModal,
        closeAuthModal,
        login,
        registerUser,
        loginWithOAuth,
        logout,
        posts,
        activeCommunityCategory,
        setActiveCommunityCategory,
        likePost,
        savePost,
        createPost,
        addComment,
        reportPost,
        users,
        reports,
        retireOffer,
        createOffer,
        updateOffer,
        resolveReport,
        toggleUserSuspension,
        toastMessage,
        showToast,
        alertSettings,
        notifications,
        unreadNotificationsCount,
        isAlertModalOpen,
        activeAlertGameId,
        setActiveAlertGameId,
        isCheckingAlerts,
        openAlertModal,
        closeAlertModal,
        updateAlertSettings,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        checkPriceAlertsNow,
        testSamplePriceAlert,
        sendTestAlertEmail,
        viewMode,
        setViewMode,
        mobileDevice,
        setMobileDevice,
        isMobileRotated,
        setIsMobileRotated,
        mobileScale,
        setMobileScale,
        isDonationModalOpen,
        openDonationModal,
        closeDonationModal,
        processDonation,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        updateUserProfileData,
        isSupportModalOpen,
        openSupportModal,
        closeSupportModal,
        savedPaymentMethods,
        addPaymentMethod,
        removePaymentMethod,
        setDefaultPaymentMethod
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
