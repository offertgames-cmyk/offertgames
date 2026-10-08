import { Game, User } from '../types/game';
import { safeFetchWithTimeout, securityLimiter, RATE_LIMITS } from './securityService';
import { syncUserToFirestore } from './firebaseDbService';

/**
 * ============================================================================
 * SERVICIO OFICIAL DE ASISTENTE IA DE OFFERTGAMES: NVIDIA NIM (LLaMA 3.2 11B)
 * ============================================================================
 * 
 * - Modelo principal: meta/llama-3.2-11b-vision-instruct (NVIDIA NIM Oficial)
 *   Latencia ultrabaja (~200ms), respuestas fluidas, conocimiento gamer real y CERO emojis.
 * - RAG Avanzado: Inyección dinámica multijuego basada en alias, géneros,
 *   plataformas, presupuestos y franquicias.
 * - Enciclopedia integral de OffertGames: Comparador de 8 tiendas, sistema de alertas
 *   por correo, reseñas comunitarias de 1-5 estrellas, soporte oficial y medallas.
 * - Control de cuota y seguridad:
 *   1. Límite diario: 10 consultas al día por usuario.
 *   2. Cooldown anti-flood: Mínimo 8 segundos entre mensajes.
 *   3. Límite de tokens optimizado: 500 tokens (evita cortes a mitad de frase).
 *   4. Caché inteligente en memoria de respuestas.
 *   5. Motor semántico local enriquecido como fallback garantizado.
 */

export const DAILY_MSG_LIMIT = 10;
const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama-3.2-11b-vision-instruct';

// Clave API de NVIDIA NIM (leída de forma segura desde .env)
const NVIDIA_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NVIDIA_API_KEY)
  ? import.meta.env.VITE_NVIDIA_API_KEY
  : '';

// Caché en memoria para evitar llamadas redundantes a la API
const inMemoryResponseCache = new Map<string, { answer: string; timestamp: number }>();

/**
 * Diccionario de alias y términos comunes usados por gamers
 */
const GAME_ALIASES: Record<string, string> = {
  'gta': 'grand theft auto',
  'gta v': 'grand theft auto v',
  'gta 5': 'grand theft auto v',
  'gta iv': 'grand theft auto iv',
  'gta 4': 'grand theft auto iv',
  'gta san andreas': 'grand theft auto san andreas',
  'rdr': 'red dead redemption',
  'rdr2': 'red dead redemption 2',
  'rdr 2': 'red dead redemption 2',
  'red dead': 'red dead redemption',
  'gow': 'god of war',
  'gow ragnarok': 'god of war ragnarok',
  'cp2077': 'cyberpunk 2077',
  'cyberpunk': 'cyberpunk 2077',
  're4': 'resident evil 4',
  're2': 'resident evil 2',
  're7': 'resident evil 7',
  're8': 'resident evil village',
  'resident evil': 'resident evil',
  'the witcher': 'the witcher',
  'witcher': 'the witcher',
  'witcher 3': 'the witcher 3',
  'ac': 'assassin\'s creed',
  'ac odyssey': 'assassin\'s creed: odyssey',
  'ac valhalla': 'assassin\'s creed: valhalla',
  'ac mirage': 'assassin\'s creed mirage',
  'fc24': 'ea sports fc',
  'fc 24': 'ea sports fc',
  'fc25': 'ea sports fc',
  'fifa': 'ea sports fc',
  'elden ring': 'elden ring',
  'dark souls': 'dark souls',
  'zelda': 'legend of zelda',
  'mario': 'super mario',
  'cod': 'call of duty',
  'warzone': 'call of duty: warzone',
  'bg3': 'baldur\'s gate 3',
  'baldurs gate': 'baldur\'s gate',
  'forza': 'forza horizon',
  'cs2': 'counter-strike',
  'csgo': 'counter-strike',
  'tlou': 'the last of us',
  'last of us': 'the last of us',
  'spiderman': 'spider-man',
  'spider-man': 'spider-man'
};

/**
 * Mapeo de términos coloquiales a categorías oficiales
 */
