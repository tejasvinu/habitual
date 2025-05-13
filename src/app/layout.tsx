
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a common sans-serif
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/components/ui/sidebar'; // Import SidebarProvider
import { Toaster } from '@/components/ui/toaster'; // Import Toaster
import { AuthProvider } from '@/context/auth-context'; // Import AuthProvider

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans', 
});

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
        )}
      >
        <AuthProvider> {/* Wrap with AuthProvider */}
          <SidebarProvider defaultOpen={true}>
            {children}
          </SidebarProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
