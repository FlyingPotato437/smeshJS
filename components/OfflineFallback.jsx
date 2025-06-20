"use client";

import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineFallback({ onRetry, hasCache = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <WifiOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Connection Lost
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            We're having trouble connecting to the internet. Please check your WiFi connection.
          </p>
        </div>

        {hasCache && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700 dark:text-blue-200">
              Some cached data is available to view offline.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Tips:</p>
            <ul className="mt-1 space-y-1 text-left">
              <li>• Check your WiFi connection</li>
              <li>• Try moving closer to your router</li>
              <li>• Refresh the page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}