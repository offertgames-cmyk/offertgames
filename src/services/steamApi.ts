import { Game, GameVideo } from '../types/game';
import { safeFetchWithTimeout, apiCircuitBreaker, sanitizeText, sanitizeUrl } from './securityService';

export interface SteamFeaturedItem {
  id: number;
  type: number;
  name: string;
  discounted: boolean;
  discount_percent: number;
  original_price: number;
  final_price: number;
  currency: string;
  large_capsule_image: string;
  small_capsule_image: string;
  header_image: string;
  windows_available: boolean;
  mac_available: boolean;
  linux_available: boolean;
}

export interface SteamCategoriesResponse {
  specials?: {
    id: string;
    name: string;
    items: SteamFeaturedItem[];
  };
  top_sellers?: {
    id: string;
    name: string;
    items: SteamFeaturedItem[];
  };
  new_releases?: {
    id: string;
    name: string;
    items: SteamFeaturedItem[];
  };
}

export interface SteamMediaDetails {
  screenshots: string[];
  videos: GameVideo[];
  description?: string;
  headerImage?: string;
}

// Memory cache to avoid spamming the Steam API
const steamMediaCache = new Map<number, SteamMediaDetails>();

/**
 * Fetches featured categories and live real-time discounts from Steam API
 */
export async function fetchSteamFeaturedCategories(): Promise<SteamFeaturedItem[]> {
  const result = await apiCircuitBreaker.execute('steam_featuredcategories', async () => {
    const res = await safeFetchWithTimeout('https://store.steampowered.com/api/featuredcategories/?cc=es', 7000);
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) return [];
    const data: SteamCategoriesResponse = JSON.parse(text);
    
    const items: SteamFeaturedItem[] = [];
    if (data.specials?.items) items.push(...data.specials.items);
    if (data.top_sellers?.items) items.push(...data.top_sellers.items.filter(i => i.discounted));
    
    return items.map(item => ({
      ...item,
      name: sanitizeText(item.name),
      large_capsule_image: sanitizeUrl(item.large_capsule_image),
      small_capsule_image: sanitizeUrl(item.small_capsule_image),
      header_image: sanitizeUrl(item.header_image)
    }));
  }, []);

  return result.data;
}

/**
 * Automatically fetches real-time screenshots, trailers and videos for any Steam App ID
 */
export async function fetchGameMediaFromSteam(appId: number): Promise<SteamMediaDetails | null> {
  if (!appId) return null;
  
  // Check in-memory cache first
  if (steamMediaCache.has(appId)) {
    return steamMediaCache.get(appId)!;
  }

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(`steam_media_${appId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      steamMediaCache.set(appId, parsed);
      return parsed;
    }
  } catch {}

  try {
    const res = await safeFetchWithTimeout(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=es`, 7000);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) return null;
    const json = JSON.parse(text);
    
    // Steam returns an object with dynamic keys
    const appData = Object.values(json)[0] as any;
    if (!appData || !appData.success || !appData.data) {
      return null;
    }

    const data = appData.data;

    // Extract all real screenshots (full 1920x1080)
    const screenshots: string[] = (data.screenshots || []).map((s: any) => s.path_full);

    // Extract all official trailers and videos
    const videos: GameVideo[] = (data.movies || []).map((m: any) => {
      // Pick best playable video source: HLS master playlist, or DASH, or MP4
      const videoUrl = m.hls_h264 || m.dash_h264 || m.mp4?.max || m.mp4?.['480'] || m.webm?.max || '';
      return {
        id: `steam-vid-${m.id}`,
        title: m.name || 'Tráiler Oficial',
        videoUrl,
        thumbnail: m.thumbnail || data.header_image,
        type: 'trailer' as const
      };
    });

    const result: SteamMediaDetails = {
      screenshots,
      videos,
      description: data.short_description || data.detailed_description,
      headerImage: data.header_image
    };

    // Cache result
    steamMediaCache.set(appId, result);
    try {
      localStorage.setItem(`steam_media_${appId}`, JSON.stringify(result));
    } catch {}

    return result;
  } catch (err) {
    console.warn(`Failed to fetch Steam media for appId ${appId}:`, err);
    return null;
  }
}

/**
 * Syncs real-time prices from Steam specials into our 300-game dataset
 */
export function syncGamesWithSteamSpecials(currentGames: Game[], steamItems: SteamFeaturedItem[]): Game[] {
  if (!steamItems || steamItems.length === 0) return currentGames;

  const steamMap = new Map<number, SteamFeaturedItem>();
  steamItems.forEach(item => steamMap.set(item.id, item));

  return currentGames.map(game => {
    if (game.steamAppId && steamMap.has(game.steamAppId)) {
      const live = steamMap.get(game.steamAppId)!;
      const liveOrig = live.original_price ? live.original_price / 100 : game.originalPrice;
      let liveCurr = live.final_price ? live.final_price / 100 : game.currentPrice;
      let liveDisc = typeof live.discount_percent === 'number' ? live.discount_percent : 0;

      if (liveDisc === 0 || liveCurr >= liveOrig) {
        liveDisc = 0;
        liveCurr = liveOrig;
      }

      const updatedStores = game.stores.map(store => {
        if (store.storeName === 'Steam') {
          return {
            ...store,
            originalPrice: liveOrig,
            currentPrice: liveCurr,
            discountPercent: liveDisc,
            isBest: liveDisc > 0
          };
        }
        return store;
      });

      return {
        ...game,
        originalPrice: liveOrig,
        currentPrice: liveCurr,
        discountPercent: liveDisc,
        stores: updatedStores
      };
    }
    return game;
  });
}
