import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, CheckCircle } from 'lucide-react';
import type { Provider } from '@/data/marketplaceData';

interface ProfessionalCardProps {
  provider: Provider;
  compact?: boolean;
  className?: string;
}

export default function ProfessionalCard({ provider, compact = false, className = '' }: ProfessionalCardProps) {
  const [hovered, setHovered] = useState(false);

  if (compact) {
    return (
      <Link
        to={`/profile/${provider.id}`}
        className={`flex items-center gap-4 p-4 bg-white rounded-xl border border-[rgba(26,26,26,0.06)] transition-all duration-300 ${className}`}
        style={{
          boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
          transform: hovered ? 'translateY(-4px)' : 'none',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-white flex-shrink-0" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <img src={provider.avatar} alt={provider.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-[#1A1A1A] truncate" style={{ fontFamily: 'var(--font-heading)' }}>{provider.name}</h4>
            {provider.verified && <CheckCircle size={16} className="text-[#2E5CFF] flex-shrink-0" />}
          </div>
          <p className="text-sm text-[#8B7E74]">{provider.title} · {provider.yearsExp} years exp</p>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                className={star <= Math.round(provider.rating) ? 'text-[#FACC15] fill-[#FACC15]' : 'text-[#E5E5E5]'}
              />
            ))}
            <span className="text-sm font-semibold text-[#1A1A1A] ml-1">{provider.rating}</span>
            <span className="text-sm text-[#8B7E74]">({provider.reviewCount} reviews)</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden flex flex-col transition-all duration-300 ${className}`}
      style={{
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hero Image */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={provider.heroImage} alt={provider.name} className="w-full h-full object-cover" />
        {provider.topPro && (
          <span className="absolute top-4 left-4 px-3 py-1 bg-[#FF6B35] text-white text-xs font-semibold rounded-full uppercase tracking-wide">
            Top Pro
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-white flex-shrink-0 -mt-14 relative z-10" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <img src={provider.avatar} alt={provider.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>{provider.name}</h3>
              {provider.verified && (
                <span className="w-5 h-5 bg-[#2E5CFF] rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={12} className="text-white" />
                </span>
              )}
            </div>
            <p className="text-sm text-[#8B7E74] mt-0.5">{provider.title}</p>
          </div>
        </div>

        <p className="mt-4 text-[#2D2D2D] text-sm leading-relaxed line-clamp-2">{provider.bio}</p>

        <div className="flex items-center gap-1 mt-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={14}
              className={star <= Math.round(provider.rating) ? 'text-[#FACC15] fill-[#FACC15]' : 'text-[#E5E5E5]'}
            />
          ))}
          <span className="text-sm font-semibold text-[#1A1A1A] ml-1">{provider.rating}</span>
          <span className="text-sm text-[#8B7E74]">({provider.reviewCount} reviews)</span>
        </div>

        <div className="flex flex-wrap gap-1 mt-4">
          {provider.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2.5 py-1 bg-[#FFF5EE] text-[#FF6B35] text-xs font-medium rounded-md">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-auto pt-4" style={{ borderTop: '1px solid rgba(26,26,26,0.06)' }}>
          <div className="flex items-center gap-1 text-[#8B7E74]">
            <MapPin size={14} />
            <span className="text-sm">{provider.location}</span>
          </div>
          <span className="text-base font-semibold text-[#1A1A1A]">
            From ৳{provider.services[0]?.price || 0}/{provider.services[0]?.priceUnit || 'hr'}
          </span>
        </div>

        <Link
          to={`/profile/${provider.id}`}
          className="mt-4 block w-full text-center py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-xl hover:bg-[#FF6B35] transition-colors duration-200"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}
