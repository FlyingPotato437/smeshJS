import React from 'react';

const MetricSelector = ({ value, onChange }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-md">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 
                 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="pm25">PM2.5</option>
        <option value="pm10">PM10</option>
        <option value="temperature">Temperature</option>
        <option value="humidity">Humidity</option>
      </select>
    </div>
  );
};

export default MetricSelector; 