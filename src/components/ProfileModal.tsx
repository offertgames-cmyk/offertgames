import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DonorBadge } from './DonorBadge';
import { SavedPaymentMethod } from '../types/game';
import { validateImageFile, sanitizeText, sanitizeUrl, securityLimiter, RATE_LIMITS } from '../services/securityService';
import { 
  X, 
  User as UserIcon, 
  Camera, 
  Award, 
  Check, 
  Lock, 
  ExternalLink, 
  ShieldCheck, 
  Calendar, 
  CreditCard,
  Upload,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Wallet
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
];

export const ProfileModal: React.FC = () => {
  const {
    isProfileModalOpen,
    closeProfileModal,
    currentUser,
    updateUserProfileData,
    openDonationModal,
    savedPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod
  } = useApp();

  const [activeTab, setActiveTab] = useState<'perfil' | 'pagos'>('perfil');

  // Profile Form State
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Payment Method Form State
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'card' | 'paypal'>('card');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [newPaypalEmail, setNewPaypalEmail] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setAvatar(currentUser.avatar || '');
      setCustomUrlInput(currentUser.avatar || '');
      setPaypalEmail(currentUser.email || '');
      setErrorMessage(null);
    }
  }, [currentUser, isProfileModalOpen]);

  if (!isProfileModalOpen || !currentUser) return null;

  const isNameChanged = name.trim() !== currentUser.name;
  const isAvatarChanged = avatar.trim() !== currentUser.avatar;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const validation = await validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Archivo de imagen no válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatar(result);
        setCustomUrlInput('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Rate limiting defense against profile update flooding
    const rateCheck = securityLimiter.checkLimit('profile_update', RATE_LIMITS.PROFILE_UPDATE.max, RATE_LIMITS.PROFILE_UPDATE.windowSeconds);
    if (!rateCheck.allowed) {
      setErrorMessage(rateCheck.error || 'Demasiadas actualizaciones consecutivas.');
      return;
    }

    const cleanName = sanitizeText(name);
    if (!cleanName) {
      setErrorMessage('El nombre no puede estar vacío.');
      return;
    }

    const cleanAvatar = sanitizeUrl(avatar);
    const isNameCleanChanged = cleanName !== currentUser.name;
    const isAvatarCleanChanged = cleanAvatar !== currentUser.avatar;

    if (!isNameCleanChanged && !isAvatarCleanChanged) {
      closeProfileModal();
      return;
    }

    setIsProcessing(true);
    try {
      const res = await updateUserProfileData({
        newName: isNameCleanChanged ? cleanName : undefined,
        newAvatar: isAvatarCleanChanged ? cleanAvatar : undefined
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Ocurrió un error al guardar los cambios.');
      } else {
        closeProfileModal();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error guardando en el servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNewPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMethodType === 'card') {
      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 15) {
        setErrorMessage('Por favor introduce un número de tarjeta válido.');
        return;
      }
      const last4 = cleanNum.slice(-4);
      const [expM, expY] = cardExp.split('/');

      await addPaymentMethod({
        type: 'card',
        isDefault: setAsDefault,
        cardholderName: sanitizeText(cardholderName.trim() || currentUser.name),
        cardNumberMasked: `•••• •••• •••• ${last4}`,
        cardBrand: cleanNum.startsWith('4') ? 'visa' : cleanNum.startsWith('5') ? 'mastercard' : 'generic',
        expiryMonth: sanitizeText(expM || '12'),
        expiryYear: sanitizeText(expY || '28')
      });
    } else {
      const cleanPaypal = sanitizeText(newPaypalEmail.trim().toLowerCase());
      if (!cleanPaypal.includes('@')) {
        setErrorMessage('Por favor introduce un correo de PayPal válido.');
        return;
      }
      await addPaymentMethod({
        type: 'paypal',
        isDefault: setAsDefault,
        paypalEmail: cleanPaypal
      });
    }

    // Reset form
    setCardNumber('');
    setCardholderName('');
    setCardExp('');
    setCardCvc('');
    setNewPaypalEmail('');
    setShowAddMethod(false);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0f1520] border border-[#233147] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1d293d] bg-[#141c2b]/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 flex items-center justify-center text-[#22d3ee]">
                <UserIcon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                  <span>Cuenta de Usuario</span>
                  {currentUser.donorTier && (
                    <DonorBadge tier={currentUser.donorTier} size="xs" />
                  )}
                </h2>
                <p className="text-xs text-gray-400">
                  {currentUser.email} • ID: {currentUser.id.slice(0, 12)}
                </p>
              </div>
            </div>

            <button
              onClick={closeProfileModal}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1f2c42] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs: Mi Perfil vs Mis Métodos de Pago (Amazon Style) */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={() => setActiveTab('perfil')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'perfil'
                  ? 'bg-[#38bdf8] text-black shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#182232]'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Mi Perfil</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pagos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pagos'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#182232]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Mis Métodos de Pago</span>
              {savedPaymentMethods.length > 0 && (
                <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-black">
                  {savedPaymentMethods.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">

          {errorMessage && (
            <div className="p-3 mb-4 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: MI PERFIL */}
          {activeTab === 'perfil' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">

              {/* Status & Donor Badge */}
              <div className="bg-[#131b26] border border-[#212f42] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                    alt={name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#38bdf8] shadow-md"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-white">{currentUser.name}</span>
                      {currentUser.donorTier ? (
                        <DonorBadge tier={currentUser.donorTier} size="sm" showLabel={true} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            closeProfileModal();
                            openDonationModal();
                          }}
                          className="text-[10px] text-amber-400 hover:underline font-bold flex items-center gap-1"
                        >
                          <Award className="w-3 h-3" />
                          <span>Conseguir medalla</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>Miembro desde: {currentUser.joinedDate || '2024'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name Field with Quota Badge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Nombre de Usuario:
                  </label>
                  
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Guardado en el servidor</span>
                  </span>
                </div>

                <input
                  type="text"
                  required
                  maxLength={28}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#131b26] border border-[#233349] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
                  placeholder="Tu nombre en la plataforma"
                />
              </div>

              {/* Avatar Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Foto de Perfil:
                  </label>

                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Camera className="w-3 h-3 stroke-[3]" />
                    <span>Visible en tus reseñas y posts</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => {
                        setCustomUrlInput(e.target.value);
                        if (e.target.value.trim()) setAvatar(e.target.value.trim());
                      }}
                      placeholder="Pega la URL de cualquier imagen web..."
                      className="flex-1 bg-[#131b26] border border-[#233349] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
                    />

                    <label className="bg-[#1b2535] hover:bg-[#223045] text-gray-200 text-xs px-3 py-2 rounded-xl border border-[#2a3c54] cursor-pointer flex items-center gap-1.5 transition-colors shrink-0">
                      <Upload className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span className="hidden sm:inline">Subir foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 block mb-1.5 font-medium">O elige un avatar rápido:</span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {PRESET_AVATARS.map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatar(presetUrl);
                            setCustomUrlInput(presetUrl);
                          }}
                          className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                            avatar === presetUrl ? 'border-[#38bdf8] scale-105' : 'border-[#223145] hover:border-gray-400'
                          }`}
                        >
                          <img src={presetUrl} alt="Preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeProfileModal}
                  className="flex-1 bg-[#151d29] hover:bg-[#1c2738] text-gray-300 font-bold text-xs py-3 rounded-xl border border-[#233145] transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isProcessing || (!isNameChanged && !isAvatarChanged)}
                  className="flex-1 font-extrabold text-xs py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer bg-[#06b6d4] hover:bg-[#0891b2] text-black shadow-cyan-500/20"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Guardando en el servidor...</span>
                    </div>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: MIS MÉTODOS DE PAGO (AMAZON / SAAS WALLET STYLE) */}
          {activeTab === 'pagos' && (
            <div className="space-y-6">

              {/* Header Box */}
              <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>Cartera de Pagos y Donaciones</span>
                  </h3>
                  <p className="text-xs text-gray-400 pt-0.5">
                    Guarda tus tarjetas o cuenta PayPal para donar o pagar en 1 clic
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMethod(!showAddMethod)}
                  className="bg-amber-400 hover:bg-amber-500 text-black font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Añadir método</span>
                </button>
              </div>

              {/* Add New Method Form */}
              {showAddMethod && (
                <form onSubmit={handleAddNewPaymentMethod} className="bg-[#131b26] border border-amber-500/40 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Añadir Nuevo Método de Facturación
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddMethod(false)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      Cerrar
                    </button>
                  </div>

                  {/* Selector: Tarjeta vs PayPal */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewMethodType('card')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        newMethodType === 'card'
                          ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8]'
                          : 'bg-[#0f1520] border-[#223145] text-gray-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Tarjeta Bancaria</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewMethodType('paypal')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        newMethodType === 'paypal'
                          ? 'bg-[#ffc439]/20 border-[#ffc439] text-[#ffc439]'
                          : 'bg-[#0f1520] border-[#223145] text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="font-black italic">PP</span>
                      <span>Cuenta PayPal</span>
                    </button>
                  </div>

                  {/* Card Form Fields */}
                  {newMethodType === 'card' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] text-gray-400 mb-1 block">Número de Tarjeta:</label>
                        <input
                          type="text"
                          required
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                            setCardNumber(v);
                          }}
                          placeholder="4242 •••• •••• 4242"
                          className="w-full bg-[#0d131d] border border-[#233349] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-gray-400 mb-1 block">Titular de la Tarjeta:</label>
                          <input
                            type="text"
                            required
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            placeholder="Nombre y Apellidos"
                            className="w-full bg-[#0d131d] border border-[#233349] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-gray-400 mb-1 block">Caducidad:</label>
                            <input
                              type="text"
                              required
                              maxLength={5}
                              value={cardExp}
                              onChange={(e) => {
                                let v = e.target.value.replace(/\D/g, '');
                                if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                                setCardExp(v);
                              }}
                              placeholder="MM/AA"
                              className="w-full bg-[#0d131d] border border-[#233349] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] text-gray-400 mb-1 block">CVC:</label>
                            <input
                              type="password"
                              required
                              maxLength={4}
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                              placeholder="•••"
                              className="w-full bg-[#0d131d] border border-[#233349] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] text-gray-400 mb-1 block">Correo de tu cuenta PayPal:</label>
                      <input
                        type="email"
                        required
                        value={newPaypalEmail}
                        onChange={(e) => setNewPaypalEmail(e.target.value)}
                        placeholder="ejemplo@paypal.com"
                        className="w-full bg-[#0d131d] border border-[#233349] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="defaultMethod"
                      checked={setAsDefault}
                      onChange={(e) => setSetAsDefault(e.target.checked)}
                      className="rounded bg-[#0d131d] border-[#233349] text-[#38bdf8] focus:ring-0"
                    />
                    <label htmlFor="defaultMethod" className="text-xs text-gray-300">
                      Establecer como método de pago predeterminado
                    </label>
                  </div>

                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      className="bg-[#06b6d4] hover:bg-[#0891b2] text-black font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Guardar Método de Pago
                    </button>
                  </div>
                </form>
              )}

              {/* Saved Methods List */}
              <div className="space-y-3">
                {savedPaymentMethods.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-[#111722] border border-[#1f2b3c] rounded-2xl space-y-2">
                    <CreditCard className="w-8 h-8 text-gray-500 mx-auto" />
                    <h4 className="text-xs font-bold text-gray-300">No tienes métodos de pago guardados</h4>
                    <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                      Añade una tarjeta o tu cuenta de PayPal para donar a la web o cambiar tu nombre con un solo clic estilo Amazon.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddMethod(true)}
                      className="mt-2 text-xs text-[#38bdf8] hover:underline font-bold"
                    >
                      Añadir mi primera tarjeta o PayPal
                    </button>
                  </div>
                ) : (
                  savedPaymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        pm.isDefault
                          ? 'bg-[#15202e] border-[#38bdf8]/60 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                          : 'bg-[#111722] border-[#1e293b] hover:border-[#2b3a4e]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                          pm.type === 'card'
                            ? 'bg-[#1e293b] text-cyan-300 border border-cyan-500/30'
                            : 'bg-[#ffc439]/20 text-[#ffc439] border border-amber-500/30'
                        }`}>
                          {pm.type === 'card' ? <CreditCard className="w-5 h-5" /> : 'PP'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">
                              {pm.type === 'card' ? pm.cardNumberMasked : pm.paypalEmail}
                            </span>
                            {pm.isDefault && (
                              <span className="text-[9px] bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 px-1.5 py-0.2 rounded-md font-bold uppercase">
                                Predeterminado
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] text-gray-400">
                            {pm.type === 'card'
                              ? `Titular: ${pm.cardholderName || 'Usuario'} • Vence: ${pm.expiryMonth}/${pm.expiryYear}`
                              : 'Cuenta verificada de PayPal'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!pm.isDefault && (
                          <button
                            type="button"
                            onClick={() => setDefaultPaymentMethod(pm.id)}
                            className="text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded-lg border border-[#243347] hover:border-gray-400 transition-colors"
                          >
                            Hacer predeterminado
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removePaymentMethod(pm.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar método de pago"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Security info */}
              <div className="p-3 bg-[#0c1119] border border-[#1b2636] rounded-xl flex items-center gap-2.5 text-[11px] text-gray-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Pasarela cifrada bajo protocolo SSL 256 bits y bóveda segura en la nube. Puedes eliminar tus métodos en cualquier momento.
                </span>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
