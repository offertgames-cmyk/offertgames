export type Platform = 'PC' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'Epic Games' | 'GOG';

export type Category = 
  | 'Acción'
  | 'Aventura'
  | 'RPG'
  | 'Estrategia'
  | 'Simulación'
  | 'Deportes'
  | 'Indie'
  | 'Carreras'
  | 'Terror';

export interface StorePrice {
  storeName: 'Steam' | 'Epic Games' | 'Nintendo eShop' | 'PlayStation Store' | 'Xbox Store' | 'Amazon' | 'GAME' | 'Fnac' | 'GOG';
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  url: string;
  isBest?: boolean;
}

export interface GameVideo {
  id: string;
  title: string;
  videoUrl: string; // Direct mp4/webm or embedded video
  thumbnail: string;
  type: 'trailer' | 'gameplay';
}

export interface CommunityReview {
  id: string;
  author: string;
  avatar: string;
  badge?: string; // e.g. "Imprescindible en Switch", "Mejor que el anterior", "Horas infinitas de diversión"
  timeAgo: string;
  content: string;
  likes: number;
  commentsCount: number;
  recommended: boolean;
}

export interface Game {
  id: string;
  steamAppId?: number;
  title: string;
  subtitle?: string;
  slug: string;
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  platforms: Platform[];
  categories: Category[];
  rating: number; // e.g. 4.9
  ratingCount: number; // e.g. 12400
  description: string;
  coverImage: string;
  heroImage?: string;
  screenshots: string[];
  videos: GameVideo[];
  stores: StorePrice[];
  isHero?: boolean;
  isFeatured?: boolean;
  reviews: CommunityReview[];
  releaseDate?: string;
  publisher?: string;
  sourceApi?: string;
  lastUpdated?: string;
}

export interface CommunityPost {
  id: string;
  author: string;
  avatar: string;
  authorRole?: string;
  timeAgo: string;
  category: 'General' | 'Ofertas' | 'Juegos' | 'Plataformas' | 'Recomendaciones';
  title: string;
  content: string;
  image?: string;
  likes: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  commentsCount: number;
  authorDonorTier?: DonorTier;
  comments: {
    id: string;
    author: string;
    avatar: string;
    timeAgo: string;
    content: string;
    authorDonorTier?: DonorTier;
  }[];
  isReported?: boolean;
  reportReason?: string;
  // Campos de valoración y reseñas estilo Google Maps
  rating?: number; // 1 a 5 estrellas
  recommended?: boolean;
  tags?: string[];
  gameTitle?: string;
  userReviewCount?: number;
  isLocalGuide?: boolean;
  helpfulCount?: number;
}

export type DonorTier = 'bronce' | 'plata' | 'oro' | 'diamante';

export interface DonorInfo {
  tier: DonorTier;
  amountMonthlyEur: number;
  subscribedAt: string;
  active: boolean;
  paymentMethod: 'paypal';
  paypalEmail?: string;
  txId?: string;
  isOneTime?: boolean;
}

export type PaymentMethodType = 'card' | 'paypal';

export interface SavedPaymentMethod {
  id: string;
  type: PaymentMethodType;
  isDefault: boolean;
  createdAt: string;
  // For card:
  cardholderName?: string;
  cardNumberMasked?: string; // e.g. "•••• •••• •••• 4242"
  cardBrand?: 'visa' | 'mastercard' | 'amex' | 'generic';
  expiryMonth?: string;
  expiryYear?: string;
  // For paypal:
  paypalEmail?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'jugador' | 'administrador';
  donorTier?: DonorTier;
  donor?: DonorInfo;
  isSuspended?: boolean;
  wishlist: string[]; // game IDs
  joinedDate: string;
  provider?: 'local' | 'google' | 'steam' | 'epic' | 'github';
  isEmailVerified?: boolean;
  alertSettings?: PriceAlertSettings;
  // Profile modification limits (1 free per month or 0.50€ via PayPal)
  nameChangesThisMonth?: number;
  avatarChangesThisMonth?: number;
  lastProfileChangeMonth?: string;
  paidProfileCredits?: number;
  // Amazon-style Wallet & Payment methods
  savedPaymentMethods?: SavedPaymentMethod[];
  // AI Weekly quota (5 messages per calendar week)
  weeklyAiChatCount?: number;
  weeklyAiChatWeek?: string;
}

export interface PriceAlertSettings {
  enabled: boolean;
  scope: 'all' | 'custom';
  customGameIds: string[];
  maxPrice: number;
  notifyInApp: boolean;
  notifyEmail: boolean;
}

export interface PriceAlertNotification {
  id: string;
  userId: string;
  gameId: string;
  gameTitle: string;
  gameCover: string;
  maxPriceTarget: number;
  currentPrice: number;
  regularPrice?: number;
  currency: string;
  storeName: string;
  buyUrl: string;
  dealCut?: number;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ReportItem {
  id: string;
  postId: string;
  postTitle: string;
  authorName: string;
  reportedBy: string;
  reason: string;
  date: string;
  status: 'pending' | 'resolved_removed' | 'resolved_dismissed';
}

export type ViewTab = 'ofertas' | 'juegos' | 'comunidades' | 'avisos' | 'noticias' | 'admin';

export interface CookieConsent {
  id: string;
  userId?: string;
  cookieId: string;
  essential: boolean;
  analytics: boolean;
  marketingAds: boolean;
  thirdPartyProfiling: boolean;
  timestamp: string;
  userAgent?: string;
}

export interface GenrePreference {
  genre: string;
  weight: number;
  count: number;
}

export interface AudienceAdProfile {
  id: string;
  cookieId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  consentGiven: boolean;
  preferredGenres: GenrePreference[];
  topGenre: string;
  iabCategories: string[];
  commercialSegment: string;
  monetizationScore: number;
  estimatedCpmEur: number;
  wishlistCount: number;
  viewedGamesCount: number;
  priceSensitivity: 'presupuesto_bajo' | 'precio_medio' | 'comprador_premium';
  targetAudienceForAds: string[];
  lastActive: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  relatedGameIds?: string[];
}


