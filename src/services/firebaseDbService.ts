import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebaseClient';
import { User, CommunityPost, ReportItem, PriceAlertSettings, PriceAlertNotification, DonorTier, DonorInfo, SavedPaymentMethod } from '../types/game';

// Check connection status
export async function testFirestoreConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isFirebaseConfigured || !db) {
    return { ok: false, message: 'Firebase no está configurado en las variables de entorno.' };
  }
  try {
    const testRef = collection(db, '_healthcheck');
    await getDocs(query(testRef, limit(1)));
    return { ok: true, message: 'Conectado a Cloud Firestore correctamente en tiempo real.' };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('disabled') || msg.includes('has not been used')) {
      return { 
        ok: false, 
        message: 'La base de datos Cloud Firestore debe ser activada en la consola de Firebase (https://console.firebase.google.com/project/offertgames/firestore).' 
      };
    }
    if (msg.includes('PERMISSION_DENIED') || msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      return {
        ok: true,
        message: 'Base de datos Cloud Firestore conectada y blindada (Acceso privado para usuarios autenticados con Google).'
      };
    }
    return { ok: false, message: `Estado Firestore: ${msg}` };
  }
}

// ==========================================
// 1. USUARIOS (USERS COLLECTION)
// ==========================================

export async function syncUserToFirestore(user: User): Promise<void> {
  if (!db || !user?.id) return;
  try {
    const userDocRef = doc(db, 'users', user.id);
    await setDoc(userDocRef, {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      donorTier: user.donorTier || null,
      donor: user.donor || null,
      nameChangesThisMonth: user.nameChangesThisMonth ?? 0,
      avatarChangesThisMonth: user.avatarChangesThisMonth ?? 0,
      lastProfileChangeMonth: user.lastProfileChangeMonth || null,
      paidProfileCredits: user.paidProfileCredits ?? 0,
      savedPaymentMethods: user.savedPaymentMethods || [],
      weeklyAiChatCount: user.weeklyAiChatCount ?? 0,
      weeklyAiChatWeek: user.weeklyAiChatWeek || null,
      wishlist: user.wishlist || [],
      joinedDate: user.joinedDate || 'Hoy',
      provider: user.provider || 'google',
      isEmailVerified: user.isEmailVerified ?? true,
      isSuspended: user.isSuspended ?? false,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firestore] Usuario sincronizado: ${user.email} (${user.id})`);
  } catch (err: any) {
    console.warn('[Firestore] Error guardando usuario:', err?.message || err);
  }
}

export async function fetchUserFromFirestore(userId: string): Promise<User | null> {
  if (!db || !userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  } catch (err: any) {
    console.warn('[Firestore] Error obteniendo usuario:', err?.message || err);
    return null;
  }
}

export async function fetchAllUsersFromFirestore(): Promise<User[]> {
  if (!db) return [];
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    return snap.docs.map(d => d.data() as User);
  } catch (err: any) {
    console.warn('[Firestore] Error listando usuarios:', err?.message || err);
    return [];
  }
}

export async function updateUserWishlistInFirestore(userId: string, wishlist: string[]): Promise<void> {
  if (!db || !userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      wishlist,
      updatedAt: serverTimestamp()
    });
  } catch (err: any) {
    console.warn('[Firestore] Error actualizando wishlist:', err?.message || err);
  }
}

export async function updateUserSuspensionInFirestore(userId: string, isSuspended: boolean): Promise<void> {
  if (!db || !userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      isSuspended,
      updatedAt: serverTimestamp()
    });
  } catch (err: any) {
    console.warn('[Firestore] Error actualizando suspensión:', err?.message || err);
  }
}

export async function updateUserProfileInFirestore(
  userId: string,
  data: Partial<User>
): Promise<void> {
  if (!db || !userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    const cleanData: any = {};
    Object.keys(data).forEach(k => {
      if ((data as any)[k] !== undefined) cleanData[k] = (data as any)[k];
    });
    await setDoc(userDocRef, {
      id: userId,
      ...cleanData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firestore] Perfil de usuario guardado en el servidor para ${userId}:`, cleanData);
  } catch (err: any) {
    console.warn('[Firestore] Error guardando perfil de usuario en el servidor:', err?.message || err);
  }
}

