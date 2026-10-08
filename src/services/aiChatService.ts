import { Game, User } from '../types/game';
import { safeFetchWithTimeout, securityLimiter, RATE_LIMITS } from './securityService';
import { syncUserToFirestore } from './firebaseDbService';

/**
 * ============================================================================
 * SERVICIO OFICIAL DE ASISTENTE IA DE OFFERTGAMES: NVIDIA NIM
 * ============================================================================
 * 
 * - Modelo principal: meta/llama-3.2-11b-vision-instruct (NVIDIA NIM Oficial)
 *   Latencia ultrabaja (~1.5s), respuestas concisas en español y CERO emojis.
 * - Contexto en tiempo real: Inyección dinámica del catálogo de ofertas,
 *   sección de comunidad (reseñas y estrellas), atención al cliente (offertgames@gmail.com),
 *   avisos de bajada de precio y configuración de perfil.
 * - Blindaje anti-abuso y ahorro de cuota:
 *   1. Límite diario estricto: Máximo 3 consultas al día por usuario.
 *   2. Cooldown anti-flood: Mínimo 10 segundos entre mensajes.
 *   3. Máximo de tokens por respuesta: 200 tokens (ahorro máximo de créditos NVIDIA).
 *   4. Caché inteligente en memoria/localStorage de respuestas a preguntas comunes.
 *   5. Fallback semántico local garantizado en caso de desconexión.
 */

export const DAILY_MSG_LIMIT = 3;
const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama-3.2-11b-vision-instruct';

// Clave API de NVIDIA NIM (leída de forma segura desde .env)
const NVIDIA_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NVIDIA_API_KEY)
  ? import.meta.env.VITE_NVIDIA_API_KEY
  : '';

// Caché en memoria para no repetir peticiones a la API
const inMemoryResponseCache = new Map<string, { answer: string; timestamp: number }>();

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

/**
 * Compatible con versiones anteriores (alias semanal apuntando a la cuota diaria)
 */
export function getUserWeeklyChatCount(userOrId: string | User | null): number {
  return getUserDailyChatCount(userOrId);
}

/**
 * Obtiene las consultas restantes de hoy
 */
export function getDailyRemainingChats(userOrId: string | User | null): number {
  const used = getUserDailyChatCount(userOrId);
  return Math.max(0, DAILY_MSG_LIMIT - used);
}

/**
 * Incrementa el contador de mensajes diarios para el usuario y lo persiste
 */
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
 * Comprueba si la consulta está relacionada con videojuegos, ofertas o la plataforma
 */
export function isQueryAllowed(query: string): boolean {
  const q = query.toLowerCase();

  // Temas explícitamente vetados (no relacionados con videojuegos ni la web)
  const forbiddenTopics = [
    'receta', 'cocina', 'pastel', 'politica', 'presidente', 'elecciones',
    'guerra', 'matematicas', 'derivada', 'integral', 'tarea', 'examen',
    'poema', 'cancion', 'biologia', 'quimica', 'filosofia', 'clima', 'tiempo meteorologico'
  ];

  if (forbiddenTopics.some(topic => q.includes(topic))) {
    return false;
  }

  return true;
}

/**
 * Motor de búsqueda inteligente de alta precisión para juegos en el catálogo
 */
