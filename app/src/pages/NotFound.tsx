import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white pt-[72px] page-enter flex flex-col items-center justify-center px-6 text-center">
      <MapPin size={64} className="text-[#FF6B35] mb-6" />
      <h1 className="text-6xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
        404
      </h1>
      <p className="mt-4 text-lg text-[#8B7E74]">
        This page doesn't exist in the neighbourhood.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/"
          className="px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors"
        >
          Back Home
        </Link>
        <Link
          to="/services"
          className="px-6 py-3 border border-[#1A1A1A] text-[#1A1A1A] text-sm font-medium rounded-[10px] hover:bg-[#F3EDE5] transition-colors"
        >
          Browse Services
        </Link>
      </div>
    </div>
  );
}
