import { Star } from 'lucide-react';
import type { Review } from '@/data/marketplaceData';

interface ReviewCardProps {
  review: Review;
  className?: string;
}

export default function ReviewCard({ review, className = '' }: ReviewCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F3EDE5] flex items-center justify-center text-sm font-semibold text-[#1A1A1A]">
            {review.avatar}
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">{review.author}</p>
            <p className="text-xs text-[#8B7E74]">{review.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={12}
              className={star <= review.rating ? 'text-[#FACC15] fill-[#FACC15]' : 'text-[#E5E5E5]'}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <p className="mt-3 text-sm leading-relaxed text-[#2D2D2D] line-clamp-4">{review.text}</p>

      {/* Service Tag */}
      <span className="inline-block mt-3 px-2.5 py-1 text-xs font-medium text-[#FF6B35] bg-[#FFF5EE] rounded-md">
        {review.serviceTag}
      </span>
    </div>
  );
}
