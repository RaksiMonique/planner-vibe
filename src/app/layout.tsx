import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import { HydrationMarker } from '@/components/shared/hydration-marker';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'Life Planner', template: '%s · Life Planner' },
  description: 'Plan, organise, track and review every area of life in one connected system.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <HydrationMarker />
      </body>
    </html>
  );
}
