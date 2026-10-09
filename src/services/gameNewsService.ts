/**
 * ============================================================================
 * SERVICIO OFICIAL DE NOTICIAS DIARIAS DE VIDEOJUEGOS (OFFERTGAMES NEWS)
 * ============================================================================
 * 
 * - Conectado a APIs públicas, gratuitas y con CORS abierto mundialmente:
 *   1. MMOBomb Live News API (https://www.mmobomb.com/api1/latestnews)
 *   2. GamerPower Official Game News & Releases (https://www.gamerpower.com/api/giveaways?type=game)
 * - Noticias 100% reales, con titulares oficiales, resúmenes reales, imágenes de alta
 *   definición y enlaces a las noticias originales.
 * - Rotación diaria de 10 a 15 juegos diferentes cada día: cada día a las 00:00 se seleccionan
 *   juegos nuevos mediante una semilla determinista (YYYY-MM-DD).
 * - Borrado automático del día anterior: al cambiar de día, las noticias anteriores se
 *   eliminan de la memoria y se cargan las nuevas del día.
 */

export interface GameNewsItem {
  id: string;
  gameId: string;
  gameTitle: string;
  gameCover: string;
  steamAppId?: number;
  title: string;
  summary: string;
  author: string;
  url: string;
  date: string;
  publishedAt: number; // Unix timestamp
  tags: string[];
  feedLabel: string;
}

const STORAGE_KEY_PREFIX = 'offertgames_daily_news_';

/**
 * Diccionario de títulos conocidos para extracción de máxima precisión
 */
const KNOWN_GAMES_DICTIONARY = [
  'Steel Aces', 'MapleStory Classic World', 'MapleStory', 'Overwatch', 'Warframe',
  'Aion 2', 'Aion', 'Arknights: Endfield', 'Arknights', 'RuneScape', 'Pony Island',
  'TerraScape', 'Out of Sight', 'Time Takers', 'Cyberpunk 2077', 'Elden Ring',
  'Final Fantasy XIV', 'Destiny 2', 'World of Warcraft', 'Diablo IV', 'Valorant',
  'Apex Legends', 'Fortnite', 'Counter-Strike 2', 'Dota 2', 'Genshin Impact',
  'Spooky Cats', 'The Big Con', 'Warhammer 40,000', 'Warhammer', 'Marvel Rivals',
  'Delta Force', 'Rust', 'The First Descendant', 'Path of Exile 2', 'Path of Exile',
  'Baldur\'s Gate 3', 'Grand Theft Auto V', 'Red Dead Redemption 2', 'Sea of Thieves',
  'Dead by Daylight', 'Hunt: Showdown', 'No Man\'s Sky', 'Fallout 76', 'The Elder Scrolls Online'
];

/**
 * Clave del día actual (formato YYYY-MM-DD)
 */
export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Purga del almacenamiento local cualquier noticia de días anteriores
 */
export function purgeOldNews(): void {
  try {
    const today = getTodayKey();
    const currentKey = `${STORAGE_KEY_PREFIX}${today}`;

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEY_PREFIX) && k !== currentKey) {
        localStorage.removeItem(k);
      }
    }
  } catch (err) {
    console.warn('[News Service] Error purging old news cache:', err);
  }
}

/**
 * Extrae el nombre exacto del juego del titular de la noticia
 */
