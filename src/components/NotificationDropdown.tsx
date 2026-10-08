import React, { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, CheckCheck, Trash2, ExternalLink, SlidersHorizontal, RefreshCw, ShoppingCart, Tag } from 'lucide-react';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onOpenSettings
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    checkPriceAlertsNow,
    isCheckingAlerts,
    openAuthModal,
    currentUser
  } = useApp();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl bg-[#121822] border border-[#233145] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#233145] bg-[#161f2c] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#38bdf8]" />
          <h3 className="text-sm font-bold text-white">Avisos de precios</h3>
          {unreadNotificationsCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-[#f59e0b] text-black">
              {unreadNotificationsCount} nuevos
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllNotificationsAsRead}
                title="Marcar todos como leídos"
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1f2937] transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearAllNotifications}
                title="Borrar todos los avisos"
                className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            title="Configurar avisos de precios"
            className="p-1.5 text-gray-400 hover:text-[#38bdf8] rounded-lg hover:bg-[#1f2937] transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-[#1e293b]/60">
        {notifications.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#18212e] border border-[#263447] flex items-center justify-center mx-auto text-gray-400">
              <Bell className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-xs text-gray-300 font-medium">No tienes avisos de precios todavía</p>
            <p className="text-[11px] text-gray-400 leading-relaxed max-w-xs mx-auto">
              Configura tu precio máximo deseado y te avisaremos en cuanto un juego baje a ese importe.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] font-bold text-xs border border-[#38bdf8]/30 transition-all"
              >
                Configurar avisos de precio
              </button>
            </div>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => markNotificationAsRead(notif.id)}
              className={`p-3.5 transition-colors flex gap-3 items-start relative cursor-pointer ${
                notif.read ? 'bg-transparent hover:bg-[#18212e]/50' : 'bg-[#38bdf8]/5 hover:bg-[#38bdf8]/10'
              }`}
            >
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-[#38bdf8] absolute top-4 left-2 shadow-[0_0_8px_#38bdf8]" />
              )}

              {/* Game Cover */}
              <img
                src={notif.gameCover || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=120&q=80'}
                alt={notif.gameTitle}
                className="w-12 h-16 rounded-lg object-cover border border-[#263447] shrink-0 shadow-md ml-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=120&q=80';
                }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-[#f59e0b] flex items-center gap-1 uppercase tracking-wider">
                    <Tag className="w-3 h-3" />
                    {notif.storeName}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs font-bold text-white line-clamp-1">
                  {notif.gameTitle}
                </p>

                {/* Message requirement: e.g. "Elden Ring ha bajado a menos de 20 €" */}
                <p className="text-xs text-[#38bdf8] font-semibold">
                  {notif.message}
                </p>

                {/* Price pill & Buy button */}
                <div className="pt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-emerald-400">
                      {notif.currentPrice.toFixed(2)} €
                    </span>
                    {notif.regularPrice && notif.regularPrice > notif.currentPrice && (
                      <span className="text-[10px] text-gray-400 line-through">
                        {notif.regularPrice.toFixed(2)} €
                      </span>
                    )}
                  </div>

                  <a
                    href={notif.buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-all hover:scale-102"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    <span>Comprar</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-[#233145] bg-[#161f2c] flex items-center justify-between gap-2">
        <button
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="text-xs text-gray-300 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>Ajustes de avisos</span>
        </button>

        <button
          onClick={() => checkPriceAlertsNow()}
          disabled={isCheckingAlerts}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#273549] text-xs font-bold text-gray-200 border border-[#2b3a4f] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 text-[#38bdf8] ${isCheckingAlerts ? 'animate-spin' : ''}`} />
          <span>{isCheckingAlerts ? 'Comprobando...' : 'Comprobar ahora'}</span>
        </button>
      </div>
    </div>
  );
};
