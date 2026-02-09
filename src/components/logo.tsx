import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("bg-primary h-9 w-9 flex items-center justify-center rounded-xl shadow-lg shadow-primary/20 transition-transform hover:scale-105", className)}>
        <Scale className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
    </div>
  );
}
