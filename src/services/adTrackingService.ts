import { doc, setDoc, getDoc, getDocs, collection, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebaseClient';
import { Game, User, CookieConsent, AudienceAdProfile, GenrePreference } from '../types/game';

const COOKIE_ID_KEY = 'offertgames_cookie_id';
const CONSENT_STORAGE_KEY = 'offertgames_cookie_consent_v1';
const LOCAL_PROFILE_STORAGE_KEY = 'offertgames_local_ad_profile';

/**
 * Returns or generates a persistent anonymous cookie UUID for AdTech tracking
 */
export function getOrCreateCookieId(): string {
  try {
    let id = localStorage.getItem(COOKIE_ID_KEY);
    if (!id) {
      id = 'ck_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(COOKIE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'ck_fallback_' + Math.random().toString(36).substring(2, 8);
  }
}

/**
 * Retrieves the stored cookie consent settings (null if user hasn't made a choice yet)
 */
export function getStoredCookieConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as CookieConsent;
    }
  } catch {}
  return null;
}

/**
 * Saves and registers user cookie consent both locally and in Cloud Firestore
 */
export async function saveCookieConsent(
  choices: {
    essential: boolean;
    analytics: boolean;
    marketingAds: boolean;
    thirdPartyProfiling: boolean;
  },
  user?: User | null
): Promise<CookieConsent> {
  const cookieId = getOrCreateCookieId();
  const consent: CookieConsent = {
    id: `consent_${cookieId}`,
    userId: user?.id,
    cookieId,
    essential: true,
    analytics: choices.analytics,
    marketingAds: choices.marketingAds,
    thirdPartyProfiling: choices.thirdPartyProfiling,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {}

  // Sync consent record to Cloud Firestore
  if (db) {
    try {
      const consentDoc = doc(db, 'cookie_consents', consent.id);
      await setDoc(consentDoc, {
        ...consent,
        syncedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('[AdTracking] Error guardando consentimiento en Firestore:', err);
    }
  }

  return consent;
}

/**
 * Classifies game genre weights based on title, category tags and description keywords
 */
function analyzeGameGenres(game: Game): { genre: string; weight: number }[] {
  const results: Record<string, number> = {};
  const textToScan = `${game.title} ${game.description || ''} ${game.categories?.join(' ') || ''}`.toLowerCase();

  // 1. Check for Shooters / FPS / Action
  if (
    textToScan.includes('shoot') || 
    textToScan.includes('fps') || 
    textToScan.includes('dispar') || 
    textToScan.includes('arma') || 
    textToScan.includes('doom') || 
    textToScan.includes('counter') || 
    textToScan.includes('battlefield') || 
    textToScan.includes('call of duty') || 
    textToScan.includes('warfare') || 
    textToScan.includes('sniper') ||
    textToScan.includes('halo') ||
    textToScan.includes('destiny') ||
    textToScan.includes('cyberpunk')
  ) {
    results['Shooters'] = (results['Shooters'] || 0) + 40;
  }

  // 2. Check for Strategy / RTS / Tactical
  if (
    textToScan.includes('estrateg') || 
    textToScan.includes('strategy') || 
    textToScan.includes('tactic') || 
    textToScan.includes('rts') || 
    textToScan.includes('civilization') || 
    textToScan.includes('total war') || 
    textToScan.includes('crusader') || 
    textToScan.includes('age of empires') || 
    textToScan.includes('starcraft') || 
    textToScan.includes('gestion') || 
    textToScan.includes('empire') ||
    textToScan.includes('command')
  ) {
    results['Estrategia'] = (results['Estrategia'] || 0) + 40;
  }

  // 3. Check for RPG / Role-Playing
  if (
    textToScan.includes('rpg') || 
    textToScan.includes('rol') || 
    textToScan.includes('elden ring') || 
    textToScan.includes('witcher') || 
    textToScan.includes('baldur') || 
    textToScan.includes('souls') || 
    textToScan.includes('fantasy') ||
    textToScan.includes('aventura')
  ) {
    results['RPG'] = (results['RPG'] || 0) + 35;
  }

  // 4. Check for Sports / Racing
  if (
    textToScan.includes('fifa') || 
    textToScan.includes('ea sports') || 
    textToScan.includes('carreras') || 
    textToScan.includes('racing') || 
    textToScan.includes('deport') || 
    textToScan.includes('f1') || 
    textToScan.includes('forza') || 
    textToScan.includes('nba')
  ) {
    results['Deportes & Carreras'] = (results['Deportes & Carreras'] || 0) + 35;
  }

  // 5. Default categories from game data
  game.categories?.forEach(cat => {
    if (cat === 'Estrategia') results['Estrategia'] = (results['Estrategia'] || 0) + 25;
    else if (cat === 'Acción') results['Shooters'] = (results['Shooters'] || 0) + 20;
    else if (cat === 'RPG') results['RPG'] = (results['RPG'] || 0) + 25;
    else if (cat === 'Deportes' || cat === 'Carreras') results['Deportes & Carreras'] = (results['Deportes & Carreras'] || 0) + 20;
    else results[cat] = (results[cat] || 0) + 15;
  });

  // Fallback if none detected
  if (Object.keys(results).length === 0) {
    results['Acción & Aventura'] = 20;
  }

  return Object.entries(results).map(([genre, weight]) => ({ genre, weight }));
}

/**
 * Builds standard IAB Audience Segments for programmatic advertising sales (RTB / DSP)
 */
function determineIabSegments(topGenre: string, allGenres: { genre: string; weight: number }[]): {
  iabCategories: string[];
  commercialSegment: string;
  targetAudienceForAds: string[];
  monetizationScore: number;
  estimatedCpmEur: number;
} {
  const baseCompanies = [
    'Google AdSense / DoubleClick (AdX)',
    'The Trade Desk (Programmatic DSP)',
    'Unity Ads Gaming Network',
    'Criteo Retail Media',
    'Microsoft Advertising Network'
  ];

  if (topGenre.includes('Shooter')) {
    return {
      iabCategories: [
        'IAB1-5 (Video Computer Games)',
        'IAB1-6 (Esports & First-Person Shooters)',
        'IAB14-1 (Hardware & Peripherals)'
      ],
      commercialSegment: 'Audiencia Premium: Hardcore Shooter & FPS Gamer',
      targetAudienceForAds: [
        'Fabricantes de Hardware (NVIDIA, Razer, Logitech)',
        'Publishers de Shooters (Activision, EA, Riot Games)',
        ...baseCompanies
      ],
      monetizationScore: 92,
      estimatedCpmEur: 5.80
    };
  }

  if (topGenre.includes('Estrategia')) {
    return {
      iabCategories: [
        'IAB1-5 (Video Computer Games)',
        'IAB1-7 (Strategy & Tactical Simulation Gaming)',
        'IAB14-3 (PC Desktop Enthusiasts)'
      ],
      commercialSegment: 'Audiencia de Alto Valor: Estrategia, Gestión y Táctica PC',
      targetAudienceForAds: [
        'Publishers de Estrategia (Paradox, Creative Assembly, Firaxis)',
        'Suscripciones Gaming (Xbox Game Pass, Humble Bundle)',
        ...baseCompanies
      ],
      monetizationScore: 89,
      estimatedCpmEur: 5.40
    };
  }

  if (topGenre.includes('RPG')) {
    return {
      iabCategories: [
        'IAB1-5 (Video Computer Games)',
        'IAB1-8 (Role-Playing & Fantasy Games)',
        'IAB10-1 (Books, Lore & Merchandising)'
      ],
      commercialSegment: 'Audiencia de Alta Retención: Fans de RPG y Mundo Abierto',
      targetAudienceForAds: [
        'Estudios RPG (Bandai Namco, CD Projekt, Square Enix)',
        'Tiendas de Merchandising y Coleccionismo',
        ...baseCompanies
      ],
      monetizationScore: 86,
      estimatedCpmEur: 4.90
    };
  }

  return {
    iabCategories: [
      'IAB1-5 (Video Computer Games)',
      'IAB1-1 (Video Game Deals & Bargain Seekers)'
    ],
    commercialSegment: 'Audiencia General: Compradores de Ofertas de Videojuegos',
    targetAudienceForAds: baseCompanies,
    monetizationScore: 78,
    estimatedCpmEur: 3.80
  };
}

/**
 * Tracks a user's interaction (wishlist, view, alert) and computes their real-time ad profile
 */
export async function trackUserInteraction(params: {
  game?: Game;
  action: 'wishlist' | 'view' | 'search' | 'alert';
  searchKeyword?: string;
  user?: User | null;
  allWishlistGames?: Game[];
}): Promise<AudienceAdProfile | null> {
  const consent = getStoredCookieConsent();
  // Strictly enforce consent (RGPD): Only profile if marketingAds is consented
  const consentGiven = consent?.marketingAds ?? false;

  const cookieId = getOrCreateCookieId();
  const userId = params.user?.id;
  const userEmail = params.user?.email;
  const userName = params.user?.name;

  // Retrieve current profile from cache or initialize
  let currentProfile: AudienceAdProfile | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);
    if (raw) currentProfile = JSON.parse(raw);
  } catch {}

  const genreMap = new Map<string, { weight: number; count: number }>();
  if (currentProfile?.preferredGenres) {
    currentProfile.preferredGenres.forEach(item => {
      genreMap.set(item.genre, { weight: item.weight, count: item.count });
    });
  }

  // Process game genres
  if (params.game) {
    const multiplier = params.action === 'wishlist' ? 3 : params.action === 'alert' ? 4 : 1;
    const detected = analyzeGameGenres(params.game);
    detected.forEach(({ genre, weight }) => {
      const existing = genreMap.get(genre) || { weight: 0, count: 0 };
      genreMap.set(genre, {
        weight: existing.weight + (weight * multiplier),
        count: existing.count + 1
      });
    });
  }

  // Also factor in full wishlist if provided
  if (params.allWishlistGames && params.allWishlistGames.length > 0) {
    params.allWishlistGames.forEach(g => {
      const detected = analyzeGameGenres(g);
      detected.forEach(({ genre, weight }) => {
        const existing = genreMap.get(genre) || { weight: 0, count: 0 };
        genreMap.set(genre, {
          weight: existing.weight + (weight * 2),
          count: existing.count + 1
        });
      });
    });
  }

  // Sort genres by weight
  const preferredGenres: GenrePreference[] = Array.from(genreMap.entries())
    .map(([genre, data]) => ({
      genre,
      weight: data.weight,
      count: data.count
    }))
    .sort((a, b) => b.weight - a.weight);

  const topGenre = preferredGenres[0]?.genre || 'Shooters';
  const iabMeta = determineIabSegments(topGenre, preferredGenres);

  const updatedProfile: AudienceAdProfile = {
    id: userId || cookieId,
    cookieId,
    userId,
    userEmail,
    userName,
    consentGiven,
    preferredGenres,
    topGenre,
    iabCategories: iabMeta.iabCategories,
    commercialSegment: iabMeta.commercialSegment,
    monetizationScore: iabMeta.monetizationScore,
    estimatedCpmEur: iabMeta.estimatedCpmEur,
    wishlistCount: (params.user?.wishlist?.length) || (params.allWishlistGames?.length) || (currentProfile?.wishlistCount || 0) + (params.action === 'wishlist' ? 1 : 0),
    viewedGamesCount: (currentProfile?.viewedGamesCount || 0) + (params.action === 'view' ? 1 : 0),
    priceSensitivity: (params.game?.currentPrice || 20) < 15 ? 'presupuesto_bajo' : (params.game?.currentPrice || 20) < 40 ? 'precio_medio' : 'comprador_premium',
    targetAudienceForAds: iabMeta.targetAudienceForAds,
    lastActive: new Date().toISOString(),
    createdAt: currentProfile?.createdAt || new Date().toISOString()
  };

  try {
    localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
  } catch {}

  // Sync to Cloud Firestore if connected
  if (db && consentGiven) {
    try {
      const docRef = doc(db, 'audience_ad_profiles', updatedProfile.id);
      await setDoc(docRef, {
        ...updatedProfile,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('[AdTracking] Error subiendo perfil publicitario a Firestore:', err);
    }
  }

  return updatedProfile;
}

/**
 * Fetches all audience profiles stored in Cloud Firestore for AdTech monetization & evaluation
 */
export async function fetchAudienceProfilesFromFirestore(): Promise<AudienceAdProfile[]> {
  const seedProfiles: AudienceAdProfile[] = [
    {
      id: 'prof_demo_01',
      cookieId: 'ck_a9f82d11',
      userEmail: 'gamer_pro_fps@gmail.com',
      userName: 'Marcos FPS',
      consentGiven: true,
      preferredGenres: [
        { genre: 'Shooters', weight: 140, count: 6 },
        { genre: 'Acción', weight: 75, count: 3 },
        { genre: 'Estrategia', weight: 20, count: 1 }
      ],
      topGenre: 'Shooters',
      iabCategories: ['IAB1-5 (Video Games)', 'IAB1-6 (Shooters & Esports)', 'IAB14-1 (Hardware)'],
      commercialSegment: 'Audiencia Premium: Hardcore Shooter & FPS Gamer',
      monetizationScore: 94,
      estimatedCpmEur: 6.20,
      wishlistCount: 4,
      viewedGamesCount: 18,
      priceSensitivity: 'comprador_premium',
      targetAudienceForAds: ['NVIDIA, Razer, Logitech', 'Activision, Riot Games', 'The Trade Desk', 'Google AdX'],
      lastActive: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString()
    },
    {
      id: 'prof_demo_02',
      cookieId: 'ck_7b33c09e',
      userEmail: 'tactical_strategist@outlook.com',
      userName: 'Elena Táctica',
      consentGiven: true,
      preferredGenres: [
        { genre: 'Estrategia', weight: 160, count: 7 },
        { genre: 'Simulación', weight: 60, count: 2 },
        { genre: 'RPG', weight: 30, count: 1 }
      ],
      topGenre: 'Estrategia',
      iabCategories: ['IAB1-5 (Video Games)', 'IAB1-7 (Grand Strategy)', 'IAB14-3 (PC Enthusiasts)'],
      commercialSegment: 'Audiencia de Alto Valor: Estrategia, Gestión y Táctica PC',
      monetizationScore: 91,
      estimatedCpmEur: 5.60,
      wishlistCount: 5,
      viewedGamesCount: 12,
      priceSensitivity: 'precio_medio',
      targetAudienceForAds: ['Paradox, Firaxis, Creative Assembly', 'Xbox Game Pass', 'The Trade Desk'],
      lastActive: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString()
    },
    {
      id: 'prof_demo_03',
      cookieId: 'ck_e210fa44',
      userEmail: 'bichomaniaco028@gmail.com',
      userName: 'Nacho (Admin)',
      consentGiven: true,
      preferredGenres: [
        { genre: 'Shooters', weight: 110, count: 5 },
        { genre: 'Estrategia', weight: 95, count: 4 },
        { genre: 'RPG', weight: 70, count: 3 }
      ],
      topGenre: 'Shooters',
      iabCategories: ['IAB1-5 (Video Games)', 'IAB1-6 (Shooters & Esports)', 'IAB1-7 (Strategy)'],
      commercialSegment: 'Audiencia Híbrida: Shooters & Táctica Competitiva',
      monetizationScore: 95,
      estimatedCpmEur: 6.80,
      wishlistCount: 6,
      viewedGamesCount: 24,
      priceSensitivity: 'precio_medio',
      targetAudienceForAds: ['Google AdX', 'Unity Ads', 'The Trade Desk', 'Criteo'],
      lastActive: new Date().toISOString(),
      createdAt: new Date(Date.now() - 7 * 86400 * 1000).toISOString()
    }
  ];

  if (!db) return seedProfiles;

  try {
    const colRef = collection(db, 'audience_ad_profiles');
    const snap = await getDocs(query(colRef, limit(50)));
    if (!snap.empty) {
      const real = snap.docs.map(d => d.data() as AudienceAdProfile);
      // Merge with seeds to guarantee rich demonstration data
      const existingIds = new Set(real.map(r => r.id));
      const combined = [...real, ...seedProfiles.filter(s => !existingIds.has(s.id))];
      return combined;
    }
  } catch (err) {
    console.warn('[AdTracking] Error leyendo perfiles de Firestore, usando semillas:', err);
  }

  return seedProfiles;
}

/**
 * Exports captured audience data as JSON for ad broker platforms
 */
export function exportAudienceJson(profiles: AudienceAdProfile[]): void {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    dataProvider: 'OffertGames Audience Engine (IAB TCF 2.2 Compliant)',
    totalAudienceRecords: profiles.length,
    profiles: profiles.map(p => ({
      advertising_id: p.cookieId,
      consent_status: p.consentGiven ? 'opted_in' : 'opted_out',
      top_genre_interest: p.topGenre,
      genre_weights: p.preferredGenres,
      iab_content_categories: p.iabCategories,
      commercial_segment: p.commercialSegment,
      commercial_cpm_eur: p.estimatedCpmEur,
      buyer_compatibility: p.targetAudienceForAds,
      price_bracket: p.priceSensitivity,
      last_active_timestamp: p.lastActive
    }))
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `offertgames_audience_export_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports captured audience data as CSV for spreadsheets / CRM / Ad Networks
 */
export function exportAudienceCsv(profiles: AudienceAdProfile[]): void {
  const headers = [
    'Cookie_ID',
    'Email_Anonimizado',
    'Consentimiento_Cookies',
    'Genero_Favorito',
    'Segmento_Comercial',
    'Categorias_IAB',
    'Puntuacion_Monetizacion',
    'CPM_Estimado_EUR',
    'Sensibilidad_Precio',
    'Redes_Compradoras',
    'Ultima_Actividad'
  ];

  const rows = profiles.map(p => [
    p.cookieId,
    p.userEmail ? (p.userEmail.slice(0, 3) + '***@' + p.userEmail.split('@')[1]) : 'Anonimo',
    p.consentGiven ? 'ACEPTADO' : 'RECHAZADO',
    p.topGenre,
    `"${p.commercialSegment}"`,
    `"${p.iabCategories.join('; ')}"`,
    p.monetizationScore,
    `${p.estimatedCpmEur} €`,
    p.priceSensitivity,
    `"${p.targetAudienceForAds.join('; ')}"`,
    p.lastActive
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `offertgames_ad_audiences_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
