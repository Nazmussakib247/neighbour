import {
  Sparkles, Droplets, Zap, Hammer, Palette, Truck, Leaf, Dog, Camera,
  GraduationCap, Dumbbell, Calendar, Wrench, Globe, Heart, Calculator,
  Car, Utensils, Briefcase, type LucideIcon,
} from 'lucide-react';

export interface CategoryVisual {
  Icon: LucideIcon;
  from: string;
  to: string;
}

// Distinct, tasteful gradient + icon for every service category, so cards
// never look identical when a real photo is not available.
const MAP: Record<string, CategoryVisual> = {
  'home cleaning':  { Icon: Sparkles,       from: '#14B8A6', to: '#0D9488' },
  'plumbing':       { Icon: Droplets,       from: '#3B82F6', to: '#2563EB' },
  'electrical':     { Icon: Zap,            from: '#F59E0B', to: '#D97706' },
  'carpentry':      { Icon: Hammer,     from: '#B45309', to: '#92400E' },
  'painting':       { Icon: Palette,    from: '#EC4899', to: '#DB2777' },
  'moving':         { Icon: Truck,      from: '#6366F1', to: '#4F46E5' },
  'gardening':      { Icon: Leaf,       from: '#22C55E', to: '#16A34A' },
  'pet care':       { Icon: Dog,        from: '#F97316', to: '#EA580C' },
  'photography':    { Icon: Camera,     from: '#8B5CF6', to: '#7C3AED' },
  'tutoring':       { Icon: GraduationCap, from: '#06B6D4', to: '#0891B2' },
  'fitness':        { Icon: Dumbbell,   from: '#EF4444', to: '#DC2626' },
  'event planning': { Icon: Calendar,   from: '#0EA5E9', to: '#0284C7' },
  'handyman':       { Icon: Wrench,     from: '#64748B', to: '#475569' },
  'web design':     { Icon: Globe,      from: '#2563EB', to: '#1D4ED8' },
  'massage':        { Icon: Heart,      from: '#F43F5E', to: '#E11D48' },
  'accounting':     { Icon: Calculator, from: '#0D9488', to: '#0F766E' },
  'auto repair':    { Icon: Car,        from: '#475569', to: '#334155' },
  'catering':       { Icon: Utensils,   from: '#D946EF', to: '#C026D3' },
};

const DEFAULT: CategoryVisual = { Icon: Briefcase, from: '#FF6B35', to: '#E85A2A' };

export function categoryVisual(category?: string): CategoryVisual {
  return MAP[(category ?? '').trim().toLowerCase()] ?? DEFAULT;
}

// True when the resolved image is missing or one of the generic placeholder
// photos (the "step-*" stock images that otherwise repeat across every card).
export function isGenericImage(src?: string): boolean {
  return !src || src.includes('/step-');
}