export async function updateAuthorPostsInFirestore(
  authorIdOrName: string,
  newAuthorName: string,
  newAvatar: string
): Promise<void> {
  const firestore = db;
  if (!firestore || !authorIdOrName) return;
  try {
    const postsCol = collection(firestore, 'posts');
    const snap = await getDocs(postsCol);
    const promises: Promise<void>[] = [];
    snap.docs.forEach(d => {
      const p = d.data() as CommunityPost;
      const isAuthor = p.author === authorIdOrName || (p as any).authorId === authorIdOrName;
      let commentsChanged = false;
      const updatedComments = (p.comments || []).map(c => {
        if (c.author === authorIdOrName || (c as any).authorId === authorIdOrName) {
          commentsChanged = true;
          return { ...c, author: newAuthorName, avatar: newAvatar };
        }
        return c;
      });

      if (isAuthor || commentsChanged) {
        const updatePayload: any = {
          updatedAt: serverTimestamp()
        };
        if (isAuthor) {
          updatePayload.author = newAuthorName;
          updatePayload.avatar = newAvatar;
        }
        if (commentsChanged) {
          updatePayload.comments = updatedComments;
        }
        promises.push(
          setDoc(doc(firestore, 'posts', d.id), updatePayload, { merge: true })
        );
      }
    });
    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`[Firestore] ${promises.length} publicaciones/comentarios actualizados con nuevo autor y foto.`);
    }
  } catch (err: any) {
    console.warn('[Firestore] Error sincronizando posts de autor:', err?.message || err);
  }
}

export async function updateUserDonorStatusInFirestore(userId: string, donorInfo: DonorInfo): Promise<void> {
  if (!db || !userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      donorTier: donorInfo.tier,
      donor: donorInfo,
      updatedAt: serverTimestamp()
    });
    console.log(`[Firestore] Estatus de donador actualizado para ${userId}: ${donorInfo.tier}`);
  } catch (err: any) {
    console.warn('[Firestore] Error actualizando estatus de donador:', err?.message || err);
  }
}

export async function updateUserPaymentMethodsInFirestore(userId: string, methods: SavedPaymentMethod[]): Promise<void> {
  if (!db || !userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      savedPaymentMethods: methods,
      updatedAt: serverTimestamp()
    });
    console.log(`[Firestore] Métodos de pago guardados para ${userId}:`, methods.length);
  } catch (err: any) {
    console.warn('[Firestore] Error guardando métodos de pago:', err?.message || err);
  }
}

export async function recordDonationInFirestore(donation: {
  userId: string;
  userName: string;
  userEmail: string;
  tier: DonorTier;
  amountMonthlyEur: number;
  paymentMethod: string;
  paypalEmail?: string;
  cardBrand?: string;
  cardLast4?: string;
  recipientPaypal?: string;
  txId?: string;
}): Promise<void> {
  if (!db) return;
  try {
    const donationRef = doc(collection(db, 'donations'));
    await setDoc(donationRef, {
      ...donation,
      recipientPaypal: donation.recipientPaypal || 'https://paypal.me/OffertGames',
      id: donationRef.id,
      status: 'completed',
      createdAt: serverTimestamp()
    });
    console.log(`[Firestore] Donación/Pago registrado en collection 'donations': ${donation.tier} (${donation.amountMonthlyEur}€)`);
  } catch (err: any) {
    console.warn('[Firestore] Error registrando donación:', err?.message || err);
  }
}

// ==========================================
// 2. AJUSTES DE AVISOS DE PRECIOS (ALERT_SETTINGS)
// ==========================================

