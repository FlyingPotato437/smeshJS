"use client";

import React from 'react';

export const Loading = ({ size = 'default', text = 'Loading...' }) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    default: 'w-8 h-8 border-4',
    large: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        className={`${sizeClasses[size]} loading-spinner`}
        role="status"
        aria-label="loading"
      />
      {text && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
};

export const LoadingOverlay = ({ text = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
        <Loading size="large" text={text} />
      </div>
    </div>
  );
};

export default Loading; 