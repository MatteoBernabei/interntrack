import React, { useState } from 'react';
import { PlatformName } from '../types/internTrack';

interface CompanyLogoProps {
  company: string;
  domain?: string;
  url?: string;
  platform?: PlatformName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showPlatformBadge?: boolean;
  customLogoUrl?: string;
  allowAddLogo?: boolean;
  onAddLogo?: () => void;
}

// Map popular platform names to colors and initials
const PLATFORM_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  LinkedIn: { label: 'in', bg: 'bg-[#0077b5]', text: 'text-white' },
  Indeed: { label: 'ind', bg: 'bg-[#2164f3]', text: 'text-white' },
  Joinrs: { label: 'j', bg: 'bg-[#ff5722]', text: 'text-white' },
  CareerOS: { label: 'os', bg: 'bg-[#6366f1]', text: 'text-white' },
  Flexa: { label: 'fl', bg: 'bg-[#10b981]', text: 'text-white' },
  'Sito aziendale': { label: '🌐', bg: 'bg-slate-700', text: 'text-white' },
  Altro: { label: '•', bg: 'bg-slate-500', text: 'text-white' },
};

// Common company domains for instant crisp logos
const KNOWN_DOMAINS: Record<string, string> = {
  'bending spoons': 'bendingspoons.com',
  'scalapay': 'scalapay.com',
  'personio': 'personio.com',
  'doctolib': 'doctolib.fr',
  'revolut': 'revolut.com',
  'satispay': 'satispay.com',
  'casavo': 'casavo.com',
  'celonis': 'celonis.com',
  'mistral ai': 'mistral.ai',
  'deliveroo': 'deliveroo.com',
  'klarna': 'klarna.com',
  'alan': 'alan.com',
  'stripe': 'stripe.com',
  'spotify': 'spotify.com',
  'google': 'google.com',
  'amazon': 'amazon.com',
  'meta': 'meta.com',
  'microsoft': 'microsoft.com',
  'apple': 'apple.com',
  'notion': 'notion.so',
  'figma': 'figma.com',
  'n26': 'n26.com',
  'trade republic': 'traderepublic.com',
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  company,
  domain: explicitDomain,
  url,
  platform,
  size = 'md',
  className = '',
  showPlatformBadge = true,
  customLogoUrl,
  allowAddLogo = false,
  onAddLogo,
}) => {
  const [hasError, setHasError] = useState(false);

  // Extract or guess clean domain
  const getDomain = (): string => {
    if (explicitDomain && explicitDomain.trim()) {
      return explicitDomain.trim().replace(/^https?:\/\//, '').replace('www.', '').split('/')[0];
    }

    const cleanComp = (company || '').trim().toLowerCase();
    if (KNOWN_DOMAINS[cleanComp]) return KNOWN_DOMAINS[cleanComp];

    if (url) {
      try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        const hostname = parsed.hostname.replace('www.', '');

        if (
          !hostname.includes('linkedin.') &&
          !hostname.includes('indeed.') &&
          !hostname.includes('glassdoor.') &&
          !hostname.includes('joinrs.')
        ) {
          if (hostname.includes('lever.co') || hostname.includes('greenhouse.io') || hostname.includes('workable.com')) {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts[0]) return `${parts[0]}.com`;
          }
          return hostname;
        }
      } catch {
        // Fallback below
      }
    }

    const sanitized = cleanComp.replace(/[^a-z0-9]/g, '');
    return sanitized ? `${sanitized}.com` : '';
  };

  const domain = getDomain();
  const resolvedLogoUrl = customLogoUrl || (!hasError && domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : '');

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base font-bold',
  }[size];

  const badgeSizeClasses = {
    xs: 'w-2.5 h-2.5 text-[7px]',
    sm: 'w-3 h-3 text-[8px]',
    md: 'w-3.5 h-3.5 text-[9px]',
    lg: 'w-4 h-4 text-[10px]',
    xl: 'w-5 h-5 text-xs',
  }[size];

  const initials = (company || 'IT')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'EL';

  const platformInfo = platform ? PLATFORM_BADGES[platform] : null;

  return (
    <div className={`relative inline-flex flex-col items-center shrink-0 ${className}`}>
      <div
        onClick={onAddLogo}
        className={`${sizeClasses} rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-center overflow-hidden transition-all ${
          onAddLogo ? 'cursor-pointer hover:ring-2 hover:ring-blue-500/40' : ''
        }`}
        title={`Logo: ${company}`}
      >
        {resolvedLogoUrl && !hasError ? (
          <img
            src={resolvedLogoUrl}
            alt={`Logo ${company}`}
            loading="lazy"
            onError={() => setHasError(true)}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center">
            {initials}
          </div>
        )}
      </div>

      {/* '+' button underneath if no custom logo is in database */}
      {allowAddLogo && !customLogoUrl && onAddLogo && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onAddLogo();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onAddLogo();
            }
          }}
          className="mt-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shadow-xs hover:scale-110 transition-transform cursor-pointer select-none leading-none"
          title={`Aggiungi foto per ${company}`}
        >
          +
        </span>
      )}

      {/* Tiny Platform badge in corner */}
      {showPlatformBadge && platformInfo && (
        <span
          title={`Piattaforma: ${platform}`}
          className={`absolute -bottom-1 -right-1 ${badgeSizeClasses} rounded-full ${platformInfo.bg} ${platformInfo.text} flex items-center justify-center font-bold shadow-xs border border-white dark:border-slate-900 leading-none select-none`}
        >
          {platformInfo.label}
        </span>
      )}
    </div>
  );
};

