'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalysisPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the data explorer page after a short delay
    const redirectTimer = setTimeout(() => {
      router.push('/data-explorer');
    }, 2000);
    
    return () => clearTimeout(redirectTimer);
  }, [router]);
  
  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-lg p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Analysis Tools Available</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          All analysis features have been consolidated into our enhanced Data Explorer.
          You'll be redirected in a moment.
        </p>
        <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          If you're not redirected, <a href="/data-explorer" className="text-blue-500 hover:underline">click here</a>
        </p>
      </div>
    </div>
  );
} 