export async function saveAlertSettingsToFirestore(userId: string, settings: PriceAlertSettings): Promise<void> {
  if (!db || !userId) return;
  try {
    const settingsDoc = doc(db, 'alert_settings', userId);
    await setDoc(settingsDoc, {
      ...settings,
      userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firestore] Ajustes de alertas guardados para usuario ${userId}`);
  } catch (err: any) {
    console.warn('[Firestore] Error guardando ajustes de alertas:', err?.message || err);
  }
}

export async function fetchAlertSettingsFromFirestore(userId: string): Promise<PriceAlertSettings | null> {
  if (!db || !userId) return null;
  try {
    const settingsDoc = doc(db, 'alert_settings', userId);
    const snap = await getDoc(settingsDoc);
    if (snap.exists()) {
      return snap.data() as PriceAlertSettings;
    }
    return null;
  } catch (err: any) {
    console.warn('[Firestore] Error obteniendo ajustes de alertas:', err?.message || err);
    return null;
  }
}

// ==========================================
// 3. NOTIFICACIONES DE AVISOS (NOTIFICATIONS)
// ==========================================

export async function saveNotificationToFirestore(userId: string, notif: PriceAlertNotification): Promise<void> {
  if (!db || !userId || !notif?.id) return;
  try {
    const notifDoc = doc(db, 'users', userId, 'notifications', notif.id);
    await setDoc(notifDoc, {
      ...notif,
      createdAt: serverTimestamp()
    }, { merge: true });
  } catch (err: any) {
    console.warn('[Firestore] Error guardando notificación:', err?.message || err);
  }
}

export async function fetchNotificationsFromFirestore(userId: string): Promise<PriceAlertNotification[]> {
  if (!db || !userId) return [];
  try {
    const notifsCol = collection(db, 'users', userId, 'notifications');
    const q = query(notifsCol, orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PriceAlertNotification);
  } catch (err: any) {
    console.warn('[Firestore] Error obteniendo notificaciones:', err?.message || err);
    return [];
  }
}

export async function markNotificationAsReadInFirestore(userId: string, notifId: string): Promise<void> {
  if (!db || !userId || !notifId) return;
  try {
    const notifDoc = doc(db, 'users', userId, 'notifications', notifId);
    await updateDoc(notifDoc, { read: true });
  } catch (err: any) {
    console.warn('[Firestore] Error marcando notificación leída:', err?.message || err);
  }
}

export async function clearAllNotificationsInFirestore(userId: string): Promise<void> {
  if (!db || !userId) return;
  try {
    const notifsCol = collection(db, 'users', userId, 'notifications');
    const snap = await getDocs(notifsCol);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (err: any) {
    console.warn('[Firestore] Error borrando notificaciones:', err?.message || err);
  }
}

// ==========================================
// 4. COMUNIDAD / PUBLICACIONES & RESEÑAS (POSTS COLLECTION)
// ==========================================

function sanitizePostForFirestore(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(item => sanitizePostForFirestore(item));
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      const val = data[key];
      if (val !== undefined) {
        clean[key] = sanitizePostForFirestore(val);
      }
    });
    return clean;
  }
  return data;
}

export async function savePostToFirestore(post: CommunityPost): Promise<void> {
  if (!db || !post?.id) return;
  try {
    const postDoc = doc(db, 'posts', post.id);
    const cleanData = sanitizePostForFirestore(post);
    await setDoc(postDoc, {
      ...cleanData,
      createdAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firestore] Publicación/Reseña guardada exitosamente: ${post.id}`);
  } catch (err: any) {
    console.warn('[Firestore] Error guardando post/reseña:', err?.message || err);
  }
}

export async function fetchPostsFromFirestore(): Promise<CommunityPost[]> {
  if (!db) return [];
  try {
    const postsCol = collection(db, 'posts');
    const snap = await getDocs(postsCol);
    const list = snap.docs.map(d => d.data() as CommunityPost);
    return list.sort((a, b) => {
      const timeA = typeof a.id === 'string' && a.id.startsWith('post-') ? Number(a.id.replace('post-', '')) : 0;
      const timeB = typeof b.id === 'string' && b.id.startsWith('post-') ? Number(b.id.replace('post-', '')) : 0;
      return timeB - timeA;
    });
  } catch (err: any) {
    console.warn('[Firestore] Error obteniendo posts:', err?.message || err);
    return [];
  }
}

export function subscribeToCommunityPosts(
  callback: (posts: CommunityPost[]) => void
): Unsubscribe | null {
  if (!db) return null;
  try {
    const postsCol = collection(db, 'posts');
    return onSnapshot(postsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as CommunityPost);
      list.sort((a, b) => {
        const timeA = typeof a.id === 'string' && a.id.startsWith('post-') ? Number(a.id.replace('post-', '')) : 0;
        const timeB = typeof b.id === 'string' && b.id.startsWith('post-') ? Number(b.id.replace('post-', '')) : 0;
        return timeB - timeA;
      });
      callback(list);
    }, (err) => {
      console.warn('[Firestore] Snapshot error en posts:', err?.message || err);
    });
  } catch (err: any) {
    console.warn('[Firestore] Error iniciando listener de posts:', err?.message || err);
    return null;
  }
}

export async function updatePostInFirestore(postId: string, updates: Partial<CommunityPost>): Promise<void> {
  if (!db || !postId) return;
  try {
    const postDoc = doc(db, 'posts', postId);
    const cleanUpdates = sanitizePostForFirestore(updates);
    await setDoc(postDoc, {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firestore] Publicación/Reseña actualizada exitosamente: ${postId}`);
  } catch (err: any) {
    console.warn('[Firestore] Error actualizando post/reseña:', err?.message || err);
  }
}

export async function deletePostFromFirestore(postId: string): Promise<void> {
  if (!db || !postId) return;
  try {
    const postDoc = doc(db, 'posts', postId);
    await deleteDoc(postDoc);
  } catch (err: any) {
    console.warn('[Firestore] Error borrando post:', err?.message || err);
  }
}

// ==========================================
// 5. DENUNCIAS / MODERACIÓN (REPORTS COLLECTION)
// ==========================================

export async function saveReportToFirestore(report: ReportItem): Promise<void> {
  if (!db || !report?.id) return;
  try {
    const repDoc = doc(db, 'reports', report.id);
    await setDoc(repDoc, {
      ...report,
      createdAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firestore] Denuncia guardada: ${report.id}`);
  } catch (err: any) {
    console.warn('[Firestore] Error guardando reporte:', err?.message || err);
  }
}

