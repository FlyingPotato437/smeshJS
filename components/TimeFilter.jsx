import React from 'react';

const TimeFilter = ({ value, onChange }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-md">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>
    </div>
  );
};

export default TimeFilter; 