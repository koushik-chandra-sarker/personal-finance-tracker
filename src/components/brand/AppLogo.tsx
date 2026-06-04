import Image from 'next/image';
import { cn } from '@/lib/utils';

export const APP_NAME = 'TakaPilot';
export const APP_TAGLINE = 'Personal Finance Manager';

type AppLogoProps = {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tagline?: string;
  textClassName?: string;
  taglineClassName?: string;
};

const sizeClasses = {
  sm: {
    lockup: 'h-9 w-[8.5rem]',
    mark: 'h-9 w-9',
  },
  md: {
    lockup: 'h-11 w-[10.25rem]',
    mark: 'h-10 w-10',
  },
  lg: {
    lockup: 'h-16 w-[12.75rem]',
    mark: 'h-14 w-14',
  },
};

export default function AppLogo({
  showText = true,
  size = 'md',
  tagline = APP_TAGLINE,
}: AppLogoProps) {
  const classes = sizeClasses[size];
  const imageSrc = showText ? '/logo_horizontal.png' : '/logo_sq.png';
  const imageAlt = showText ? `${APP_NAME} - ${tagline}` : APP_NAME;

  return (
    <div className={cn('relative shrink-0 overflow-hidden', showText ? classes.lockup : classes.mark)}>
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        sizes={showText ? '(max-width: 640px) 136px, 204px' : '56px'}
        className="object-contain"
        priority={size === 'lg'}
      />
    </div>
  );
}
