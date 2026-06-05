import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (val: number) => void;
  className?: string;
}

export default function StarRating({ value, max = 5, size = 16, interactive = false, onChange, className = '' }: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {stars.map(star => (
        <Star
          key={star}
          size={size}
          className={`transition-all ${interactive ? 'cursor-pointer hover:scale-110' : ''}`}
          style={{
            color: star <= Math.round(value) ? 'hsl(var(--secondary))' : 'hsl(var(--border))',
            fill: star <= Math.round(value) ? 'hsl(var(--secondary))' : 'transparent',
          }}
          onClick={() => interactive && onChange?.(star)}
        />
      ))}
    </div>
  );
}
