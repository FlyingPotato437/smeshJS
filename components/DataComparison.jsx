import React, { useMemo, useState } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  TimeScale
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { ArrowsRightLeftIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const DataComparison = ({
  datasets = [],
  title = 'Data Comparison',
  metricOptions = [],
  deviceOptions = [],
  darkMode = false,
  showLegend = true,
  height = 400
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [chartType, setChartType] = useState('line');
  const [orientation, setOrientation] = useState('vertical');
  const [timeRange, setTimeRange] = useState('all');
  
  // Color palette that works well in both light and dark modes
  const colorPalette = [
    'rgba(59, 130, 246, 0.7)',   // Blue
    'rgba(239, 68, 68, 0.7)',    // Red
    'rgba(16, 185, 129, 0.7)',   // Green
    'rgba(245, 158, 11, 0.7)',   // Amber
    'rgba(139, 92, 246, 0.7)',   // Purple
    'rgba(236, 72, 153, 0.7)',   // Pink
    'rgba(20, 184, 166, 0.7)',   // Teal
    'rgba(249, 115, 22, 0.7)',   // Orange
    'rgba(99, 102, 241, 0.7)',   // Indigo
    'rgba(217, 70, 239, 0.7)'    // Fuchsia
  ];
  
  // Theme-based chart options
  const chartOptions = useMemo(() => {
    const textColor = darkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)';
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: orientation === 'horizontal' ? 'y' : 'x',
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          labels: {
            color: textColor,
            font: {
              size: 12
            }
          }
        },
        title: {
          display: !!title,
          text: title,
          color: textColor,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          titleColor: darkMode ? '#fff' : '#000',
          bodyColor: darkMode ? '#fff' : '#000',
          borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          type: chartType === 'time' ? 'time' : 'category',
          time: chartType === 'time' ? {
            unit: 'hour',
            displayFormats: {
              hour: 'MMM d, h:mm a'
            }
          } : undefined,
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        },
        y: {
          beginAtZero: false,
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        }
      }
    };
  }, [darkMode, chartType, orientation, title, showLegend]);
  
  // Process data for the chart
  const chartData = useMemo(() => {
    if (!datasets || datasets.length === 0 || 
        (selectedMetrics.length === 0 && selectedDevices.length === 0)) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    let filteredData = [...datasets];
    
    // Filter by time range if needed
    if (timeRange !== 'all') {
      const now = new Date();
      const rangeMap = {
        'day': 24 * 60 * 60 * 1000,
        'week': 7 * 24 * 60 * 60 * 1000,
        'month': 30 * 24 * 60 * 60 * 1000
      };
      
      if (rangeMap[timeRange]) {
        const cutoff = new Date(now.getTime() - rangeMap[timeRange]);
        filteredData = filteredData.filter(d => 
          d.timestamp && new Date(d.timestamp) >= cutoff
        );
      }
    }
    
    // Group data based on selected metrics and devices
    const groupedData = {};
    const allLabels = new Set();
    
    filteredData.forEach(dataPoint => {
      if (!dataPoint.deviceId || !dataPoint.timestamp) return;
      
      const deviceId = dataPoint.deviceId;
      const timestamp = new Date(dataPoint.timestamp).toISOString();
      
      // Add timestamp to labels
      allLabels.add(timestamp);
      
      // Process selected metrics
      selectedMetrics.forEach(metric => {
        if (dataPoint[metric] !== undefined) {
          const key = `${deviceId}_${metric}`;
          
          if (!groupedData[key]) {
            groupedData[key] = {
              label: `${deviceOptions.find(d => d.value === deviceId)?.label || deviceId} - ${metricOptions.find(m => m.value === metric)?.label || metric}`,
              data: {}
            };
          }
          
          groupedData[key].data[timestamp] = dataPoint[metric];
        }
      });
      
      // If no metrics selected, use selected devices
      if (selectedMetrics.length === 0 && selectedDevices.includes(deviceId)) {
        const key = `${deviceId}_default`;
        
        if (!groupedData[key]) {
          groupedData[key] = {
            label: deviceOptions.find(d => d.value === deviceId)?.label || deviceId,
            data: {}
          };
        }
        
        // Use the first available numeric metric
        const firstMetric = metricOptions.find(m => 
          typeof dataPoint[m.value] === 'number'
        );
        
        if (firstMetric) {
          groupedData[key].data[timestamp] = dataPoint[firstMetric.value];
        }
      }
    });
    
    // Sort labels chronologically
    const sortedLabels = Array.from(allLabels).sort();
    
    // Build final dataset for Chart.js
    const chartDatasets = Object.values(groupedData).map((group, index) => {
      // Create a consistent color based on index
      const color = colorPalette[index % colorPalette.length];
      
      // For line charts, we need slightly different styling
      const datasetConfig = {
        label: group.label,
        data: sortedLabels.map(label => group.data[label] || null),
        backgroundColor: color,
        borderColor: chartType === 'line' ? color.replace('0.7', '1') : color,
        borderWidth: 2,
        pointBackgroundColor: color.replace('0.7', '1'),
        pointBorderColor: darkMode ? '#000' : '#fff',
        pointHoverBackgroundColor: darkMode ? '#fff' : '#000',
        pointHoverBorderColor: color,
        tension: 0.1
      };
      
      return datasetConfig;
    });
    
    return {
      labels: sortedLabels,
      datasets: chartDatasets
    };
  }, [datasets, selectedMetrics, selectedDevices, darkMode, timeRange, deviceOptions, metricOptions, colorPalette, chartType]);
  
  // Handle metric selection
  const handleMetricChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setSelectedMetrics(selected);
  };
  
  // Handle device selection
  const handleDeviceChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setSelectedDevices(selected);
  };
  
  // Toggle chart type
  const toggleChartType = () => {
    setChartType(prev => prev === 'line' ? 'bar' : 'line');
  };
  
  // Toggle orientation
  const toggleOrientation = () => {
    setOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical');
  };
  
  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </h3>
      </div>
      
      <div className="flex flex-wrap p-4 gap-4 border-b border-gray-200 dark:border-gray-700">
        {/* Metric Selection */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Metrics
          </label>
          <select
            multiple
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            onChange={handleMetricChange}
            size={3}
          >
            {metricOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Device Selection */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Devices
          </label>
          <select
            multiple
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            onChange={handleDeviceChange}
            size={3}
          >
            {deviceOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Time Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Time Range
          </label>
          <select
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="all">All Data</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
        
        {/* Chart Controls */}
        <div className="flex items-end space-x-2">
          <button
            onClick={toggleChartType}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {chartType === 'line' ? 'Switch to Bar Chart' : 'Switch to Line Chart'}
          </button>
          
          <button
            onClick={toggleOrientation}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {orientation === 'vertical' ? (
              <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
            ) : (
              <ArrowsUpDownIcon className="h-4 w-4 mr-2" />
            )}
            {orientation === 'vertical' ? 'Horizontal' : 'Vertical'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-hidden" style={{ height: `${height}px` }}>
        {chartData.datasets.length > 0 ? (
          chartType === 'line' ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>Select metrics and devices to display data</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataComparison; 