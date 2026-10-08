import React from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import { DonorTier } from '../types/game';

interface DonorBadgeProps {
  tier?: DonorTier | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

export interface TierConfig {
  name: string;
  priceEur: number;
  monthlyEur: number;
  badgeClass: string;
  cardClass: string;
  cardSelectedClass: string;
  iconClass: string;
  textColor: string;
  borderGlow: string;
  ribbonColor: string;
}

export const DONOR_TIERS_CONFIG: Record<DonorTier, TierConfig> = {
  bronce: {
    name: 'Donador Bronce',
    priceEur: 2,
    monthlyEur: 2,
    badgeClass: 'bg-amber-950/80 text-amber-300 border-[#b45309] hover:border-amber-400 shadow-[0_0_8px_rgba(180,83,9,0.35)]',
    cardClass: 'bg-gradient-to-br from-[#451a03] via-[#78350f] to-[#291003] border-[#b45309]/80 text-amber-100 hover:border-amber-400 shadow-[0_4px_16px_rgba(180,83,9,0.25)]',
    cardSelectedClass: 'ring-2 ring-amber-400 border-amber-300 shadow-[0_0_25px_rgba(217,119,6,0.6)] scale-[1.01]',
    iconClass: 'text-amber-400',
    textColor: 'text-amber-200',
    borderGlow: 'rgba(217,119,6,0.4)',
    ribbonColor: '#b45309'
  },
  plata: {
    name: 'Donador Plata',
    priceEur: 5,
    monthlyEur: 5,
    badgeClass: 'bg-slate-800/90 text-slate-100 border-[#94a3b8] hover:border-slate-200 shadow-[0_0_10px_rgba(203,213,225,0.4)]',
    cardClass: 'bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] border-[#94a3b8]/80 text-slate-100 hover:border-slate-300 shadow-[0_4px_16px_rgba(148,163,184,0.25)]',
    cardSelectedClass: 'ring-2 ring-slate-300 border-slate-200 shadow-[0_0_25px_rgba(203,213,225,0.6)] scale-[1.01]',
    iconClass: 'text-slate-100',
    textColor: 'text-slate-100',
    borderGlow: 'rgba(203,213,225,0.5)',
    ribbonColor: '#94a3b8'
  },
  oro: {
    name: 'Donador Oro',
    priceEur: 10,
    monthlyEur: 10,
    badgeClass: 'bg-yellow-950/80 text-yellow-300 border-[#eab308] hover:border-yellow-300 shadow-[0_0_14px_rgba(245,158,11,0.5)]',
    cardClass: 'bg-gradient-to-br from-[#713f12] via-[#854d0e] to-[#422006] border-[#eab308] text-yellow-100 hover:border-yellow-300 shadow-[0_4px_20px_rgba(234,179,8,0.35)]',
    cardSelectedClass: 'ring-2 ring-yellow-300 border-yellow-200 shadow-[0_0_30px_rgba(234,179,8,0.7)] scale-[1.01]',
    iconClass: 'text-yellow-300',
    textColor: 'text-yellow-200',
    borderGlow: 'rgba(245,158,11,0.6)',
    ribbonColor: '#eab308'
  },
  diamante: {
    name: 'Donador Diamante',
    priceEur: 20,
    monthlyEur: 20,
    badgeClass: 'bg-cyan-950/90 text-cyan-200 border-[#38bdf8] hover:border-cyan-200 shadow-[0_0_16px_rgba(56,189,248,0.6)]',
    cardClass: 'bg-gradient-to-br from-[#083344] via-[#0e7490] to-[#022c3b] border-[#38bdf8] text-cyan-100 hover:border-cyan-200 shadow-[0_4px_20px_rgba(56,189,248,0.4)]',
    cardSelectedClass: 'ring-2 ring-cyan-300 border-cyan-200 shadow-[0_0_30px_rgba(56,189,248,0.8)] scale-[1.01]',
    iconClass: 'text-cyan-300',
    textColor: 'text-cyan-100',
    borderGlow: 'rgba(56,189,248,0.7)',
    ribbonColor: '#38bdf8'
  }
};

export const DonorBadge: React.FC<DonorBadgeProps> = ({
  tier,
  size = 'sm',
  showLabel = false,
  className = '',
  onClick
}) => {
  if (!tier || !DONOR_TIERS_CONFIG[tier]) return null;

  const config = DONOR_TIERS_CONFIG[tier];

  const sizeClasses = {
    xs: {
      badge: 'px-1 py-0.5 text-[9px] gap-0.5',
      icon: 'w-2.5 h-2.5'
    },
    sm: {
      badge: 'px-1.5 py-0.5 text-[10px] gap-1',
      icon: 'w-3 h-3'
    },
    md: {
      badge: 'px-2 py-1 text-xs gap-1.5',
      icon: 'w-3.5 h-3.5'
    },
    lg: {
      badge: 'px-3 py-1.5 text-sm gap-2',
      icon: 'w-4 h-4'
    }
  }[size];

  return (
    <span
      onClick={onClick}
      title={`${config.name} (${config.priceEur}€ - Pago único) - Patrocinador oficial de OffertGames`}
      className={`inline-flex items-center font-bold rounded-md border tracking-wide select-none transition-all ${config.badgeClass} ${sizeClasses.badge} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <Award className={`${sizeClasses.icon} ${config.iconClass} shrink-0 stroke-[2.4]`} />
      {showLabel ? (
        <span className="font-extrabold uppercase text-[9px] tracking-wider">
          {config.name.replace('Donador ', '')}
        </span>
      ) : (
        <span className="text-[9px] font-black uppercase tracking-tight hidden sm:inline">
          {tier}
        </span>
      )}
    </span>
  );
};
