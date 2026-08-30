import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Pawfect — Your dog does the swiping',
  description: "Tinder for dogs, where AI watches your dog's reaction and lets the dog swipe.",
  openGraph: {
    title: 'Pawfect — Your dog does the swiping',
    description: "AI watches your dog's reaction and lets the dog swipe.",
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pawfect — Your dog does the swiping',
    description: "AI watches your dog's reaction and lets the dog swipe.",
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
