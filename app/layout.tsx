import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Student Grade Management System',
  description: 'A web-based student grade management system with student and course CRUD, enrollment, batch and individual grade entry, transcripts, course statistics, and persistent TXT .dat storage.',
  openGraph: {
    title: 'Student Grade Management System',
    description: 'A web-based student grade management system with student and course CRUD, enrollment, batch and individual grade entry, transcripts, course statistics, and persistent TXT .dat storage.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Student Grade Management System',
    description: 'A web-based student grade management system with student and course CRUD, enrollment, batch and individual grade entry, transcripts, course statistics, and persistent TXT .dat storage.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
