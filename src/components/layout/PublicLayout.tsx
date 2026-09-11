import { type ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
