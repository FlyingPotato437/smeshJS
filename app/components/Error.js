"use client";

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const Error = ({
  title = 'Something went wrong',
  message = 'An error occurred while processing your request.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      )}
    </div>
  );
};

export const ErrorBoundary = ({ error, reset }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Error
        title="Application Error"
        message={error?.message || 'An unexpected error occurred.'}
        onRetry={reset}
      />
    </div>
  );
};

export default Error; 