export async function fetchReportsFromFirestore(): Promise<ReportItem[]> {
  if (!db) return [];
  try {
    const repCol = collection(db, 'reports');
    const snap = await getDocs(repCol);
    return snap.docs.map(d => d.data() as ReportItem);
  } catch (err: any) {
    console.warn('[Firestore] Error obteniendo reportes:', err?.message || err);
    return [];
  }
}

export async function updateReportInFirestore(reportId: string, updates: Partial<ReportItem>): Promise<void> {
  if (!db || !reportId) return;
  try {
    const repDoc = doc(db, 'reports', reportId);
    await updateDoc(repDoc, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (err: any) {
    console.warn('[Firestore] Error actualizando reporte:', err?.message || err);
  }
}

// ==========================================
// 6. JUEGOS Y OFERTAS (GAMES COLLECTION)
// ==========================================

export async function saveGameToFirestore(game: any): Promise<void> {
  if (!db || !game?.id) return;
  try {
    const gameDoc = doc(db, 'games', String(game.id));
    await setDoc(gameDoc, {
      ...game,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firestore] Juego guardado: ${game.title || game.id}`);
  } catch (err: any) {
    console.warn('[Firestore] Error guardando juego:', err?.message || err);
    throw err;
  }
}

export async function fetchGamesFromFirestore(): Promise<any[]> {
  if (!db) return [];
  try {
    const gamesCol = collection(db, 'games');
    const snap = await getDocs(gamesCol);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err: any) {
    console.warn('[Firestore] Error obteniendo juegos:', err?.message || err);
    return [];
  }
}

export async function deleteGameFromFirestore(gameId: string): Promise<void> {
  if (!db || !gameId) return;
  try {
    const gameDoc = doc(db, 'games', String(gameId));
    await deleteDoc(gameDoc);
  } catch (err: any) {
    console.warn('[Firestore] Error borrando juego:', err?.message || err);
  }
}

export function subscribeToGames(callback: (games: any[]) => void): Unsubscribe | null {
  if (!db) return null;
  try {
    const gamesCol = collection(db, 'games');
    return onSnapshot(gamesCol, (snapshot) => {
      const games = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(games);
    }, (err) => {
      console.warn('[Firestore] Snapshot error en games:', err?.message || err);
    });
  } catch (err: any) {
    console.warn('[Firestore] Error listener de games:', err?.message || err);
    return null;
  }
}

// ==========================================
// 7. REGISTROS DE ACTIVIDAD (ACTIVITY_LOGS)
// ==========================================

export interface ActivityLogItem {
  id?: string;
  user: string;
  action: string;
  timestamp: string;
  type?: string;
}

export async function saveActivityLogToFirestore(log: { user: string; action: string; type?: string }): Promise<void> {
  if (!db) return;
  try {
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const logDoc = doc(db, 'activity_logs', logId);
    await setDoc(logDoc, {
      user: log.user,
      action: log.action,
      type: log.type || 'SYSTEM',
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
  } catch (err: any) {
    console.warn('[Firestore] Error guardando log de actividad:', err?.message || err);
  }
}

export async function fetchActivityLogsFromFirestore(): Promise<ActivityLogItem[]> {
  if (!db) return [];
  try {
    const logsCol = collection(db, 'activity_logs');
    const snap = await getDocs(query(logsCol, limit(30)));
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  } catch (err: any) {
    console.warn('[Firestore] Error obteniendo logs de actividad:', err?.message || err);
    return [];
  }
}

export function subscribeToActivityLogs(callback: (logs: ActivityLogItem[]) => void): Unsubscribe | null {
  if (!db) return null;
  try {
    const logsCol = collection(db, 'activity_logs');
    return onSnapshot(logsCol, (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      callback(logs);
    }, (err) => {
      console.warn('[Firestore] Snapshot error en activity_logs:', err?.message || err);
    });
  } catch (err: any) {
    console.warn('[Firestore] Error listener de activity_logs:', err?.message || err);
    return null;
  }
}