const CATEGORY_KEYWORDS: Record<string, string> = {
  'terror': 'Terror',
  'miedo': 'Terror',
  'horror': 'Terror',
  'coches': 'Conducción',
  'carreras': 'Conducción',
  'conduccion': 'Conducción',
  'rol': 'RPG',
  'rpg': 'RPG',
  'accion': 'Acción',
  'aventura': 'Aventura',
  'disparos': 'Shooter',
  'shooter': 'Shooter',
  'fps': 'Shooter',
  'estrategia': 'Estrategia',
  'supervivencia': 'Supervivencia',
  'survival': 'Supervivencia',
  'indie': 'Indie',
  'indies': 'Indie',
  'mundo abierto': 'Mundo Abierto',
  'open world': 'Mundo Abierto',
  'deportes': 'Deportes',
  'futbol': 'Deportes',
  'coperativo': 'Cooperativo',
  'multijugador': 'Multijugador'
};

/**
 * Elimina cualquier emoji unicode del texto para cumplir con la directiva estricta
 */
export function stripEmojis(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .trim();
}

/**
 * Clave del día actual (formato YYYY-MM-DD)
 */
export function getCurrentDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Obtiene el número de mensajes enviados por el usuario en el día actual
 */
export function getUserDailyChatCount(userOrId: string | User | null): number {
  if (!userOrId) return 0;
  const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;
  if (!userId) return 0;

  try {
    const dateKey = getCurrentDateKey();
    const stored = localStorage.getItem(`offertgames_ai_daily_count_${userId}_${dateKey}`);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

export function getUserWeeklyChatCount(userOrId: string | User | null): number {
  return getUserDailyChatCount(userOrId);
}

export function getDailyRemainingChats(userOrId: string | User | null): number {
  const used = getUserDailyChatCount(userOrId);
  return Math.max(0, DAILY_MSG_LIMIT - used);
}

export function incrementUserDailyChatCount(userOrId: string | User): number {
  if (!userOrId) return 0;
  const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;
  const userObj = typeof userOrId === 'object' ? userOrId : null;
  if (!userId) return 0;

  try {
    const dateKey = getCurrentDateKey();
    const key = `offertgames_ai_daily_count_${userId}_${dateKey}`;
    const current = getUserDailyChatCount(userOrId);
    const updated = current + 1;
    localStorage.setItem(key, String(updated));

    if (userObj) {
      userObj.weeklyAiChatCount = updated;
      userObj.weeklyAiChatWeek = dateKey;
      syncUserToFirestore(userObj).catch(() => {});
    }

    return updated;
  } catch {
    return 1;
  }
}

export const incrementUserWeeklyChatCount = incrementUserDailyChatCount;

/**
 * Comprueba si la consulta está permitida
 */
export function isQueryAllowed(query: string): boolean {
  const q = query.toLowerCase();
  const forbiddenTopics = [
    'receta de cocina', 'hacer tarta', 'elecciones politicas', 'partido politico',
    'ecuacion diferencial', 'examen de matematicas', 'hacer poema de amor', 'quimica organica'
  ];

  if (forbiddenTopics.some(topic => q.includes(topic))) {
    return false;
  }
  return true;
}

/**
 * Normaliza texto eliminando tildes y caracteres especiales
 */
function normalizeString(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,:;()\[\]"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Motor RAG de Búsqueda y Recuperación de juegos relevantes para la consulta
 */
export function searchRelevantGames(query: string, games: Game[], maxResults: number = 6): Game[] {
  if (!query || !games || games.length === 0) return [];

  let cleanQ = normalizeString(query);

  // Aplicar expansión de alias
  for (const [alias, expanded] of Object.entries(GAME_ALIASES)) {
    const aliasRegex = new RegExp(`\\b${alias}\\b`, 'gi');
    if (aliasRegex.test(cleanQ)) {
      cleanQ += ' ' + expanded;
    }
  }

  const queryWords = cleanQ.split(' ').filter(w => w.length > 1);
  const numbersInQuery: string[] = (cleanQ.match(/\b\d+\b/g) as string[] | null) || [];

  // Detectar categoría si el usuario pide un género
  let matchedCategory: string | null = null;
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cleanQ.includes(kw)) {
      matchedCategory = cat;
      break;
    }
  }

  // Detectar plataforma si se menciona
  let platformFilter: string | null = null;
  if (cleanQ.includes('ps5') || cleanQ.includes('playstation') || cleanQ.includes('ps4')) platformFilter = 'PlayStation';
  else if (cleanQ.includes('xbox') || cleanQ.includes('game pass')) platformFilter = 'Xbox';
  else if (cleanQ.includes('switch') || cleanQ.includes('nintendo')) platformFilter = 'Nintendo Switch';
  else if (cleanQ.includes('pc') || cleanQ.includes('steam')) platformFilter = 'PC';

  // Detectar filtro de precio ("menos de X euros", "por menos de X")
  const priceMatch = cleanQ.match(/menos\s+de\s+(\d+(?:[.,]\d+)?)/i) || cleanQ.match(/por\s+(\d+(?:[.,]\d+)?)\s*€?/i);
  const maxPriceTarget = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;

  const scored: Array<{ game: Game; score: number }> = [];

  for (const game of games) {
    const titleNorm = normalizeString(game.title);
    const titleWords = titleNorm.split(' ').filter(w => w.length > 1);
    const numbersInTitle: string[] = (titleNorm.match(/\b\d+\b/g) as string[] | null) || [];

    let score = 0;

    // 1. Coincidencia de título completo o subcadena directa
    if (cleanQ.includes(titleNorm)) {
      score += 40 + titleNorm.length;
    } else if (titleNorm.includes(cleanQ)) {
      score += 30;
    }

    // 2. Coincidencia tokenizada
    for (const qw of queryWords) {
      if (titleWords.includes(qw)) {
        score += 8;
      } else if (titleWords.some(tw => tw.startsWith(qw) || qw.startsWith(tw))) {
        score += 3;
      }
    }

    // 3. Protección de número de secuela (si el usuario busca GTA 5, penalizar si el título no tiene 5)
    if (numbersInQuery.length > 0) {
      const hasNumberMatch = numbersInQuery.some(num => numbersInTitle.includes(num));
      if (hasNumberMatch) {
        score += 20;
      } else if (numbersInTitle.length > 0 && !hasNumberMatch) {
        score -= 15;
      }
    }

    // 4. Bonificación por categoría solicitada
    if (matchedCategory && game.categories?.some(c => normalizeString(c).includes(normalizeString(matchedCategory!)))) {
      score += 15;
    }

    // 5. Filtro de plataforma
    if (platformFilter && game.platforms?.includes(platformFilter as any)) {
      score += 5;
    }

    // 6. Filtro de precio
    if (maxPriceTarget !== null) {
      if (game.currentPrice <= maxPriceTarget) {
        score += 12;
      } else {
        score -= 20;
      }
    }

    // Si el usuario busca "mejores", "recomendados" o "baratos"
    if (cleanQ.includes('mejor') || cleanQ.includes('top') || cleanQ.includes('recomiend')) {
      score += (game.rating || 0) * 2;
    }
    if (cleanQ.includes('barato') || cleanQ.includes('oferta') || cleanQ.includes('descuento') || cleanQ.includes('rebaja')) {
      score += (game.discountPercent || 0) * 0.15;
    }

    if (score > 4) {
      scored.push({ game, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map(s => s.game);
}

/**
 * Busca un único juego de máxima coincidencia (compatible con helpers existentes)
 */
export function findBestMatchingGame(query: string, games: Game[]): Game | null {
  const list = searchRelevantGames(query, games, 1);
  return list.length > 0 ? list[0] : null;
}

/**
 * Formatea la información detallada de precios multitienda para un juego coincidente
 */
export function formatGamePriceResponse(game: Game): string {
  const storeLines: string[] = [];

  if (game.stores && game.stores.length > 0) {
    game.stores.forEach(s => {
      const bestTag = s.isBest ? ' (Mejor precio)' : '';
      const discTag = s.discountPercent > 0 ? ` (-${s.discountPercent}%)` : '';
      const origTag = s.originalPrice > s.currentPrice ? ` [Antes ${s.originalPrice.toFixed(2)}€]` : '';
      storeLines.push(`- ${s.storeName}: ${s.currentPrice.toFixed(2)}€${discTag}${origTag}${bestTag}`);
    });
  } else {
    storeLines.push(`- Steam: ${game.currentPrice.toFixed(2)}€ (-${game.discountPercent}%) [Antes ${game.originalPrice.toFixed(2)}€] (Mejor precio)`);
  }

  const bestStore = game.stores?.find(s => s.isBest) || game.stores?.[0];
  const bestText = bestStore
    ? `Mejor oferta actual en: ${bestStore.storeName} por ${bestStore.currentPrice.toFixed(2)}€.`
    : `Precio más bajo registrado: ${game.currentPrice.toFixed(2)}€.`;

  return `Precios y disponibilidad actual de ${game.title} en OffertGames:\n\n` +
    storeLines.join('\n') + '\n\n' +
    `${bestText}\n` +
    `- Descuento máximo: ${game.discountPercent}%\n` +
    `- Plataformas: ${game.platforms.join(', ')}\n` +
    `- Géneros: ${game.categories.join(', ')}\n` +
    `- Valoración: ${game.rating}/5 estrellas (${(game.ratingCount / 1000).toFixed(1)}k opiniones)\n\n` +
    `Puedes activar avisos de bajada de precio con la campana en su ficha para recibir un correo automático si vuelve a bajar.`;
}

/**
 * Construye el System Prompt completo con inyección de RAG inteligente
 */
function buildOffertGamesSystemPrompt(games: Game[], relevantGames: Game[]): string {
  // Top 8 mayores ofertas globales
  const topDeals = [...games]
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, 8)
    .map(g => `- ${g.title}: ${g.currentPrice.toFixed(2)}€ (-${g.discountPercent}%, antes ${g.originalPrice.toFixed(2)}€) | Plataformas: ${g.platforms.join(', ')}`)
    .join('\n');

  // Top 6 obras maestras mejor valoradas
  const topRated = [...games]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6)
    .map(g => `- ${g.title}: ${g.rating}/5 estrellas | Precio: ${g.currentPrice.toFixed(2)}€ (-${g.discountPercent}%) | Géneros: ${g.categories.join(', ')}`)
    .join('\n');

  // Contexto de juegos relevantes recuperados para la consulta específica
  let retrievedContext = '';
  if (relevantGames.length > 0) {
    const gameBlocks = relevantGames.map(g => {
      const bestStore = g.stores?.find(s => s.isBest) || g.stores?.[0];
      const otherStores = g.stores?.slice(0, 4).map(s => `${s.storeName}: ${s.currentPrice.toFixed(2)}€`).join(', ') || '';
      return `* TITULO: ${g.title}
  - Precio actual en OffertGames: ${g.currentPrice.toFixed(2)}€ (Original: ${g.originalPrice.toFixed(2)}€, Descuento: -${g.discountPercent}%)
  - Mejor tienda: ${bestStore ? bestStore.storeName : 'Steam'} (${g.currentPrice.toFixed(2)}€)
  - Otras tiendas comparadas: ${otherStores || 'Steam, Epic Games, GOG'}
  - Plataformas: ${g.platforms.join(', ')}
  - Géneros: ${g.categories.join(', ')}
  - Valoración comunidad: ${g.rating}/5 estrellas (${g.ratingCount} votos)
  - Sinopsis / Gameplay: ${g.description || 'Juego destacado del catálogo de OffertGames.'}`;
    }).join('\n\n');

    retrievedContext = `\n======================================================
JUEGOS DEL CATÁLOGO DE OFFERTGAMES VINCULADOS A ESTA CONSULTA:
======================================================
${gameBlocks}\n`;
  }

  return `Eres el Asistente Inteligente oficial de OffertGames (offertgames.web.app), la mayor plataforma de comparación de precios de videojuegos de habla hispana. Eres un gamer apasionado, experto, divertido, cercano y conocedor absoluto tanto del mundo de los videojuegos como de cada funcionalidad de la web.

CONOCIMIENTO INTEGRAL DE LA WEB OFFERTGAMES:
1. Misión: Comparar en tiempo real los precios de más de 3.000 videojuegos entre 8 tiendas oficiales: Steam, Epic Games Store, GOG, PlayStation Store (PS4/PS5), Xbox Store / Game Pass, Nintendo Switch, Amazon y GAME España.
2. Alertas de Bajada de Precio: Cualquier usuario registrado puede pulsar el icono de la campana en la ficha de un juego (o entrar a la sección "Avisos"), definir su precio deseado, y nuestro servidor le enviará un correo automático gratuito en cuanto el juego alcance o baje de ese precio.
3. Comunidad y Reseñas: En la pestaña "Comunidad", los usuarios publican opiniones con puntuación de 1 a 5 estrellas al estilo Google Maps, suben fotos y reciben votos. Todo se sincroniza en vivo en Firebase Firestore.
4. Atención al Cliente y Soporte: Disponemos de un formulario en el menú lateral izquierdo ("Servicio al Cliente") donde cualquier usuario registrado con Google puede enviar tickets o dudas técnicas directamente a nuestro equipo en offertgames@gmail.com.
5. Sistema de Donaciones y Medallas: Para apoyar el mantenimiento de los servidores de la web, los usuarios pueden donar y desbloquear una medalla permanente que luce junto a su nombre en la comunidad: Bronce (2€), Plata (5€), Oro (10€), Diamante (20€).
6. Mi Perfil y Métodos de Pago: Los usuarios pueden personalizar su avatar y nombre. Los métodos de pago guardados son 100% seguros, confidenciales y cifrados.
7. Filtros del Catálogo: Filtros avanzados por precio máximo, tienda, género, plataforma, porcentaje de descuento y ofertas flash.

TOP CHOLLOS VIGENTES HOY EN LA WEB:
${topDeals}

TOP OBRAS MAESTRAS MEJOR VALORADAS:
${topRated}
${retrievedContext}
DIRECTIVAS DE RESPUESTA:
- Responde SIEMPRE en español de forma natural, cercana, experta y conversacional.
- Si el usuario te pregunta por un juego, descríbelo con entusiasmo: explica de qué va, su ambientación, jugabilidad, por qué engancha o merece la pena jugarlo, e integra con total naturalidad su precio actual, descuento y tiendas disponibles en OffertGames.
- Si te preguntan por recomendaciones (de un género, por presupuesto, para una consola concreta, etc.), sugiere con criterio los títulos disponibles en el catálogo de OffertGames proporcionados arriba.
- Si te preguntan por funciones de la web (avisos, correos, reseñas, soporte, donaciones), explica los pasos exactos y claros de cómo usarlas.
- JAMÁS uses emojis en ninguna parte del texto. CERO EMOJIS (directiva estricta).
- Ofrece respuestas completas, bien estructuradas en 1 o 2 párrafos fluidos, y NUNCA dejes frases a medias.`;
}

/**
 * Motor semántico local conversacional de alta calidad (Fallback garantizado)
 */
function generateLocalSemanticResponse(question: string, games: Game[], _currentUser: User | null): string {
  const q = normalizeString(question);

  // Donaciones y medallas
  if (q.includes('donar') || q.includes('donacion') || q.includes('medalla') || q.includes('apoyar')) {
    return 'En OffertGames puedes apoyar el proyecto mediante una donacion de pago unico y recibir una medalla permanente que aparecera junto a tu nombre de usuario en la comunidad:\n\n- Medalla Bronce: 2€\n- Medalla Plata: 5€\n- Medalla Oro: 10€\n- Medalla Diamante: 20€\n\nPuedes donar comodamente con PayPal o tarjeta desde el menu lateral desplegable.';
  }

  // Avisos de precio
  if (q.includes('aviso') || q.includes('alerta') || q.includes('bajada') || q.includes('notificacion') || q.includes('campana')) {
    return 'Para recibir avisos cuando un juego baje de precio, haz clic en el icono de la campana en la ficha de cualquier juego o entra en la seccion "Avisos". Podras indicar tu precio deseado y nuestro sistema te enviara un correo electronico automatico y gratuito cuando el juego alcance esa cifra en cualquiera de las tiendas monitorizadas.';
  }

  // Soporte y atención al cliente
  if (q.includes('soporte') || q.includes('correo') || q.includes('atencion') || q.includes('queja') || q.includes('contactar') || q.includes('ticket')) {
    return 'Para contactar con el equipo de soporte de OffertGames, abre el menu lateral izquierdo y pulsa en "Servicio al Cliente". Podras redactar tu consulta o queja y se enviara de forma directa y oficial a nuestro correo offertgames@gmail.com con verificacion segura de Google.';
  }

  // Comunidad y reseñas
  if (q.includes('comunidad') || q.includes('resena') || q.includes('opinion') || q.includes('estrella') || q.includes('valorar')) {
    return 'En la pestana "Comunidad" puedes leer y publicar resenas con valoracion de 1 a 5 estrellas al estilo Google Maps. Todos los comentarios, fotos y votos se guardan en tiempo real en nuestra base de datos en la nube para que toda la comunidad pueda orientarse antes de comprar.';
  }

  // Perfil y métodos de pago
  if (q.includes('perfil') || q.includes('nombre') || q.includes('avatar') || q.includes('tarjeta') || q.includes('metodo de pago') || q.includes('foto')) {
    return 'Puedes personalizar tu perfil desde el menu lateral en "Mi Perfil". Tu nombre y avatar se guardan en el servidor para que permanezcan cada vez que entres. Ademas, tus metodos de pago son 100% privados y confidenciales.';
  }

  // Búsqueda RAG de juegos relevantes
  const relevant = searchRelevantGames(question, games, 3);
  if (relevant.length > 0) {
    const primary = relevant[0];
    const bestStore = primary.stores?.find(s => s.isBest) || primary.stores?.[0];
    const storeName = bestStore ? bestStore.storeName : 'Steam';

    const isPriceOnlyQuestion = /cuanto (cuesta|vale|esta)|precio|rebaja|descuento/i.test(q);

    if (isPriceOnlyQuestion) {
      let extra = '';
      if (relevant.length > 1) {
        extra = ` Tambien tenemos en oferta ${relevant[1].title} por solo ${relevant[1].currentPrice.toFixed(2)}€ (-${relevant[1].discountPercent}%).`;
      }
      return `Actualmente en OffertGames puedes conseguir ${primary.title} por ${primary.currentPrice.toFixed(2)}€ en ${storeName}, lo que supone un descuento del ${primary.discountPercent}% sobre su precio habitual de ${primary.originalPrice.toFixed(2)}€. Esta disponible para ${primary.platforms.join(', ')} con una valoracion de ${primary.rating}/5 estrellas.${extra}`;
    }

    return `${primary.title} es uno de los grandes titulos del catalogo de OffertGames. Es un juego de ${primary.categories.join(' y ')} disponible para ${primary.platforms.join(', ')}, valorado con ${primary.rating}/5 estrellas por la comunidad. ${primary.description ? primary.description.slice(0, 180) + '...' : ''} Ahora mismo lo tienes con un descuento del ${primary.discountPercent}% por solo ${primary.currentPrice.toFixed(2)}€ en ${storeName}. Si te interesa, puedes activar una alerta con la campana para seguir su precio.`;
  }

  // Mayores ofertas del catálogo
  if (q.includes('mejor') || q.includes('mas barato') || q.includes('descuento') || q.includes('rebaja') || q.includes('top') || q.includes('ofertas')) {
    const sorted = [...games].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 5);
    const list = sorted.map(g => `- ${g.title}: ${g.currentPrice.toFixed(2)}€ (-${g.discountPercent}%) [${g.platforms.join(', ')}]`).join('\n');
    return `Las mayores ofertas actuales en OffertGames son:\n\n${list}\n\nPuedes consultar cualquiera de ellos directamente en el buscador o la pagina principal.`;
  }

  return 'Hola. Soy el Asistente Inteligente de OffertGames conectado a NVIDIA AI. Puedo ayudarte con analisis de juegos, recomendaciones personalizadas, comparar precios en tiempo real entre Steam, Epic, GOG, PlayStation y Xbox, o resolver dudas sobre alertas, soporte y la comunidad.\n\n¿Que juego o duda sobre la web te gustaria consultar?';
}

/**
 * Función principal para formular preguntas al Asistente IA de OffertGames
 */
export async function askOffertGamesAi(params: {
  question: string;
  games: Game[];
  currentUser: User | null;
}): Promise<{ 
  answer: string; 
  isBlocked: boolean; 
  remainingChats?: number;
  reason?: 'not_logged_in' | 'quota_exceeded' | 'flood_cooldown' | 'forbidden_topic' 
}> {
  const { question, games, currentUser } = params;
  const cleanQ = question.trim();

  // 1. Control de acceso: Requiere cuenta iniciada con Google
  if (!currentUser) {
    return {
      answer: 'Debes iniciar sesion con tu cuenta de Google en OffertGames para consultar al Asistente de IA. Esto garantiza un servicio seguro y gratuito para toda la comunidad.',
      isBlocked: true,
      reason: 'not_logged_in'
    };
  }

  // 2. Control de límite diario
  const currentDailyCount = getUserDailyChatCount(currentUser.id);
  if (currentDailyCount >= DAILY_MSG_LIMIT) {
    return {
      answer: `Has alcanzado el limite diario de ${DAILY_MSG_LIMIT} consultas gratuitas al Asistente de IA. Para garantizar que todos los usuarios puedan usar el servicio simultaneamente sin agotar la infraestructura, tu cuota se reiniciara manana a las 00:00.`,
      isBlocked: true,
      remainingChats: 0,
      reason: 'quota_exceeded'
    };
  }

  // 3. Cooldown anti-flood (8 segundos entre mensajes)
  const floodCheck = securityLimiter.checkLimit(`ai_flood_${currentUser.id}`, 1, 8);
  if (!floodCheck.allowed) {
    return {
      answer: 'Por favor, espera unos segundos antes de enviar otra consulta al asistente.',
      isBlocked: true,
      remainingChats: Math.max(0, DAILY_MSG_LIMIT - currentDailyCount),
      reason: 'flood_cooldown'
    };
  }

  // 4. Filtro temático
  if (!isQueryAllowed(cleanQ)) {
    return {
      answer: 'Solo puedo responder consultas sobre videojuegos, precios, ofertas y funciones de OffertGames.',
      isBlocked: false,
      remainingChats: Math.max(0, DAILY_MSG_LIMIT - currentDailyCount),
      reason: 'forbidden_topic'
    };
  }

  // 5. Comprobación de Caché Inteligente (ahorra llamadas a la API)
  const normalizedKey = cleanQ.toLowerCase().replace(/[¿?¡!.,:;]/g, '').trim();
  const cached = inMemoryResponseCache.get(normalizedKey);
  const now = Date.now();
  if (cached && (now - cached.timestamp < 1000 * 60 * 60 * 12)) {
    incrementUserDailyChatCount(currentUser);
    return {
      answer: cached.answer,
      isBlocked: false,
      remainingChats: Math.max(0, DAILY_MSG_LIMIT - (currentDailyCount + 1))
    };
  }

  let generatedText = '';
  const relevantGames = searchRelevantGames(cleanQ, games, 5);

  // 6. Llamada real a NVIDIA NIM API con LLaMA 3.2 11B
  try {
    const systemPrompt = buildOffertGamesSystemPrompt(games, relevantGames);

    const payload = {
      model: NVIDIA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: cleanQ }
      ],
      temperature: 0.5,
      max_tokens: 500
    };

    let response: Response | null = null;

    // Intento 1: Proxy local / backend
    try {
      response = await safeFetchWithTimeout('/api/nvidia/chat', 15000, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      // Intento 2: Llamada directa a NVIDIA NIM
      response = await safeFetchWithTimeout(NVIDIA_ENDPOINT, 15000, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify(payload)
      });
    }

    if (response && response.ok) {
      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (content && typeof content === 'string' && content.trim().length > 0) {
        generatedText = stripEmojis(content);
        inMemoryResponseCache.set(normalizedKey, { answer: generatedText, timestamp: now });
      }
    }
  } catch (err) {
    console.warn('[OffertGames AI] NVIDIA NIM API llamada no completada, activando motor semántico:', err);
  }

  // 7. Respaldo semántico local garantizado
  if (!generatedText) {
    generatedText = stripEmojis(generateLocalSemanticResponse(cleanQ, games, currentUser));
  }

  // 8. Contabilizar consulta hacia el límite diario del usuario
  const newCount = incrementUserDailyChatCount(currentUser);
  const remaining = Math.max(0, DAILY_MSG_LIMIT - newCount);

  return {
    answer: generatedText,
    isBlocked: false,
    remainingChats: remaining
  };
}
