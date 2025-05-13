
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a common sans-serif
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/components/ui/sidebar'; // Import SidebarProvider
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans', // Still assign to --font-geist-sans for compatibility if needed elsewhere
});

// If Geist Mono is specifically needed, keep it, otherwise remove
// import { Geist_Mono } from 'next/font/google';
// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'Habitual',
  description: 'Track your habits and build consistency.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
          // geistMono.variable // Include if Geist Mono is used
        )}
      >
        <SidebarProvider defaultOpen={true}> {/* Wrap content with SidebarProvider */}
          {children}
        </SidebarProvider>
        <Toaster /> {/* Add Toaster for notifications */}
      </body>
    </html>
  );
}
