import {
  Sparkles, Wrench, Zap, Hammer, Palette, Truck, Leaf, Dog,
  Camera, GraduationCap, Dumbbell, Calendar, Globe, Calculator,
  Heart, Car, Utensils, Sofa, Settings, Activity, Key,
  Shirt, Wrench as Tool, Monitor,
} from 'lucide-react';
import type { Category } from '@/data/marketplaceData';

const iconComponents: Record<string, React.ElementType> = {
  Sparkles, Wrench, Zap, Hammer, Palette, Truck, Leaf, Dog,
  Camera, GraduationCap, Dumbbell, Calendar, Globe, Calculator,
  Heart, Car, Utensils, Sofa, Settings, Activity, Key,
  Shirt, Tool, Monitor,
};

interface CategoryChipProps {
  category: Category;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function CategoryChip({ category, active = false, onClick, className = '' }: CategoryChipProps) {
  const IconComponent = iconComponents[category.icon] || Wrench;

  return (
    <button
      onClick={onClick}
      className={`category-chip ${active ? 'active' : ''} ${className}`}
    >
      <IconComponent size={20} style={{ color: active ? '#FFFFFF' : '#FF6B35' }} />
      <span>{category.name}</span>
      <span style={{ color: active ? 'rgba(255,255,255,0.8)' : '#8B7E74' }}>({category.count})</span>
    </button>
  );
}
