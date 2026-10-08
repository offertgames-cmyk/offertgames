import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, AlertCircle, ShieldCheck } from 'lucide-react';
import { auth as firebaseAuth, googleProvider, githubProvider, isFirebaseConfigured } from '../services/firebaseClient';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalMode,
    authModalReason,
    closeAuthModal,
    loginWithOAuth,
    showToast
  } = useApp();

  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleGoogleClick = async () => {
    setErrorMessage(null);
    if (!isFirebaseConfigured || !firebaseAuth) {
      setErrorMessage('Google todavía no está configurado en Firebase.');
      return;
    }

    try {
      setLoadingProvider('google');
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const user = result.user;
      if (user) {
        const authEmail = (user.email || '').trim().toLowerCase();
        const authName = user.displayName || authEmail.split('@')[0] || 'Jugador';
        const authAvatar = user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';

        loginWithOAuth('google', {
          id: user.uid,
          name: authName,
          email: authEmail,
          avatar: authAvatar
        });

        showToast(`¡Bienvenido a OffertGames, ${authName}!`);
        closeAuthModal();
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Inicio de sesión cancelado.');
      } else if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(firebaseAuth, googleProvider);
          return;
        } catch {
          setErrorMessage('Tu navegador bloqueó la ventana de Google. Por favor, permite las ventanas emergentes.');
        }
      } else if (err?.code === 'auth/unauthorized-domain') {
        setErrorMessage('Dominio no autorizado en Firebase. Refresca la página e inténtalo de nuevo.');
      } else {
        try {
          await signInWithRedirect(firebaseAuth, googleProvider);
          return;
        } catch {
          setErrorMessage(err instanceof Error ? err.message : 'No se pudo completar el inicio de sesión con Google.');
        }
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGithubClick = async () => {
    setErrorMessage(null);
    if (!isFirebaseConfigured || !firebaseAuth) {
      setErrorMessage('GitHub todavía no está configurado en Firebase.');
      return;
    }

    try {
      setLoadingProvider('github');
      const result = await signInWithPopup(firebaseAuth, githubProvider);
      const user = result.user;
      if (user) {
        const authEmail = (user.email || '').trim().toLowerCase() || `${user.providerData[0]?.uid || user.uid}@github.user`;
        const authName = user.displayName || user.providerData[0]?.displayName || authEmail.split('@')[0] || 'Jugador GitHub';
        const authAvatar = user.photoURL || user.providerData[0]?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';

        loginWithOAuth('github', {
          id: user.uid,
          name: authName,
          email: authEmail,
          avatar: authAvatar
        });

        showToast(`¡Bienvenido a OffertGames, ${authName}!`);
        closeAuthModal();
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Inicio de sesión con GitHub cancelado.');
      } else if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(firebaseAuth, githubProvider);
          return;
        } catch {
          setErrorMessage('Tu navegador bloqueó la ventana de GitHub. Por favor, permite las ventanas emergentes.');
        }
      } else if (err?.code === 'auth/account-exists-with-different-credential') {
        setErrorMessage('Ya existe una cuenta con este mismo correo vinculada a Google. Inicia sesión con Google.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setErrorMessage('Dominio no autorizado en Firebase. Refresca la página e inténtalo de nuevo.');
      } else {
        try {
          await signInWithRedirect(firebaseAuth, githubProvider);
          return;
        } catch {
          setErrorMessage(err instanceof Error ? err.message : 'No se pudo completar el inicio de sesión con GitHub.');
        }
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const isAnyLoading = loadingProvider !== null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#121822] w-full max-w-md rounded-2xl border border-[#233145] p-6 sm:p-8 space-y-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Reason banner if triggered by a protected action (wishlist/post) */}
        {authModalReason && (
          <div className="bg-[#06b6d4]/10 border border-[#06b6d4]/30 p-3 rounded-xl text-xs text-[#22d3ee] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authModalReason}</span>
          </div>
        )}

        {/* Global error message alert */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Authentication Content */}
        <div className="space-y-6 text-center py-2 animate-in fade-in">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#18212e] border border-[#2a3a50] flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#18212e] border border-[#2a3a50] flex items-center justify-center shadow-lg text-white">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {authModalMode === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </h2>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Accede a <span className="text-[#38bdf8] font-bold">OffertGames</span> con tu cuenta de Google o GitHub para guardar tus ofertas favoritas, seguir precios y sincronizar tu sesión.
            </p>
          </div>

          {/* Botones de Autenticación */}
          <div className="space-y-3 pt-1">
            {/* Botón Google */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center gap-3.5 py-3 px-5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-extrabold text-sm transition-all shadow-lg active:scale-98 cursor-pointer border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingProvider === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>{loadingProvider === 'google' ? 'Conectando con Google...' : authModalMode === 'login' ? 'Continuar con Google' : 'Registrarse con Google'}</span>
            </button>

            {/* Separador sutil */}
            <div className="relative flex items-center py-1">
              <div className="grow border-t border-[#233145]" />
              <span className="shrink mx-3 text-[11px] text-gray-500 uppercase tracking-wider font-semibold">o</span>
              <div className="grow border-t border-[#233145]" />
            </div>

            {/* Botón GitHub */}
            <button
              type="button"
              onClick={handleGithubClick}
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center gap-3.5 py-3 px-5 rounded-xl bg-[#24292e] hover:bg-[#2c3238] text-white font-extrabold text-sm transition-all shadow-lg active:scale-98 cursor-pointer border border-[#38424d] hover:border-[#4d5b6a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingProvider === 'github' ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              )}
              <span>{loadingProvider === 'github' ? 'Conectando con GitHub...' : authModalMode === 'login' ? 'Continuar con GitHub' : 'Registrarse con GitHub'}</span>
            </button>
          </div>

          {/* Seguridad y Privacidad */}
          <div className="bg-[#18212e]/70 border border-[#27364a] p-3 rounded-xl flex items-center justify-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Autenticación oficial y segura protegida por Google Firebase</span>
          </div>
        </div>
      </div>
    </div>
  );
};

