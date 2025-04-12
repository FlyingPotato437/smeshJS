import React from 'react';

const ThemeToggle = ({ checked, onChange }) => {
  return (
    <div className="flex items-center bg-white dark:bg-gray-800 p-2 rounded-md shadow-md">
      <label className="inline-flex items-center cursor-pointer">
        <span className="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">Dark Mode</span>
        <div className="relative">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={checked}
            onChange={onChange}
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </div>
      </label>
    </div>
  );
};

export default ThemeToggle; 