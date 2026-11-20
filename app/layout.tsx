import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Die Bonding Lab | Die Attach Film Simulation',
  description: 'Interactive 3D educational simulator for film adhesive die bonding (DAF): wafer thinning, lamination, dicing, pick-up, alignment, attachment, curing and inspection.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
