import './globals.css'
import { Outfit } from 'next/font/google'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { Providers } from './providers'
import { SupabaseProvider } from '../utils/supabase-provider'

const outfit = Outfit({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit'
})

export const metadata = {
  title: 'Prescribed Fire GPT',
  description: 'AI-powered prescribed fire management system for safer, more effective fire operations.',
  keywords: 'prescribed fire, wildfire, fire management, AI assistant, risk assessment',
  authors: [{ name: 'Stanford University' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8C1515',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${outfit.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased flex flex-col min-h-screen`}>
        <Providers>
          <SupabaseProvider>
            <Navbar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </SupabaseProvider>
        </Providers>
      </body>
    </html>
  )
} 