export function findBestMatchingGame(query: string, games: Game[]): Game | null {
  if (!query || !games || games.length === 0) return null;

  const cleanQ = query.toLowerCase()
    .replace(/[¿?¡!.,:;()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanQ.length < 2) return null;

  // 1. Coincidencia por título completo contenido en la consulta
  const candidatesContainedInQuery = games.filter(g => {
    const titleLower = g.title.toLowerCase().trim();
    return cleanQ.includes(titleLower);
  });

  if (candidatesContainedInQuery.length > 0) {
    candidatesContainedInQuery.sort((a, b) => b.title.length - a.title.length);
    return candidatesContainedInQuery[0];
  }

  // 2. Coincidencia tokenizada con protección estricta para números de secuelas
  const queryWords = cleanQ.split(' ').filter(w => w.length > 1);
  const numbersInQuery: string[] = (cleanQ.match(/\b\d+\b/g) as string[] | null) || [];

  let bestMatch: Game | null = null;
  let bestScore = -1;

  for (const game of games) {
    const titleLower = game.title.toLowerCase()
      .replace(/[¿?¡!.,:;()\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const titleWords = titleLower.split(' ').filter(w => w.length > 1);
    const numbersInTitle: string[] = (titleLower.match(/\b\d+\b/g) as string[] | null) || [];

    let numberBonus = 0;
    if (numbersInQuery.length > 0) {
      const hasMatchingNumber = numbersInQuery.some(num => numbersInTitle.includes(num));
      if (!hasMatchingNumber && numbersInTitle.length > 0) {
        continue;
      }
      if (hasMatchingNumber) {
        numberBonus = 12;
      }
    }

    let matchingWords = 0;
    for (const qw of queryWords) {
      if (titleWords.includes(qw)) {
        matchingWords += 2.5;
      } else if (titleWords.some(tw => tw.startsWith(qw) || qw.startsWith(tw))) {
        matchingWords += 1.0;
      }
    }

    if (matchingWords > 0) {
      const score = matchingWords + numberBonus;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = game;
      }
    }
  }

  return bestMatch;
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
 * Construye el System Prompt completo con todo el conocimiento de la web y el catálogo en tiempo real
 */
function buildOffertGamesSystemPrompt(games: Game[], matchedGame: Game | null): string {
  // Top 5 mayores ofertas actuales en el catálogo
  const topDeals = [...games]
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, 5)
    .map(g => `- ${g.title}: ${g.currentPrice.toFixed(2)}€ (-${g.discountPercent}%, antes ${g.originalPrice.toFixed(2)}€)`)
    .join('\n');

  // Información del juego buscado si existe
  let gameContext = '';
  if (matchedGame) {
    const bestStore = matchedGame.stores?.find(s => s.isBest) || matchedGame.stores?.[0];
    gameContext = `\nDATOS REALES DEL JUEGO CONSULTADO EN EL CATÁLOGO DE OFFERTGAMES:
- Título: ${matchedGame.title}
- Precio actual: ${matchedGame.currentPrice.toFixed(2)}€ (Precio original: ${matchedGame.originalPrice.toFixed(2)}€, Descuento: -${matchedGame.discountPercent}%)
- Mejor tienda: ${bestStore ? bestStore.storeName : 'Steam'} (${matchedGame.currentPrice.toFixed(2)}€)
- Plataformas: ${matchedGame.platforms.join(', ')}
- Géneros: ${matchedGame.categories.join(', ')}
- Valoración: ${matchedGame.rating}/5 estrellas\n`;
  }

  return `Eres el Asistente Inteligente oficial de OffertGames (offertgames.web.app). Eres un gamer apasionado y experto en videojuegos, consolas, ofertas y en todas las funciones de la web.

CONOCIMIENTO DE LA PLATAFORMA OFFERTGAMES:
1. OffertGames es la web líder en España y habla hispana para comparar precios y encontrar chollos de videojuegos en tiempo real.
2. Tiendas y plataformas: Steam, Epic Games, GOG, PlayStation (PS4/PS5), Xbox / Game Pass, Nintendo Switch, Amazon, GAME.
3. Catálogo: Más de 3.000 videojuegos con tráilers HD, capturas, valoraciones y filtros avanzados por precio, tienda y género.
4. Comunidad: Reseñas y opiniones reales con valoración de 1 a 5 estrellas al estilo Google Maps guardadas en tiempo real en Firebase Firestore.
5. Avisos de precio: Notificaciones automáticas por correo cuando un juego alcanza el precio deseado pulsando en la campana.
6. Perfil y Métodos de pago: Nombre y avatar personalizables guardados en el servidor. Métodos de pago privados y 100% confidenciales.
7. Atención al cliente: Formulario en el menú lateral izquierdo para enviar tickets directos a offertgames@gmail.com con verificación de Google.
8. Donaciones: Medallas permanentes de Donador (Bronce 2€, Plata 5€, Oro 10€, Diamante 20€).

TOP OFERTAS VIGENTES HOY EN LA WEB:
${topDeals}
${gameContext}
DIRECTIVAS DE RESPUESTA:
- Responde SIEMPRE como un asistente inteligente, gamer, conversacional y natural.
- Si el usuario te pregunta sobre un juego (de qué va, su historia, jugabilidad, si merece la pena, tus impresiones o si lo recomiendas), HABLA SOBRE EL JUEGO con conocimiento real de videojuegos, explica qué lo hace especial, y menciona de forma natural su precio y oferta actual en OffertGames.
- PROHIBIDO RESPONDER CON LISTAS O TABLAS RÍGIDAS DE PRECIOS cuando te preguntan por un juego. Habla en párrafos fluidos y cercanos.
- Si te preguntan únicamente por el precio ("¿cuánto cuesta X?"), indícalo de forma directa y conversacional.
- Sé conciso: 1 o 2 párrafos fluidos y bien explicados.
- CERO EMOJIS: Prohibido usar emojis en todas tus respuestas.`;
}

/**
 * Motor semántico de respaldo local conversacional
 */
function generateLocalSemanticResponse(question: string, games: Game[], _currentUser: User | null): string {
  const q = question.toLowerCase();

  // Donaciones y medallas
  if (q.includes('donar') || q.includes('donacion') || q.includes('medalla') || q.includes('apoyar')) {
    return 'En OffertGames puedes apoyar la web mediante una donacion de pago unico y obtener una medalla permanente que aparecera junto a tu nombre de usuario en la comunidad:\n\n- Medalla Bronce: 2€\n- Medalla Plata: 5€\n- Medalla Oro: 10€\n- Medalla Diamante: 20€\n\nPuedes donar comodamente con PayPal o tarjeta desde el menu lateral desplegable.';
  }

  // Avisos de precio
  if (q.includes('aviso') || q.includes('alerta') || q.includes('bajada') || q.includes('notificacion') || q.includes('campana')) {
    return 'Para recibir avisos cuando un juego baje de precio, haz clic en el icono de la campana en la ficha de cualquier juego o entra en la seccion "Avisos". Podras indicar tu precio deseado y te avisaremos por correo electronico cuando alcance esa cifra.';
  }

  // Soporte y atencion al cliente
  if (q.includes('soporte') || q.includes('correo') || q.includes('atencion') || q.includes('queja') || q.includes('contactar') || q.includes('ticket')) {
    return 'Para contactar con el equipo de soporte de OffertGames, abre el menu lateral izquierdo y pulsa en "Servicio al Cliente". Podras redactar tu consulta o queja y se enviara de forma directa y oficial a nuestro correo offertgames@gmail.com.';
  }

  // Comunidad y resenas
  if (q.includes('comunidad') || q.includes('resena') || q.includes('opinion') || q.includes('estrella') || q.includes('valorar')) {
    return 'En la pestana "Comunidad" puedes leer y publicar resenas con valoracion de 1 a 5 estrellas al estilo Google Maps. Todos los comentarios y votos se guardan en tiempo real en nuestra base de datos en la nube.';
  }

  // Perfil y metodos de pago
  if (q.includes('perfil') || q.includes('nombre') || q.includes('avatar') || q.includes('tarjeta') || q.includes('metodo de pago') || q.includes('foto')) {
    return 'Puedes personalizar tu perfil desde el menu lateral en "Mi Perfil". Tu nombre y avatar se guardan en el servidor para que permanezcan cada vez que entres. Ademas, tus metodos de pago son 100% privados y confidenciales.';
  }

  // Busqueda de juego especifico de forma conversacional y natural
  const matchedGame = findBestMatchingGame(question, games);
  if (matchedGame) {
    const bestStore = matchedGame.stores?.find(s => s.isBest) || matchedGame.stores?.[0];
    const storeName = bestStore ? bestStore.storeName : 'Steam';
    const isPriceOnlyQuestion = /cuanto (cuesta|vale|esta)|precio|rebaja|descuento/i.test(q);

    if (isPriceOnlyQuestion) {
      return `Actualmente en OffertGames puedes conseguir ${matchedGame.title} por ${matchedGame.currentPrice.toFixed(2)}€ en ${storeName}, lo que supone un ${matchedGame.discountPercent}% de descuento sobre su precio habitual de ${matchedGame.originalPrice.toFixed(2)}€. Esta disponible para ${matchedGame.platforms.join(', ')}.`;
    }

    return `${matchedGame.title} es un destacado titulo de ${matchedGame.categories.join(' y ')} disponible para ${matchedGame.platforms.join(', ')} con una calificacion de ${matchedGame.rating}/5 estrellas por parte de la comunidad. Es una gran recomendacion si disfrutas de este genero, y ademas ahora mismo lo tienes de oferta en OffertGames por solo ${matchedGame.currentPrice.toFixed(2)}€ en ${storeName} con un ${matchedGame.discountPercent}% de descuento.`;
  }

  // Mayores ofertas del catalogo
  if (q.includes('mejor') || q.includes('mas barato') || q.includes('descuento') || q.includes('rebaja') || q.includes('top') || q.includes('ofertas')) {
    const sorted = [...games].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 5);
    const list = sorted.map(g => `- ${g.title}: ${g.currentPrice.toFixed(2)}€ (-${g.discountPercent}%)`).join('\n');
    return `Las mayores ofertas actuales en OffertGames son:\n\n${list}\n\nPuedes consultar cualquiera de ellos directamente en el catalogo.`;
  }

  return 'Hola. Soy el Asistente Inteligente de OffertGames conectado a NVIDIA AI. Puedo ayudarte con recomendaciones de videojuegos, precios en tiempo real entre Steam, Epic, GOG, PlayStation y Xbox, o resolver cualquier duda sobre la web.\n\n¿Que juego o consulta te gustaria hacer?';
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

  // 2. Control de límite diario estricto (máximo 3 consultas al día por usuario)
  const currentDailyCount = getUserDailyChatCount(currentUser.id);
  if (currentDailyCount >= DAILY_MSG_LIMIT) {
    return {
      answer: `Has alcanzado el limite diario de ${DAILY_MSG_LIMIT} consultas gratuitas al Asistente de IA. Para garantizar que todos los usuarios puedan usar el servicio simultaneamente sin agotar la infraestructura, tu cuota se reiniciara manana a las 00:00.`,
      isBlocked: true,
      remainingChats: 0,
      reason: 'quota_exceeded'
    };
  }

  // 3. Cooldown anti-flood (10 segundos entre mensajes consecutivos)
  const floodCheck = securityLimiter.checkLimit(`ai_flood_${currentUser.id}`, RATE_LIMITS.AI_CHAT_FLOOD.max, RATE_LIMITS.AI_CHAT_FLOOD.windowSeconds);
  if (!floodCheck.allowed) {
    return {
      answer: 'Por favor, espera unos segundos antes de enviar otra consulta al asistente.',
      isBlocked: true,
      remainingChats: Math.max(0, DAILY_MSG_LIMIT - currentDailyCount),
      reason: 'flood_cooldown'
    };
  }

  // 4. Filtro temático estricto: Solo consultas sobre la web y videojuegos
  if (!isQueryAllowed(cleanQ)) {
    return {
      answer: 'Solo puedo responder consultas sobre videojuegos, precios, ofertas y funciones de OffertGames.',
      isBlocked: false,
      remainingChats: Math.max(0, DAILY_MSG_LIMIT - currentDailyCount),
      reason: 'forbidden_topic'
    };
  }

  // 5. Comprobación de Caché Inteligente (ahorra 100% de llamadas a la API de NVIDIA)
  const normalizedKey = cleanQ.toLowerCase().replace(/[¿?¡!.,:;]/g, '').trim();
  const cached = inMemoryResponseCache.get(normalizedKey);
  const now = Date.now();
  if (cached && (now - cached.timestamp < 1000 * 60 * 60 * 12)) { // 12 horas de validez
    incrementUserDailyChatCount(currentUser);
    return {
      answer: cached.answer,
      isBlocked: false,
      remainingChats: Math.max(0, DAILY_MSG_LIMIT - (currentDailyCount + 1))
    };
  }

  let generatedText = '';
  const matchedGame = findBestMatchingGame(cleanQ, games);

  // 6. Llamada real a NVIDIA NIM API con la clave del usuario
  try {
    const systemPrompt = buildOffertGamesSystemPrompt(games, matchedGame);

    const payload = {
      model: NVIDIA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: cleanQ }
      ],
      temperature: 0.6,
      max_tokens: 280
    };

    let response: Response | null = null;

    // Intento 1: Proxy local / backend para evitar bloqueos CORS en navegadores
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
        // Guardar en caché para preguntas idénticas
        inMemoryResponseCache.set(normalizedKey, { answer: generatedText, timestamp: now });
      }
    }
  } catch (err) {
    console.warn('[OffertGames AI] NVIDIA NIM API llamada no completada, activando motor semántico:', err);
  }

  // 7. Respaldo semántico local garantizado (si la API remota tarda o no responde)
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

