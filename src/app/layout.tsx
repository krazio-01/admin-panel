import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.scss';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Event Registration',
    description: 'Register for the event and receive your seats and QR code by email.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html lang="en" className={geistSans.variable}>
            <body>{children}</body>
        </html>
    );
}
