import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children, title = 'Air Quality Data Analyzer' }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Indoor Air Quality Data Analyzer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-primary-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <span className="text-2xl font-bold cursor-pointer">Air Quality Analyzer</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/">
                <span className={`hover:text-primary-200 transition-colors cursor-pointer ${
                  router.pathname === '/' ? 'border-b-2 border-white' : ''
                }`}>
                  Home
                </span>
              </Link>
              <Link href="/data-explorer">
                <span className={`hover:text-primary-200 transition-colors cursor-pointer ${
                  router.pathname === '/data-explorer' ? 'border-b-2 border-white' : ''
                }`}>
                  Explorer
                </span>
              </Link>
              <Link href="/map">
                <span className={`hover:text-primary-200 transition-colors cursor-pointer ${
                  router.pathname === '/map' ? 'border-b-2 border-white' : ''
                }`}>
                  Map
                </span>
              </Link>
              <Link href="/query">
                <span className={`hover:text-primary-200 transition-colors cursor-pointer ${
                  router.pathname === '/query' ? 'border-b-2 border-white' : ''
                }`}>
                  Query
                </span>
              </Link>
              <Link href="/upload">
                <span className={`hover:text-primary-200 transition-colors cursor-pointer ${
                  router.pathname === '/upload' ? 'border-b-2 border-white' : ''
                }`}>
                  Upload
                </span>
              </Link>
            </nav>
            <div className="md:hidden">
              {/* Mobile menu button - can be expanded with hamburger menu */}
              <button className="text-white focus:outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-gray-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Air Quality Data Analyzer</h3>
              <p className="text-gray-300">
                Monitor and analyze your indoor air quality data with advanced visualization and AI-powered insights.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/">
                    <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">Home</span>
                  </Link>
                </li>
                <li>
                  <Link href="/data-explorer">
                    <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">Data Explorer</span>
                  </Link>
                </li>
                <li>
                  <Link href="/map">
                    <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">Map</span>
                  </Link>
                </li>
                <li>
                  <Link href="/query">
                    <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">AI Query</span>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="https://www.epa.gov/indoor-air-quality-iaq" target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white transition-colors">
                    EPA Indoor Air Quality
                  </a>
                </li>
                <li>
                  <a href="https://www.who.int/health-topics/air-pollution" target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white transition-colors">
                    WHO Air Quality Guidelines
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Air Quality Data Analyzer. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}