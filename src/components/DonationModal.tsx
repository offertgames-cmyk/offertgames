import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DonorTier } from '../types/game';
import { DonorBadge, DONOR_TIERS_CONFIG } from './DonorBadge';
import { 
  X, 
  Award, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  CheckCircle2, 
  Wallet,
  Plus
} from 'lucide-react';

export const DonationModal: React.FC = () => {
  const {
    isDonationModalOpen,
    closeDonationModal,
    currentUser,
    processDonation,
    savedPaymentMethods,
    openProfileModal
  } = useApp();

  const [selectedTier, setSelectedTier] = useState<DonorTier>('oro');
  
  // Payment Method Selection
  const defaultSaved = savedPaymentMethods.find(m => m.isDefault) || savedPaymentMethods[0];
  const [paymentOption, setPaymentOption] = useState<'saved' | 'paypal' | 'new_card'>(
    savedPaymentMethods.length > 0 ? 'saved' : 'paypal'
  );
  const [selectedSavedId, setSelectedSavedId] = useState<string>(defaultSaved?.id || '');

  // PayPal direct input
  const [paypalEmail, setPaypalEmail] = useState(currentUser?.email || '');
  const [savePaypalAccount, setSavePaypalAccount] = useState(true);

  // New Card inputs
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardHolder, setNewCardHolder] = useState(currentUser?.name || '');
  const [newCardExp, setNewCardExp] = useState('');
  const [newCardCvc, setNewCardCvc] = useState('');
  const [saveNewCard, setSaveNewCard] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isDonationModalOpen) return null;

  const currentTierConfig = DONOR_TIERS_CONFIG[selectedTier];

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1100));

      let payload: any = {};
      if (paymentOption === 'saved' && selectedSavedId) {
        payload = {
          methodType: 'saved',
          savedMethodId: selectedSavedId
        };
      } else if (paymentOption === 'new_card') {
        payload = {
          methodType: 'card',
          cardData: {
            name: newCardHolder,
            number: newCardNumber,
            exp: newCardExp,
            cvc: newCardCvc,
            saveCard: saveNewCard
          }
        };
      } else {
        payload = {
          methodType: 'paypal',
          paypalEmail: paypalEmail.trim() || undefined,
          savePaypal: savePaypalAccount
        };
      }

      if (paymentOption === 'paypal') {
        window.open(`https://paypal.me/OffertGames/${currentTierConfig.priceEur}EUR`, '_blank');
      }

      const res = await processDonation(selectedTier, payload);
      if (res.success) {
        setSuccessMessage(res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSuccessMessage(null);
    closeDonationModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0f1520] border border-[#233147] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1d293d] bg-[#141c2b]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Award className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">
                Apoyar OffertGames
              </h2>
              <p className="text-xs text-gray-400">
                Elige tu nivel de donación (Pago único) y obtén tu medallita oficial permanente
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1f2c42] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {successMessage ? (
            /* Success State */
            <div className="text-center py-8 px-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">¡Gracias por tu apoyo!</h3>
                <p className="text-sm text-gray-300 max-w-md mx-auto">{successMessage}</p>
              </div>

              {/* Awarded medal badge preview */}
              <div className="inline-flex items-center gap-2 p-3 bg-[#16202f] border border-[#273852] rounded-2xl shadow-inner mt-2">
                <span className="text-xs text-gray-400">Tu insignia permanente:</span>
                <DonorBadge tier={selectedTier} size="md" showLabel={true} />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleClose}
                  className="bg-[#06b6d4] hover:bg-[#0891b2] text-black font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Entendido y Continuar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tiers Grid - Coloreados cada uno con el color de su medalla */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    1. Selecciona tu medalla (Pago único):
                  </label>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Sin suscripciones ni cuotas mensuales
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {(Object.keys(DONOR_TIERS_CONFIG) as DonorTier[]).map((tierKey) => {
                    const tier = DONOR_TIERS_CONFIG[tierKey];
                    const isSelected = selectedTier === tierKey;

                    return (
                      <div
                        key={tierKey}
                        onClick={() => setSelectedTier(tierKey)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${tier.cardClass} ${
                          isSelected ? tier.cardSelectedClass : 'opacity-90 hover:opacity-100 hover:scale-[1.008]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <DonorBadge tier={tierKey} size="sm" showLabel={true} />
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-white drop-shadow-sm">
                              {tier.priceEur}€
                            </span>
                            <span className="block text-[9px] uppercase font-bold tracking-tight opacity-90 text-white/80">
                              Pago único
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] mt-2.5 leading-relaxed font-medium text-white/90 drop-shadow-sm">
                          {tierKey === 'bronce' && 'Medalla Bronce cobriza permanente junto a tu nombre.'}
                          {tierKey === 'plata' && 'Medalla de Plata brillante para miembros destacados.'}
                          {tierKey === 'oro' && 'Medalla de Oro resplandeciente, mecenas de la comunidad.'}
                          {tierKey === 'diamante' && 'Medalla Diamante exclusiva, máximo reconocimiento del servidor.'}
                        </p>

                        {isSelected && (
                          <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-white text-black shadow-lg">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="bg-[#141b27] border border-[#233247] rounded-2xl p-4 space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Vista previa de tu nombre en la plataforma:
                </span>
                <div className="flex items-center gap-3 bg-[#0d131d] p-3 rounded-xl border border-[#1b2636]">
                  <img
                    src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full object-cover border border-[#26374d]"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-white">
                      {currentUser?.name || 'Tu Nombre'}
                    </span>
                    <DonorBadge tier={selectedTier} size="sm" showLabel={true} />
                  </div>
                </div>
              </div>

              {/* Amazon / SaaS Style Payment Gateway */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-1 border-t border-[#1e293b]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>2. Pasarela de Pago Oficial:</span>
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        closeDonationModal();
                        openProfileModal('pagos');
                      }}
                      className="text-[11px] text-[#38bdf8] hover:underline font-bold"
                    >
                      Mis Métodos Guardados
                    </button>
                    <a
                      href="https://paypal.me/OffertGames"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                      title="Abrir perfil oficial de PayPal.Me"
                    >
                      <span>paypal.me/OffertGames</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Payment Option Selector Pills */}
                <div className="grid grid-cols-3 gap-2">
                  {savedPaymentMethods.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentOption('saved')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        paymentOption === 'saved'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                          : 'bg-[#121924] border-[#1e293b] text-gray-400 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate">Guardado (1-Clic)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPaymentOption('paypal')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      paymentOption === 'paypal'
                        ? 'bg-[#ffc439]/20 border-[#ffc439] text-[#ffc439] shadow-sm'
                        : 'bg-[#121924] border-[#1e293b] text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="font-black italic">PP</span>
                    <span>PayPal Directo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('new_card')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      paymentOption === 'new_card'
                        ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8] shadow-sm'
                        : 'bg-[#121924] border-[#1e293b] text-gray-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Tarjeta Nueva</span>
                  </button>
                </div>

                {/* Option 1: Saved Payment Method (1-Click) */}
                {paymentOption === 'saved' && (
                  <div className="space-y-2 bg-[#121924] p-3.5 rounded-2xl border border-[#233349]">
                    <span className="text-[11px] text-gray-400 font-medium block">
                      Selecciona una tarjeta o cuenta guardada en tu perfil:
                    </span>
                    <div className="space-y-2">
                      {savedPaymentMethods.map((pm) => (
                        <label
                          key={pm.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            selectedSavedId === pm.id
                              ? 'bg-[#172233] border-[#38bdf8] text-white'
                              : 'bg-[#0f1520] border-[#1f2b3c] text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="savedMethod"
                              checked={selectedSavedId === pm.id}
                              onChange={() => setSelectedSavedId(pm.id)}
                              className="text-[#38bdf8] focus:ring-0"
                            />
                            <div className="text-xs font-bold">
                              {pm.type === 'card' ? pm.cardNumberMasked : pm.paypalEmail}
                            </div>
                          </div>

                          <span className="text-[10px] text-gray-400 font-mono">
                            {pm.type === 'card' ? `Exp: ${pm.expiryMonth}/${pm.expiryYear}` : 'PayPal'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Option 2: PayPal Direct */}
                {paymentOption === 'paypal' && (
                  <div className="space-y-3 bg-[#121924] p-3.5 rounded-2xl border border-[#233349]">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-gray-400 block">
                          Correo electrónico de tu cuenta PayPal:
                        </label>
                        <span className="text-[10px] text-amber-300 font-mono">Receptor oficial: paypal.me/OffertGames</span>
                      </div>
                      <input
                        type="email"
                        required
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="w-full bg-[#0d131d] border border-[#243349] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="savePaypal"
                        checked={savePaypalAccount}
                        onChange={(e) => setSavePaypalAccount(e.target.checked)}
                        className="rounded bg-[#0d131d] border-[#243349] text-[#38bdf8] focus:ring-0"
                      />
                      <label htmlFor="savePaypal" className="text-xs text-gray-300">
                        Guardar cuenta PayPal en mis métodos de pago para futuras donaciones
                      </label>
                    </div>
                  </div>
                )}

                {/* Option 3: New Card */}
                {paymentOption === 'new_card' && (
                  <div className="space-y-3 bg-[#121924] p-3.5 rounded-2xl border border-[#233349]">
                    <div>
                      <label className="text-[11px] text-gray-400 mb-1 block">Número de Tarjeta:</label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        value={newCardNumber}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                          setNewCardNumber(v);
                        }}
                        placeholder="4242 •••• •••• 4242"
                        className="w-full bg-[#0d131d] border border-[#233349] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-400 mb-1 block">Titular:</label>
                        <input
                          type="text"
                          required
                          value={newCardHolder}
                          onChange={(e) => setNewCardHolder(e.target.value)}
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
                            value={newCardExp}
                            onChange={(e) => {
                              let v = e.target.value.replace(/\D/g, '');
                              if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                              setNewCardExp(v);
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
                            value={newCardCvc}
                            onChange={(e) => setNewCardCvc(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full bg-[#0d131d] border border-[#233349] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#38bdf8]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="saveNewCard"
                        checked={saveNewCard}
                        onChange={(e) => setSaveNewCard(e.target.checked)}
                        className="rounded bg-[#0d131d] border-[#243349] text-[#38bdf8] focus:ring-0"
                      />
                      <label htmlFor="saveNewCard" className="text-xs text-gray-300">
                        Guardar esta tarjeta en mis métodos de pago (Estilo Amazon)
                      </label>
                    </div>
                  </div>
                )}

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-[#ffc439] hover:bg-[#f4bb30] text-[#111827] font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Procesando pago seguro...</span>
                      </div>
                    ) : paymentOption === 'saved' ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                        <span>Pagar {currentTierConfig.priceEur}€ con 1-Clic ({currentTierConfig.name})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-sans italic font-black text-blue-900 text-base">Pay</span>
                        <span className="font-sans italic font-black text-sky-600 text-base">Pal</span>
                        <span className="font-bold text-gray-900 ml-1">
                          — Donar {currentTierConfig.priceEur}€ (Pago único - {currentTierConfig.name})
                        </span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Security Guarantee */}
                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Transacción protegida hacia paypal.me/OffertGames. Pago único y medalla permanente.</span>
                </div>
              </form>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
