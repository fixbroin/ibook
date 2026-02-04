
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Suspense } from 'react';
import Loading from '@/app/loading';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
    >
      <Suspense fallback={<Loading />}>
        {children}
      </Suspense>
      <Toaster />
    </ThemeProvider>
  );
}