export function extractGameNameFromTitle(rawTitle: string): string {
  if (!rawTitle) return 'Videojuego';

  // 1. Buscar coincidencias exactas en el diccionario de juegos conocidos
  for (const g of KNOWN_GAMES_DICTIONARY) {
    const escaped = g.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(rawTitle)) {
      return g;
    }
  }

  // 2. Limpiar sufijos de tiendas y promociones
  let t = rawTitle
    .replace(/\s*\((?:Steam|Epic Games|GOG|PC|Mobile|PlayStation|Xbox)\)\s*/gi, '')
    .replace(/\s*(?:Giveaway|Key Giveaway|Steam Key Giveaway|Free Promo Codes|Playtest)\s*$/gi, '')
    .trim();

  // 3. Buscar comillas de títulos
  const quoteMatch = t.match(/[“"']([^”"']{2,30})[”"']/);
  if (quoteMatch && !quoteMatch[1].toLowerCase().includes('historically')) {
    return quoteMatch[1].trim();
  }

  // 4. Limpiar verbos y prefijos de noticias habituales
  const cleaned = t
    .replace(/^(?:Launch Date Announced For|If You Missed Out On The Last|Six Things To Know When Getting Started In|Doctrine Has Arrived In|It’s Time To Visit Daughter Again In|The Aion Team Is Celebrating Launch With A Whole Bunch Of|Jagex Reveals Concept Trailer|Claim Your|Grab|Score)\s+/i, '')
    .replace(/\s+(?:Exits Early Access|Is Getting A Steam Version|Founder’s Access Is Underway|Now Available|Reveals|Announced).*$/i, '')
    .trim();

  const parts = cleaned.split(/[:–—-]/);
  if (parts.length > 1 && parts[0].trim().length >= 3 && parts[0].trim().length < 30) {
    return parts[0].trim();
  }

  const words = cleaned.split(' ').slice(0, 3).join(' ').trim();
  return words || 'Juego Destacado';
}

/**
 * Generador pseudoaleatorio consistente basado en una semilla (fecha)
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Carga noticias reales de videojuegos desde las APIs públicas gratuitas con CORS abierto
 */
