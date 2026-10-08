import React, { useState, useEffect } from 'react';
import { 
  Target, 
  DollarSign, 
  TrendingUp, 
  Share2, 
  Download, 
  ShieldCheck, 
  Users, 
  Gamepad2, 
  Sparkles, 
  RefreshCw, 
  Database,
  ExternalLink,
  Flame,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  Crosshair,
  Compass
} from 'lucide-react';
import { AudienceAdProfile } from '../types/game';
import { 
  fetchAudienceProfilesFromFirestore, 
  exportAudienceJson, 
  exportAudienceCsv,
  trackUserInteraction,
  getStoredCookieConsent
} from '../services/adTrackingService';
import { useApp } from '../context/AppContext';

export const AdminAdTechView: React.FC = () => {
  const { games, currentUser, showToast } = useApp();
  const [profiles, setProfiles] = useState<AudienceAdProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<AudienceAdProfile | null>(null);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await fetchAudienceProfilesFromFirestore();
      setProfiles(data);
      if (data.length > 0) setSelectedProfile(data[0]);
    } catch {
      showToast('Error cargando perfiles de audiencia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Aggregated analytics
  const totalProfiles = profiles.length;
  const consentedProfiles = profiles.filter(p => p.consentGiven).length;
  const consentRate = totalProfiles > 0 ? Math.round((consentedProfiles / totalProfiles) * 100) : 100;
  
  // Calculate top genre distribution across entire database
  const genreTotals: Record<string, number> = {};
  profiles.forEach(p => {
    p.preferredGenres?.forEach(g => {
      genreTotals[g.genre] = (genreTotals[g.genre] || 0) + g.weight;
    });
  });

  const totalWeight = Object.values(genreTotals).reduce((a, b) => a + b, 0) || 1;
  const sortedGenres = Object.entries(genreTotals)
    .map(([genre, weight]) => ({
      genre,
      weight,
      percentage: Math.round((weight / totalWeight) * 100)
    }))
    .sort((a, b) => b.weight - a.weight);

  const averageCpm = profiles.length > 0
    ? (profiles.reduce((acc, p) => acc + (p.estimatedCpmEur || 4.5), 0) / profiles.length).toFixed(2)
    : '5.20';

  const estimatedMarketValue = (Number(averageCpm) * (totalProfiles * 250) / 1000).toFixed(2);

  // Quick Simulation Test
  const handleSimulateGenre = async (genreName: string) => {
    setSimulating(true);
    try {
      const mockGame = games.find(g => 
        genreName === 'Shooters' 
          ? (g.title.toLowerCase().includes('doom') || g.title.toLowerCase().includes('cyberpunk') || g.categories?.includes('Acción'))
          : genreName === 'Estrategia'
            ? (g.title.toLowerCase().includes('civilization') || g.title.toLowerCase().includes('crusader') || g.categories?.includes('Estrategia'))
            : (g.title.toLowerCase().includes('elden') || g.categories?.includes('RPG'))
      ) || games[0];

      await trackUserInteraction({
        game: mockGame,
        action: 'wishlist',
        user: currentUser,
        allWishlistGames: games.slice(0, 3)
      });

      showToast(`🎯 Acción simulada: Interés añadido en "${genreName}" sincronizado con Firestore`);
      await loadProfiles();
    } catch {
      showToast('Error en la simulación');
    } finally {
      setSimulating(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.cookieId.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (p.userEmail && p.userEmail.toLowerCase().includes(searchFilter.toLowerCase())) ||
    p.topGenre.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.commercialSegment.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* 1. Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#121c29] via-[#101824] to-[#151c27] border border-[#233549] shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 bottom-0 w-60 h-60 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#22d3ee] text-xs font-bold uppercase tracking-wider">
              <Share2 className="w-3.5 h-3.5" />
              <span>Base de Datos de Cookies & AdTech Monetization</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Segmentación de Audiencia y Venta de Datos de Anuncios</span>
            </h2>
            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
              Monetización basada en cookies de primera parte: capturamos los <strong>géneros favoritos (Shooters, Estrategia, RPG...)</strong> y videojuegos guardados por los usuarios para empaquetar segmentos de audiencia cualificados comercializables con redes de publicidad programática de terceros (Google AdX, The Trade Desk, Unity Ads).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => exportAudienceJson(profiles)}
              className="py-2.5 px-4 rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON (IAB)</span>
            </button>

            <button
              onClick={() => exportAudienceCsv(profiles)}
              className="py-2.5 px-4 rounded-xl bg-[#182332] hover:bg-[#202e42] text-white border border-[#2a3c52] font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV (DSPs)</span>
            </button>

            <button
              onClick={loadProfiles}
              disabled={loading}
              className="p-2.5 rounded-xl bg-[#182332] hover:bg-[#202e42] text-gray-300 hover:text-white border border-[#2a3c52] transition-colors cursor-pointer disabled:opacity-50"
              title="Recargar perfiles de Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Metric 1: Profiles */}
        <div className="p-4 rounded-xl bg-[#121a24] border border-[#202d3e] space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Perfiles en Firestore</span>
            <Users className="w-4 h-4 text-[#06b6d4]" />
          </div>
          <div className="text-2xl font-black text-white">{totalProfiles}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3 h-3" />
            <span>{consentRate}% con consentimiento RGPD</span>
          </div>
        </div>

        {/* Metric 2: Top Genre */}
        <div className="p-4 rounded-xl bg-[#121a24] border border-[#202d3e] space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Género Líder</span>
            <Crosshair className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="text-2xl font-black text-[#f59e0b] truncate">
            {sortedGenres[0]?.genre || 'Shooters'}
          </div>
          <div className="text-[11px] text-gray-400">
            {sortedGenres[0]?.percentage || 45}% de la afinidad total
          </div>
        </div>

        {/* Metric 3: CPM */}
        <div className="p-4 rounded-xl bg-[#121a24] border border-[#202d3e] space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>CPM Medio Estimado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{averageCpm} €</div>
          <div className="text-[11px] text-gray-400">
            Tarifa por cada 1.000 impresiones
          </div>
        </div>

        {/* Metric 4: Valuation */}
        <div className="p-4 rounded-xl bg-[#121a24] border border-[#202d3e] space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Valor Comercial Mensual</span>
            <TrendingUp className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="text-2xl font-black text-[#38bdf8]">{estimatedMarketValue} €</div>
          <div className="text-[11px] text-gray-400">
            Potencial de monetización directa
          </div>
        </div>

      </div>

      {/* 3. Genre Affinity Breakdown & Ad Buyers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Genre Affinity Progress */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#121a24] border border-[#202d3e] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f2b3a] pb-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#06b6d4]" />
                <span>Segmentación por Géneros de Videojuegos para Anuncios</span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Afinidad acumulada por los usuarios al marcar favoritos, buscar y activar avisos de precio.
              </p>
            </div>
            <span className="text-[10px] bg-[#06b6d4]/10 text-[#06b6d4] px-2 py-0.5 rounded font-bold uppercase">
              AdTech Segments
            </span>
          </div>

          <div className="space-y-3">
            {sortedGenres.slice(0, 5).map((item, idx) => {
              const barColor = 
                item.genre === 'Shooters' ? 'bg-[#ef4444]' :
                item.genre === 'Estrategia' ? 'bg-[#3b82f6]' :
                item.genre === 'RPG' ? 'bg-[#a855f7]' :
                item.genre === 'Deportes & Carreras' ? 'bg-[#10b981]' : 'bg-[#f59e0b]';

              return (
                <div key={item.genre} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="text-gray-500 font-mono text-[10px]">#{idx + 1}</span>
                      <span>{item.genre}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono text-[11px]">{item.weight} pts</span>
                      <span className="font-bold text-white">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#1b2533] overflow-hidden">
                    <div 
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(item.percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Real-Time Simulator */}
          <div className="pt-3 border-t border-[#1f2b3a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span>Simulador de Perfilado en Tiempo Real (Probar Firestore)</span>
              </span>
              <span className="text-[10px] text-gray-500">Haz clic para sumar puntos al perfil</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSimulateGenre('Shooters')}
                disabled={simulating}
                className="py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Crosshair className="w-3 h-3 text-red-400" />
                <span>+ Favorito Shooter (Doom / CoD)</span>
              </button>

              <button
                onClick={() => handleSimulateGenre('Estrategia')}
                disabled={simulating}
                className="py-1.5 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Compass className="w-3 h-3 text-blue-400" />
                <span>+ Favorito Estrategia (Civ VII / Total War)</span>
              </button>

              <button
                onClick={() => handleSimulateGenre('RPG')}
                disabled={simulating}
                className="py-1.5 px-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Gamepad2 className="w-3 h-3 text-purple-400" />
                <span>+ Favorito RPG (Elden Ring)</span>
              </button>
            </div>
          </div>

        </div>

        {/* Targeted Ad Networks / Data Buyers */}
        <div className="p-5 rounded-2xl bg-[#121a24] border border-[#202d3e] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#10b981]" />
              <span>Redes Publicitarias Receptoras</span>
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Compañías asociadas que consumen estos segmentos para colocar anuncios en YouTube, Twitch, Instagram y webs de videojuegos:
            </p>

            <div className="space-y-2 pt-1">
              {[
                { name: 'Google AdSense & AdX', tag: 'Audiencias IAB', cpm: '5.80 €' },
                { name: 'The Trade Desk (DSP)', tag: 'Programática RTB', cpm: '6.40 €' },
                { name: 'Unity Ads Gaming Network', tag: 'In-Game Ads', cpm: '4.90 €' },
                { name: 'Criteo Commerce Media', tag: 'Retargeting Deals', cpm: '5.20 €' },
                { name: 'Xandr / Microsoft Ads', tag: 'Xbox & Windows', cpm: '5.60 €' }
              ].map(buyer => (
                <div key={buyer.name} className="p-2.5 rounded-xl bg-[#16202c] border border-[#233142] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white text-xs">{buyer.name}</p>
                    <p className="text-[10px] text-gray-400">{buyer.tag}</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {buyer.cpm}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[11px] text-cyan-300">
            <strong>Cumplimiento Normativo:</strong> Los datos se anonimizan mediante identificadores hash de cookie conforme al estándar IAB TCF 2.2.
          </div>
        </div>

      </div>

      {/* 4. Real-time Audience Profiles Table from Firestore */}
      <div className="p-5 rounded-2xl bg-[#121a24] border border-[#202d3e] space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f2b3a] pb-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#f59e0b]" />
              <span>Registros en Vivo de Cloud Firestore (`audience_ad_profiles`)</span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Perfiles generados por usuarios con cookies activas y preferencias registradas.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Filtrar por género o ID..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-[#16212e] border border-[#26374a] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#172230] text-[11px] text-gray-400 uppercase font-mono border-b border-[#233347]">
              <tr>
                <th className="py-2.5 px-3">Cookie / Usuario</th>
                <th className="py-2.5 px-3">Género Principal</th>
                <th className="py-2.5 px-3">Segmento Comercial</th>
                <th className="py-2.5 px-3">Consentimiento</th>
                <th className="py-2.5 px-3">CPM Est.</th>
                <th className="py-2.5 px-3">Última Actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2a38]">
              {filteredProfiles.map((p) => {
                const genreBadgeColor = 
                  p.topGenre === 'Shooters' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                  p.topGenre === 'Estrategia' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                  p.topGenre === 'RPG' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/30';

                return (
                  <tr 
                    key={p.id}
                    onClick={() => setSelectedProfile(p)}
                    className="hover:bg-[#182332] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3">
                      <div className="font-mono text-white text-[11px] truncate max-w-[160px]">
                        {p.userEmail || p.cookieId}
                      </div>
                      {p.userName && (
                        <div className="text-[10px] text-gray-400">{p.userName}</div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${genreBadgeColor}`}>
                        {p.topGenre}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-white text-xs font-medium truncate max-w-[240px]">
                        {p.commercialSegment}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono truncate max-w-[240px]">
                        {p.iabCategories?.[1] || p.iabCategories?.[0]}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {p.consentGiven ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Opt-in Activo</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          Rechazado
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {p.estimatedCpmEur.toFixed(2)} €
                    </td>

                    <td className="py-3 px-3 text-[11px] text-gray-400">
                      {new Date(p.lastActive).toLocaleDateString()} {new Date(p.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
