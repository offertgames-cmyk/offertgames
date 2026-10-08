import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  QrCode, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck,
  Share2,
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { soundFx } from '../../services/soundFx';

interface ApkInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApkInstallModal({ isOpen, onClose }: ApkInstallModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    soundFx.playClick();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('Para instalar directamente en tu Android:\n1. Toca los 3 puntos (⋮) arriba a la derecha de Chrome.\n2. Pulsa "Instalar aplicación" o "Añadir a pantalla de inicio".\n¡Se instalará como una app nativa con su icono!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">App para Móvil / APK</h3>
            <p className="text-xs text-slate-500 font-medium">Instalable en cualquier Android o iOS al instante</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Quick Install Button for Mobile */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-cyan-50/50 border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Instalación Directa
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                PWA Standalone (APK Web)
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Instala la aplicación en tu pantalla de inicio. Se abre a pantalla completa sin barra de navegación, funciona 100% offline y tiene icono propio.
            </p>

            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-98 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Instalar en mi móvil ahora</span>
            </button>
          </div>

          {/* QR Code to scan with phone */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>O abre la app en tu móvil escaneando este QR:</span>
            </div>

            <div className="p-3 bg-white rounded-2xl inline-block mx-auto border border-slate-200 shadow-sm">
              <QRCodeSVG value={currentUrl || 'http://localhost:5173'} size={150} />
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Apunta con la cámara de tu teléfono móvil a este código para abrir la app de inmediato en tu smartphone.
            </p>
          </div>

          {/* Security & Zero Trace Reminder */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Privacidad Total (Sin rastro):</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                La app instalada en tu móvil es completamente autónoma. No requiere inicio de sesión con Google ni acceso a tus correos ni información personal.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
