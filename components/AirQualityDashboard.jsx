import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Wind, CloudRain, ThermometerSun, Droplets, Gauge, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

// Dynamically import chart components
const TimeSeriesChart = dynamic(() => import('./TimeSeriesChart'), { ssr: false });

const AirQualityDashboard = ({ data = [], metrics = ['pm25Standard'] }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');

  // Process data to extract summary statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) return {};

    // Filter data based on selected time range
    const now = new Date();
    let filteredData = [...data];
    
    if (selectedTimeRange === 'day') {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filteredData = data.filter(d => new Date(d.datetime) >= oneDayAgo);
    } else if (selectedTimeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredData = data.filter(d => new Date(d.datetime) >= oneWeekAgo);
    } else if (selectedTimeRange === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredData = data.filter(d => new Date(d.datetime) >= oneMonthAgo);
    }

    // Calculate statistics for each metric
    const results = {};
    const metricsList = metrics.length > 0 ? metrics : ['pm25Standard', 'pm10Standard', 'temperature', 'relativeHumidity'];
    
    metricsList.forEach(metric => {
      const validValues = filteredData
        .map(d => d[metric])
        .filter(val => val !== null && val !== undefined && !isNaN(val));
      
      if (validValues.length === 0) {
        results[metric] = { count: 0 };
        return;
      }
      
      const sum = validValues.reduce((a, b) => a + b, 0);
      const avg = sum / validValues.length;
      const min = Math.min(...validValues);
      const max = Math.max(...validValues);
      
      // Calculate standard deviation
      const squareDiffs = validValues.map(value => {
        const diff = value - avg;
        return diff * diff;
      });
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / validValues.length;
      const stdDev = Math.sqrt(avgSquareDiff);
      
      // Get the most recent value
      const sortedData = [...filteredData].sort((a, b) => 
        new Date(b.datetime) - new Date(a.datetime)
      );
      const latestValue = sortedData[0] ? sortedData[0][metric] : null;
      const latestDateTime = sortedData[0] ? new Date(sortedData[0].datetime) : null;
      
      // Calculate trend (basic trend: compare latest value to average)
      const trend = latestValue !== null ? (latestValue > avg ? 'up' : latestValue < avg ? 'down' : 'stable') : 'unknown';
      
      results[metric] = {
        count: validValues.length,
        avg,
        min,
        max,
        stdDev,
        latest: latestValue,
        latestDateTime,
        trend
      };
    });
    
    return results;
  }, [data, selectedTimeRange, metrics]);

  // Function to get appropriate icon for a metric
  const getMetricIcon = (metric, size = 5) => {
    const className = `w-${size} h-${size}`;
    
    switch(metric) {
      case 'pm25Standard':
        return <Wind className={className} />;
      case 'pm10Standard':
        return <CloudRain className={className} />;
      case 'temperature':
        return <ThermometerSun className={className} />;
      case 'relativeHumidity':
        return <Droplets className={className} />;
      case 'iaq':
        return <Gauge className={className} />;
      default:
        return <Gauge className={className} />;
    }
  };

  // Function to get appropriate unit for a metric
  const getMetricUnit = (metric) => {
    switch(metric) {
      case 'pm25Standard':
      case 'pm10Standard':
      case 'pm1Standard':
      case 'pm100Standard':
        return 'μg/m³';
      case 'temperature':
        return '°C';
      case 'relativeHumidity':
        return '%';
      case 'pressure':
        return 'hPa';
      case 'iaq':
        return '';
      default:
        return '';
    }
  };

  // Function to get display name for a metric
  const getMetricDisplayName = (metric) => {
    switch(metric) {
      case 'pm25Standard':
        return 'PM2.5';
      case 'pm10Standard':
        return 'PM10';
      case 'pm1Standard':
        return 'PM1';
      case 'pm100Standard':
        return 'PM100';
      case 'temperature':
        return 'Temperature';
      case 'relativeHumidity':
        return 'Humidity';
      case 'iaq':
        return 'Air Quality Index';
      default:
        return metric;
    }
  };

  // Function to get trend icon
  const getTrendIcon = (trend) => {
    switch(trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      case 'stable':
        return <div className="w-4 h-4 border-t-2 border-gray-400"></div>;
      default:
        return null;
    }
  };

  // Function to determine air quality status based on PM2.5
  const getAirQualityStatus = () => {
    if (!stats['pm25Standard'] || stats['pm25Standard'].latest === null) {
      return { text: 'Unknown', color: 'gray', icon: null };
    }
    
    const pm25 = stats['pm25Standard'].latest;
    
    if (pm25 <= 12) {
      return { 
        text: 'Good',
        color: 'green',
        icon: <CheckCircle className="w-5 h-5 text-green-500" />
      };
    } else if (pm25 <= 35.4) {
      return { 
        text: 'Moderate',
        color: 'yellow',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />
      };
    } else if (pm25 <= 55.4) {
      return { 
        text: 'Unhealthy for Sensitive Groups',
        color: 'orange',
        icon: <AlertTriangle className="w-5 h-5 text-orange-500" />
      };
    } else if (pm25 <= 150.4) {
      return { 
        text: 'Unhealthy',
        color: 'red',
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />
      };
    } else if (pm25 <= 250.4) {
      return { 
        text: 'Very Unhealthy',
        color: 'purple',
        icon: <AlertTriangle className="w-5 h-5 text-purple-500" />
      };
    } else {
      return { 
        text: 'Hazardous',
        color: 'maroon',
        icon: <AlertTriangle className="w-5 h-5 text-red-900" />
      };
    }
  };

  // Format number with appropriate precision
  const formatNumber = (value, metricType) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (metricType === 'temperature' || metricType === 'relativeHumidity') {
      return value.toFixed(1);
    } else if (metricType === 'pm25Standard' || metricType === 'pm10Standard') {
      return value.toFixed(1);
    }
    
    return value.toFixed(0);
  };

  // Format date for latest reading
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffMins < 24 * 60) {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return date.toLocaleString();
    }
  };

  // Get air quality status
  const airQualityStatus = getAirQualityStatus();
  
  // Define which metrics to display in the dashboard
  const displayMetrics = metrics.length > 0 ? metrics : ['pm25Standard', 'pm10Standard', 'temperature', 'relativeHumidity'];
  
  // Time series options for the mini chart
  const timeSeriesOptions = {
    aggregation: 'hourly',
    smoothing: 5,
    showTrend: true,
    height: 120,
    simple: true
  };

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Air Quality Dashboard</h3>
        <div className="flex space-x-1">
          <button 
            onClick={() => setSelectedTimeRange('day')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedTimeRange === 'day' 
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            24h
          </button>
          <button 
            onClick={() => setSelectedTimeRange('week')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedTimeRange === 'week' 
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            Week
          </button>
          <button 
            onClick={() => setSelectedTimeRange('month')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedTimeRange === 'month' 
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            Month
          </button>
          <button 
            onClick={() => setSelectedTimeRange('all')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedTimeRange === 'all' 
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Air quality status card */}
      <div className={`bg-${airQualityStatus.color}-50 dark:bg-${airQualityStatus.color}-900/20 border border-${airQualityStatus.color}-200 dark:border-${airQualityStatus.color}-800 rounded-xl p-4 text-${airQualityStatus.color}-800 dark:text-${airQualityStatus.color}-200`}>
        <div className="flex items-center">
          {airQualityStatus.icon}
          <div className="ml-2">
            <h3 className="font-medium">Current Air Quality: {airQualityStatus.text}</h3>
            <p className="text-sm text-${airQualityStatus.color}-600 dark:text-${airQualityStatus.color}-300">
              Based on the latest PM2.5 reading of {stats['pm25Standard']?.latest ? formatNumber(stats['pm25Standard'].latest, 'pm25Standard') + ' μg/m³' : 'N/A'}
            </p>
          </div>
          <div className="ml-auto text-sm">
            <span>Last updated: {stats['pm25Standard']?.latestDateTime ? formatDate(stats['pm25Standard'].latestDateTime) : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Metrics overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayMetrics.map(metric => (
          <div 
            key={metric} 
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center space-x-2">
              {getMetricIcon(metric)}
              <h3 className="font-medium text-gray-800 dark:text-gray-200">
                {getMetricDisplayName(metric)}
              </h3>
              {stats[metric]?.trend && getTrendIcon(stats[metric].trend)}
            </div>
            <div className="mt-2">
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats[metric]?.latest !== null 
                    ? formatNumber(stats[metric].latest, metric)
                    : 'N/A'
                  }
                </span>
                <span className="ml-1 text-gray-500 dark:text-gray-400">{getMetricUnit(metric)}</span>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg</span>
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {stats[metric]?.avg !== undefined 
                      ? formatNumber(stats[metric].avg, metric)
                      : 'N/A'
                    }
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Min</span>
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {stats[metric]?.min !== undefined 
                      ? formatNumber(stats[metric].min, metric)
                      : 'N/A'
                    }
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Max</span>
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {stats[metric]?.max !== undefined 
                      ? formatNumber(stats[metric].max, metric)
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent trends chart */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-4">Recent Trends</h3>
        <div className="h-[200px]">
          <TimeSeriesChart 
            data={data} 
            metrics={displayMetrics}
            options={timeSeriesOptions}
          />
        </div>
      </div>
      
      {/* Data statistics  */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Data Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Readings:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{data.length.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Time Period:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {data.length > 0 ? (
                  <>
                    {new Date(Math.min(...data.map(d => new Date(d.datetime)))).toLocaleDateString()}
                    {' to '}
                    {new Date(Math.max(...data.map(d => new Date(d.datetime)))).toLocaleDateString()}
                  </>
                ) : (
                  'N/A'
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sensors:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {[...new Set(data.map(d => d.from_node).filter(Boolean))].length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Metrics Available:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {Object.keys(stats).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirQualityDashboard; 