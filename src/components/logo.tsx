import { Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return <Hexagon className={cn('text-primary', className)} size={24} />;
}
