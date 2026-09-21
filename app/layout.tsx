import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Student Grade Management System',
  description: 'A web-based student grade management system with student and course management, enrollment, batch and individual grade entry, transcripts, and course performance analytics.',
  openGraph: {
    title: 'Student Grade Management System',
    description: 'A web-based student grade management system with student and course management, enrollment, batch and individual grade entry, transcripts, and course performance analytics.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Student Grade Management System',
    description: 'A web-based student grade management system with student and course management, enrollment, batch and individual grade entry, transcripts, and course performance analytics.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
