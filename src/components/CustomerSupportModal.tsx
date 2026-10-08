import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { sendSupportTicket, SupportCategory } from '../services/supportService';
import { auth as firebaseAuth, googleProvider, isFirebaseConfigured } from '../services/firebaseClient';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { 
  X, 
  Headphones, 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ShieldAlert, 
  Wrench, 
  Lightbulb,
  Check,
  Lock,
  ArrowRight
} from 'lucide-react';

export const CustomerSupportModal: React.FC = () => {
  const {
    isSupportModalOpen,
    closeSupportModal,
    currentUser,
    loginWithOAuth,
    showToast
  } = useApp();

  const [category, setCategory] = useState<SupportCategory>('consulta');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentSuccessTicketId, setSentSuccessTicketId] = useState<string | null>(null);

  if (!isSupportModalOpen) return null;

  // Determine if current user is logged in via Google
  const isGoogleUser = Boolean(
    currentUser && (
      currentUser.provider === 'google' || 
      currentUser.email?.toLowerCase().endsWith('@gmail.com')
    )
  );

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    if (!isFirebaseConfigured || !firebaseAuth) {
      setErrorMessage('Firebase no está configurado en este entorno.');
      return;
    }

    setIsLoggingInGoogle(true);
    try {
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

        showToast(`¡Sesión iniciada con Google, ${authName}! Ya puedes enviar tu mensaje.`);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Inicio de sesión cancelado.');
      } else {
        try {
          await signInWithRedirect(firebaseAuth, googleProvider);
        } catch {
          setErrorMessage('No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.');
        }
      }
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    setSentSuccessTicketId(null);
    setSubject('');
    setMessage('');
    closeSupportModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser || !isGoogleUser) {
      setErrorMessage('Debes iniciar sesión con Google para enviar el mensaje.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Por favor introduce el asunto de tu consulta o queja.');
      return;
    }

    if (subject.trim().length < 3) {
      setErrorMessage('El asunto debe tener al menos 3 caracteres.');
      return;
    }

    if (!message.trim()) {
      setErrorMessage('Por favor describe tu consulta o queja en el mensaje.');
      return;
    }

    if (message.trim().length < 10) {
      setErrorMessage('El mensaje debe contener al menos 10 caracteres.');
      return;
    }

    setIsSending(true);
    try {
      const res = await sendSupportTicket({
        category,
        subject: subject.trim(),
        message: message.trim(),
        user: currentUser
      });

      if (!res.ok) {
        setErrorMessage(res.message || 'Error al enviar el mensaje. Inténtalo de nuevo.');
      } else {
        setSentSuccessTicketId(res.ticketId || 'OK');
        showToast('¡Mensaje enviado con éxito al correo de OffertGames!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error de conexión con el servicio de correo.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0f1520] border border-[#233147] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1c2738] bg-[#121926] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[#38bdf8]">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Servicio al Cliente</span>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Soporte Oficial
                </span>
              </h2>
              <p className="text-xs text-gray-400">Atención, dudas, consultas y quejas de OffertGames</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a2332] transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5">

          {/* SUCCESS SCREEN */}
          {sentSuccessTicketId ? (
            <div className="text-center py-6 sm:py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-in zoom-in duration-300">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white">¡Mensaje Enviado con Éxito!</h3>
                <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                  Tu mensaje ha sido remitido directamente al correo oficial de OffertGames (<span className="text-[#38bdf8] font-mono">offertgames@gmail.com</span>).
                </p>
              </div>

              <div className="bg-[#121926] border border-[#233147] rounded-2xl p-4 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between items-center text-gray-400">
                  <span>Destinatario:</span>
                  <span className="font-mono text-cyan-400 font-bold">offertgames@gmail.com</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Respuesta dirigida a:</span>
                  <span className="text-white font-medium truncate max-w-[200px]">{currentUser?.email}</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>ID de seguimiento:</span>
                  <span className="font-mono text-gray-400 text-[11px]">{sentSuccessTicketId}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-[#06b6d4] hover:bg-[#0891b2] text-black font-extrabold text-xs py-3 px-8 rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Entendido y Cerrar
                </button>
              </div>
            </div>
          ) : !isGoogleUser ? (
            /* REQUIRE GOOGLE LOGIN SCREEN */
            <div className="space-y-5 py-2">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Lock className="w-4 h-4" />
                  <span>Requiere Cuenta de Google Verificada</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Para enviar consultas o quejas al servicio técnico es imprescindible haber iniciado sesión con tu cuenta de Google. De este modo verificamos tu identidad y podremos responderte directamente a tu correo electrónico.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingInGoogle}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs shadow-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoggingInGoogle ? (
                    <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>Iniciar Sesión con Google para Continuar</span>
                </button>

                <p className="text-[11px] text-gray-500 text-center">
                  Tus datos están protegidos y solo se utilizarán para responder a tu solicitud.
                </p>
              </div>
            </div>
          ) : (
            /* ACTIVE FORM (VERIFIED GOOGLE USER) */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Google Verified User Card */}
              <div className="bg-[#121926] border border-[#233147] rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                    alt={currentUser?.name}
                    className="w-10 h-10 rounded-xl object-cover border border-[#38bdf8] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white truncate">{currentUser?.name}</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>Google</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 truncate block">{currentUser?.email}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-gray-400 block font-medium">Destino oficial:</span>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">offertgames@gmail.com</span>
                </div>
              </div>

              {/* Category Pill Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  Motivo de la Comunicación:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('consulta')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      category === 'consulta'
                        ? 'bg-cyan-500/20 text-[#38bdf8] border-cyan-500/40 shadow-sm'
                        : 'bg-[#121926] text-gray-400 border-[#233147] hover:text-white'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Consulta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('queja')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      category === 'queja'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                        : 'bg-[#121926] text-gray-400 border-[#233147] hover:text-white'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Queja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('problema_tecnico')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      category === 'problema_tecnico'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                        : 'bg-[#121926] text-gray-400 border-[#233147] hover:text-white'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Técnico</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('sugerencia')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      category === 'sugerencia'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                        : 'bg-[#121926] text-gray-400 border-[#233147] hover:text-white'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Sugerencia</span>
                  </button>
                </div>
              </div>

              {/* Subject Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Asunto:
                  </label>
                  <span className="text-[10px] text-gray-500">{subject.length}/100</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Duda sobre una oferta / Error en la sincronización..."
                  className="w-full bg-[#121926] border border-[#233147] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-all"
                />
              </div>

              {/* Message Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Mensaje Detallado:
                  </label>
                  <span className="text-[10px] text-gray-500">{message.length}/2000</span>
                </div>
                <textarea
                  required
                  rows={5}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe con claridad y detalle tu consulta, problema técnico o queja..."
                  className="w-full bg-[#121926] border border-[#233147] rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-all resize-none"
                />
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-[#151d29] hover:bg-[#1c2738] text-gray-300 font-bold text-xs py-3 rounded-xl border border-[#233145] transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSending || !subject.trim() || !message.trim()}
                  className="flex-1 font-extrabold text-xs py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white shadow-cyan-500/20 active:scale-98"
                >
                  {isSending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando al Correo...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar al Servicio Técnico</span>
                    </div>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-[#111824] border-t border-[#1c2738] text-center text-[11px] text-gray-500">
          Atención al Cliente OffertGames • Respuesta directa a tu correo de Google en 24-48 horas
        </div>

      </div>
    </div>
  );
};
