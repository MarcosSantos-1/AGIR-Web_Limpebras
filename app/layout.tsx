import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'AGIR — Gestão Ambiental e Comunicação',
  description:
    'Aplicação de gestão operacional: agenda, mapa, histórico, galeria e indicadores (AGIR).',
  icons: {
    icon: [
      { url: '/AGIR_logo.png', type: 'image/png', sizes: '32x32' },
      { url: '/AGIR_logo.svg', type: 'image/svg+xml' },
    ],
    apple: '/AGIR_logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased bg-background">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
