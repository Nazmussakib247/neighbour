import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Heart, ArrowRight } from 'lucide-react';
import type { Service } from '@/data/marketplaceData';
import { categoryVisual, isGenericImage } from '@/lib/categoryVisual';

interface ServiceCardProps {
  service: Service;
  className?: string;
}

export default function ServiceCard({ service, className = '' }: ServiceCardProps) {
  const [favorited, setFavorited] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/profile/${service.provider.id}`}
      className={`group block bg-[#FEFEFE] rounded-2xl border overflow-hidden transition-all duration-350 ${className}`}
      style={{
        borderColor: hovered ? 'rgba(255, 107, 53, 0.2)' : 'rgba(26,26,26,0.06)',
        boxShadow: hovered
          ? '0 24px 60px rgba(0,0,0,0.10)'
          : '0 4px 16px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image Area */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {isGenericImage(service.image) ? (
          (() => {
            const { Icon, from, to } = categoryVisual(service.category);
            return (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2 transition-transform duration-600"
                style={{
                  background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
                  transform: hovered ? 'scale(1.05)' : 'scale(1)',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Icon size={50} strokeWidth={1.5} className="text-white" style={{ opacity: 0.95 }} />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                  {service.category}
                </span>
              </div>
            );
          })()
        ) : (
          <img
            src={service.image}
            alt={service.title}
            className="w-full h-full object-cover transition-transform duration-600"
            style={{
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            loading="lazy"
          />
        )}
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setFavorited(!favorited);
          }}
          className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <Heart
            size={18}
            className={favorited ? 'text-[#FF6B35] fill-[#FF6B35]' : 'text-[rgba(26,26,26,0.3)]'}
          />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5">
        {/* Category Tag */}
        <span
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[#FF6B35]"
        >
          {service.category}
        </span>

        {/* Title */}
        <h3
          className="mt-1 text-lg font-semibold text-[#1A1A1A] leading-snug line-clamp-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {service.title}
        </h3>

        {/* Provider Row */}
        <div className="mt-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <img src={service.provider.avatar} alt={service.provider.name} className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-medium text-[#2D2D2D]">{service.provider.name}</span>
          {service.provider.verified && (
            <span className="w-4 h-4 bg-[#2E5CFF] rounded-full flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
          <span className="flex items-center gap-0.5 ml-auto">
            <Star size={12} className="text-[#FACC15] fill-[#FACC15]" />
            <span className="text-sm font-semibold">{service.rating}</span>
          </span>
        </div>

        {/* Location Row */}
        <div className="mt-2 flex items-center gap-1 text-[#8B7E74]">
          <MapPin size={14} />
          <span className="text-sm">{service.location}</span>
        </div>

        {/* Price Row */}
        <div
          className="mt-4 pt-3 flex items-center justify-between gap-2"
          style={{ borderTop: '1px solid rgba(26,26,26,0.06)' }}
        >
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xs text-[#8B7E74] uppercase tracking-wide">From</span>
            <span className="text-lg font-bold text-[#1A1A1A] tabular-nums">৳{service.price}</span>
            <span className="text-sm text-[#8B7E74] truncate">/{service.priceUnit}</span>
          </div>
          <span className="flex-shrink-0 whitespace-nowrap text-sm font-medium text-[#FF6B35] flex items-center gap-1 group-hover:gap-2 transition-all">
            Book Now <ArrowRight size={14} className="flex-shrink-0" />
          </span>
        </div>
      </div>
    </Link>
  );
}
