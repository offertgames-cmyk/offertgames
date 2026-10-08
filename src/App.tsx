import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { CatalogView } from './components/CatalogView';
import { GameDetailView } from './components/GameDetailView';
import { CommunityView } from './components/CommunityView';
import { AlertsView } from './components/AlertsView';
import { AuthModal } from './components/AuthModal';
import { PriceAlertModal } from './components/PriceAlertModal';
import { DonationModal } from './components/DonationModal';
import { ProfileModal } from './components/ProfileModal';
import { CustomerSupportModal } from './components/CustomerSupportModal';
import { CookieBanner } from './components/CookieBanner';
import { MobileSimulator } from './components/mobile/MobileSimulator';
import { AiChatbot } from './components/AiChatbot';
import { CheckCircle, Award } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab, selectedGame, toastMessage, viewMode, openDonationModal } = useApp();

  const mainContent = selectedGame ? (
    <GameDetailView game={selectedGame} />
  ) : (
    <>
      {activeTab === 'ofertas' && <HomeView />}
      {activeTab === 'juegos' && <CatalogView />}
      {activeTab === 'comunidades' && <CommunityView />}
      {activeTab === 'avisos' && <AlertsView />}
    </>
  );

  return (
    <div className="min-h-screen bg-[#0b0e14] text-gray-100 flex flex-col font-sans selection:bg-[#06b6d4] selection:text-black">
      {viewMode === 'mobile' ? (
        <MobileSimulator>
          {mainContent}
        </MobileSimulator>
      ) : (
        <>
          {/* Top Navigation Bar */}
          <Header />

          {/* Main Content Router */}
          <div className="flex-1 pb-16">
            {mainContent}
          </div>

          {/* Footer */}
          <footer className="border-t border-[#18212e] py-6 px-4 text-center text-xs text-gray-500 bg-[#0c1017]">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
                <span className="font-extrabold text-white text-sm">OFFERTGAMES</span>
                <span>— Tu portal definitivo de ofertas de videojuegos y comunidad.</span>
              </div>
              <div className="flex items-center gap-4 text-gray-400 text-[11px]">
                <button
                  onClick={openDonationModal}
                  className="text-amber-400 hover:text-amber-300 transition flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Apoyar la web (Donar)</span>
                </button>
                <span>Precios sincronizados con Steam, Epic Games, PlayStation y Xbox.</span>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('offertgames_reopen_cookie_modal'))}
                  className="text-gray-400 hover:text-cyan-400 underline transition cursor-pointer"
                >
                  Privacidad y Cookies
                </button>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Global Modals & Privacy Banner */}
      <AuthModal />
      <PriceAlertModal />
      <DonationModal />
      <ProfileModal />
      <CustomerSupportModal />
      <CookieBanner />

      {/* Asistente IA de OffertGames */}
      <AiChatbot />

      {/* Toast Notification Pill */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#16202c] border border-[#06b6d4]/40 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle className="w-4 h-4 text-[#22d3ee] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