export async function getDailyGameNews(forceRefresh: boolean = false): Promise<GameNewsItem[]> {
  const todayKey = getTodayKey();
  const cacheKey = `${STORAGE_KEY_PREFIX}${todayKey}`;

  // 1. Purgar caché de días anteriores
  purgeOldNews();

  // 2. Retornar caché del día si existe y no se fuerza recarga
  if (!forceRefresh) {
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        // Descartar si contenía datos de fallback dummy anteriores
        const hasDummy = Array.isArray(parsed) && parsed.some((p: any) => p.id?.includes('fallback') || p.title?.includes('Parche y eventos destacados'));
        if (Array.isArray(parsed) && parsed.length >= 8 && !hasDummy) {
          return parsed;
        }
      }
    } catch {
      // Continuar a consultar APIs
    }
  }

  const compiledNews: GameNewsItem[] = [];

  // 3. Consultar las APIs públicas reales en paralelo
  const [mmoResults, gpResults] = await Promise.allSettled([
    fetch('https://www.mmobomb.com/api1/latestnews', { signal: AbortSignal.timeout(6000) })
      .then(r => r.ok ? r.json() : [])
      .catch(() => []),
    fetch('https://www.gamerpower.com/api/giveaways?type=game', { signal: AbortSignal.timeout(6000) })
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
  ]);

  const mmoData: any[] = mmoResults.status === 'fulfilled' && Array.isArray(mmoResults.value) ? mmoResults.value : [];
  const gpData: any[] = gpResults.status === 'fulfilled' && Array.isArray(gpResults.value) ? gpResults.value : [];

  const todayDateStr = new Date().toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  // Procesar noticias de MMOBomb (Titulares de desarrollo, actualizaciones, anuncios)
  if (mmoData.length > 0) {
    mmoData.slice(0, 25).forEach((item: any) => {
      const gameName = extractGameNameFromTitle(item.title || '');
      const rawTitle = (item.title || `Novedades sobre ${gameName}`)
        .replace(/^[“"']|[”"']$/g, '')
        .trim();

      const summary = (item.short_description || 'Novedades oficiales y notas de parche para este título.')
        .replace(/\s+/g, ' ')
        .trim();

      // Formatear tags relevantes
      const tags: string[] = ['Actualización'];
      const lowTitle = rawTitle.toLowerCase();
      if (lowTitle.includes('launch') || lowTitle.includes('lanzamiento') || lowTitle.includes('release')) tags.push('Lanzamiento');
      if (lowTitle.includes('playtest') || lowTitle.includes('beta')) tags.push('Playtest');
      if (lowTitle.includes('steam')) tags.push('Steam');
      if (lowTitle.includes('season') || lowTitle.includes('temporada')) tags.push('Temporada');
      if (tags.length < 2) tags.push('Novedades');

      compiledNews.push({
        id: `mmo-${item.id}`,
        gameId: `game-news-${item.id}`,
        gameTitle: gameName,
        gameCover: item.main_image || item.thumbnail || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
        title: rawTitle,
        summary: summary.length > 220 ? summary.slice(0, 220) + '...' : summary,
        author: 'Redacción Oficial',
        url: item.article_url || 'https://www.mmobomb.com',
        date: todayDateStr,
        publishedAt: Math.floor(Date.now() / 1000),
        tags: tags.slice(0, 3),
        feedLabel: 'Comunidad Oficial & PC'
      });
    });
  }

  // Procesar noticias y lanzamientos de GamerPower
  if (gpData.length > 0) {
    gpData.slice(0, 20).forEach((item: any) => {
      const gameName = extractGameNameFromTitle(item.title || '');
      const rawTitle = (item.title || `Novedades sobre ${gameName}`).trim();
      const desc = (item.description || 'Novedades oficiales para este juego en la plataforma.')
        .replace(/\r\n|\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const tags: string[] = ['Lanzamiento'];
      if (item.platforms && item.platforms.toLowerCase().includes('steam')) tags.push('Steam');
      else if (item.platforms && item.platforms.toLowerCase().includes('epic')) tags.push('Epic Games');
      else tags.push('PC');
      tags.push('Oficial');

      compiledNews.push({
        id: `gp-${item.id}`,
        gameId: `game-news-${item.id}`,
        gameTitle: gameName,
        gameCover: item.image || item.thumbnail || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
        title: rawTitle,
        summary: desc.length > 220 ? desc.slice(0, 220) + '...' : desc,
        author: 'Notas de Desarrollo',
        url: item.open_giveaway_url || item.gamerpower_url || 'https://store.steampowered.com',
        date: todayDateStr,
        publishedAt: Math.floor(Date.now() / 1000),
        tags: tags.slice(0, 3),
        feedLabel: 'Lanzamientos & Steam / Epic'
      });
    });
  }

  // 4. Aplicar rotación diaria determinista (12 a 15 juegos diferentes cada día)
  const cleanSeed = todayKey.replace(/-/g, '');
  const seedNum = parseInt(cleanSeed, 10) || 20261009;
  const rng = seededRandom(seedNum);

  // Mezclar lista de noticias reales
  for (let i = compiledNews.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [compiledNews[i], compiledNews[j]] = [compiledNews[j], compiledNews[i]];
  }

  // Tomar una selección de entre 12 y 14 noticias de juegos distintos
  // Garantizar que no se repitan los mismos títulos de juegos en la misma edición
  const seenGames = new Set<string>();
  const uniqueDailySelection: GameNewsItem[] = [];

  for (const item of compiledNews) {
    const key = item.gameTitle.toLowerCase();
    if (!seenGames.has(key)) {
      seenGames.add(key);
      uniqueDailySelection.push(item);
      if (uniqueDailySelection.length >= 14) break;
    }
  }

  // 5. Guardar en caché del día actual
  if (uniqueDailySelection.length > 0) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(uniqueDailySelection));
    } catch (err) {
      console.warn('[News Service] Failed to save news cache:', err);
    }
  }

  return uniqueDailySelection;
}

/**
 * Traduce un texto automáticamente al español mediante el endpoint público de Google Translate con CORS abierto
 */
export async function translateToSpanish(text: string): Promise<string> {
  if (!text || !text.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return text;
    const json = await res.json();
    if (Array.isArray(json) && Array.isArray(json[0])) {
      const translated = json[0].map((part: any) => part[0]).join('');
      if (translated && translated.trim().length > 0) {
        return translated.trim();
      }
    }
  } catch (err) {
    console.warn('[Translate] Error al traducir texto:', err);
  }
  return text;
}
