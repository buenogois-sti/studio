import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("bg-primary text-primary-foreground h-8 w-8 flex items-center justify-center rounded-md", className)}>
        <Scale size={40} />
    </div>
  );
}
