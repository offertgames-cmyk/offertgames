import React from 'react';
import { useApp } from '../../context/AppContext';
import { Flame, Gamepad2, Users, Bell, User as UserIcon, Shield } from 'lucide-react';
import { ViewTab } from '../../types/game';

export const MobileBottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setSelectedGame, 
    unreadNotificationsCount, 
    openAlertModal, 
    currentUser, 
    openAuthModal,
    showToast,
    openProfileModal
  } = useApp();

  const handleNav = (tab: ViewTab) => {
    setSelectedGame(null);
    setActiveTab(tab);
  };

  const handleUserClick = () => {
    if (!currentUser) {
      openAuthModal('login', 'Inicia sesión para gestionar tu cuenta y favoritos.');
    } else {
      openProfileModal();
    }
  };

  return (
    <nav className="sticky bottom-0 z-40 bg-[#0d131d]/95 backdrop-blur-lg border-t border-[#1f2838] px-2 py-1.5 flex items-center justify-around select-none">
      {/* Tab: Ofertas */}
      <button
        onClick={() => handleNav('ofertas')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
          activeTab === 'ofertas' ? 'text-[#38bdf8]' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all ${activeTab === 'ofertas' ? 'bg-[#38bdf8]/15 scale-110' : ''}`}>
          <Flame className="w-5 h-5" />
        </div>
        <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === 'ofertas' ? 'font-bold text-white' : 'font-medium'}`}>
          Ofertas
        </span>
      </button>

      {/* Tab: Juegos */}
      <button
        onClick={() => handleNav('juegos')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
          activeTab === 'juegos' ? 'text-[#38bdf8]' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all ${activeTab === 'juegos' ? 'bg-[#38bdf8]/15 scale-110' : ''}`}>
          <Gamepad2 className="w-5 h-5" />
        </div>
        <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === 'juegos' ? 'font-bold text-white' : 'font-medium'}`}>
          Juegos
        </span>
      </button>

      {/* Tab: Comunidades */}
      <button
        onClick={() => handleNav('comunidades')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
          activeTab === 'comunidades' ? 'text-[#38bdf8]' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all ${activeTab === 'comunidades' ? 'bg-[#38bdf8]/15 scale-110' : ''}`}>
          <Users className="w-5 h-5" />
        </div>
        <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === 'comunidades' ? 'font-bold text-white' : 'font-medium'}`}>
          Comunidad
        </span>
      </button>

      {/* Tab: Avisos */}
      <button
        onClick={() => handleNav('avisos')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
          activeTab === 'avisos' ? 'text-[#38bdf8]' : 'text-gray-400 hover:text-gray-200'
        } relative`}
      >
        <div className={`p-1 rounded-xl relative transition-all ${activeTab === 'avisos' ? 'bg-[#38bdf8]/15 scale-110' : ''}`}>
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#f59e0b] rounded-full ring-2 ring-[#0d131d] animate-pulse"></span>
          )}
        </div>
        <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === 'avisos' ? 'font-bold text-white' : 'font-medium'}`}>
          Avisos
        </span>
      </button>

      {/* Tab: Admin o Perfil */}
      {currentUser?.role === 'administrador' ? (
        <button
          onClick={() => handleNav('admin')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'admin' ? 'text-amber-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-amber-500/15 scale-110' : ''}`}>
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === 'admin' ? 'font-bold text-amber-300' : 'font-medium'}`}>
            Admin
          </span>
        </button>
      ) : (
        <button
          onClick={handleUserClick}
          className="flex flex-col items-center justify-center flex-1 py-1 transition-all text-gray-400 hover:text-gray-200"
        >
          {currentUser ? (
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
              alt={currentUser.name}
              className="w-6 h-6 rounded-full object-cover border border-[#38bdf8]/60 mt-0.5"
            />
          ) : (
            <div className="p-1 rounded-xl">
              <UserIcon className="w-5 h-5" />
            </div>
          )}
          <span className="text-[10px] mt-0.5 font-medium tracking-tight truncate max-w-[50px]">
            {currentUser ? currentUser.name.split(' ')[0] : 'Entrar'}
          </span>
        </button>
      )}
    </nav>
  );
};
