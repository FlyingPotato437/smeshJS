import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function TimeSeriesChart({ data, metricField = 'pm25Standard' }) {
  const [chartData, setChartData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(metricField);
  const [loading, setLoading] = useState(true);
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  const [showThresholds, setShowThresholds] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [useGradientLine, setUseGradientLine] = useState(true);
  const [animateTransitions, setAnimateTransitions] = useState(true);

  // Enhanced color schemes for both light and dark modes
  const colorSchemes = {
    light: {
      'pm25Standard': {
        main: '#FF5252',
        gradient: ['#FF9E80', '#FF5252', '#D50000'],
        ma: '#B71C1C',
        area: 'rgba(255, 82, 82, 0.1)'
      },
      'pm10Standard': {
        main: '#2962FF',
        gradient: ['#80D8FF', '#2962FF', '#0039CB'],
        ma: '#0D47A1',
        area: 'rgba(41, 98, 255, 0.1)'
      },
      'pm100Standard': {
        main: '#00C853',
        gradient: ['#B9F6CA', '#00C853', '#00701A'],
        ma: '#1B5E20',
        area: 'rgba(0, 200, 83, 0.1)'
      },
      'temperature': {
        main: '#00BCD4',
        gradient: ['#84FFFF', '#00BCD4', '#0097A7'],
        ma: '#006064',
        area: 'rgba(0, 188, 212, 0.1)'
      },
      'relativeHumidity': {
        main: '#FFC107',
        gradient: ['#FFECB3', '#FFC107', '#FFA000'],
        ma: '#FF6F00',
        area: 'rgba(255, 193, 7, 0.1)'
      },
      'barometricPressure': {
        main: '#9C27B0',
        gradient: ['#E1BEE7', '#9C27B0', '#6A1B9A'],
        ma: '#4A148C',
        area: 'rgba(156, 39, 176, 0.1)'
      },
      'gasResistance': {
        main: '#4CAF50',
        gradient: ['#A5D6A7', '#4CAF50', '#2E7D32'],
        ma: '#1B5E20',
        area: 'rgba(76, 175, 80, 0.1)'
      },
      'iaq': {
        main: '#F06292',
        gradient: ['#FFCDD2', '#F06292', '#C2185B'],
        ma: '#880E4F',
        area: 'rgba(240, 98, 146, 0.1)'
      }
    },
    dark: {
      'pm25Standard': {
        main: '#FF7676',
        gradient: ['#FFBCBC', '#FF7676', '#FF2E2E'],
        ma: '#CF5757',
        area: 'rgba(255, 118, 118, 0.15)'
      },
      'pm10Standard': {
        main: '#5E96FF',
        gradient: ['#A8C4FF', '#5E96FF', '#2D7AFF'],
        ma: '#3366CC',
        area: 'rgba(94, 150, 255, 0.15)'
      },
      'pm100Standard': {
        main: '#4AE380',
        gradient: ['#A2F2BC', '#4AE380', '#15CC45'],
        ma: '#30A856',
        area: 'rgba(74, 227, 128, 0.15)'
      },
      'temperature': {
        main: '#33E6FF',
        gradient: ['#9EFFFF', '#33E6FF', '#00B3CC'],
        ma: '#00A0B8',
        area: 'rgba(51, 230, 255, 0.15)'
      },
      'relativeHumidity': {
        main: '#FFD54F',
        gradient: ['#FFECB3', '#FFD54F', '#FFAB00'],
        ma: '#FFC107',
        area: 'rgba(255, 213, 79, 0.15)'
      },
      'barometricPressure': {
        main: '#CE93D8',
        gradient: ['#F3E5F5', '#CE93D8', '#AB47BC'],
        ma: '#9C27B0',
        area: 'rgba(206, 147, 216, 0.15)'
      },
      'gasResistance': {
        main: '#81C784',
        gradient: ['#C8E6C9', '#81C784', '#4CAF50'],
        ma: '#43A047',
        area: 'rgba(129, 199, 132, 0.15)'
      },
      'iaq': {
        main: '#F48FB1',
        gradient: ['#FFCDD2', '#F48FB1', '#EC407A'],
        ma: '#D81B60',
        area: 'rgba(244, 143, 177, 0.15)'
      }
    }
  };

  // Define metrics with both original and normalized names
  const metrics = [
    { value: 'pm25Standard', label: 'PM2.5', alternates: ['pm25', 'pm2_5', 'PM2.5'] },
    { value: 'pm10Standard', label: 'PM10', alternates: ['pm10', 'PM10'] },
    { value: 'pm100Standard', label: 'PM100', alternates: ['pm100', 'PM100'] },
    { value: 'temperature', label: 'Temperature', alternates: ['temp'] },
    { value: 'relativeHumidity', label: 'Humidity', alternates: ['humidity'] },
    { value: 'barometricPressure', label: 'Pressure', alternates: ['pressure'] },
    { value: 'gasResistance', label: 'Gas Resistance', alternates: ['gas'] },
    { value: 'iaq', label: 'IAQ', alternates: [] }
  ];

  // Define thresholds for different metrics
  const thresholds = {
    'pm25Standard': [
      { value: 12, color: '#FFC107', text: 'WHO 24h Guideline (12 μg/m³)' },
      { value: 35, color: '#F44336', text: 'USEPA 24h Standard (35 μg/m³)' }
    ],
    'pm10Standard': [
      { value: 45, color: '#FFC107', text: 'WHO 24h Guideline (45 μg/m³)' },
      { value: 150, color: '#F44336', text: 'USEPA 24h Standard (150 μg/m³)' }
    ],
    'temperature': [
      { value: 20, color: '#2196F3', text: 'Low Comfort Threshold (20°C)' },
      { value: 25, color: '#F44336', text: 'High Comfort Threshold (25°C)' }
    ],
    'relativeHumidity': [
      { value: 30, color: '#2196F3', text: 'Low Comfort Threshold (30%)' },
      { value: 60, color: '#F44336', text: 'High Comfort Threshold (60%)' }
    ],
    'iaq': [
      { value: 50, color: '#4CAF50', text: 'Good IAQ (50)' },
      { value: 100, color: '#FFC107', text: 'Moderate IAQ (100)' },
      { value: 150, color: '#FF9800', text: 'Unhealthy for Sensitive Groups (150)' },
      { value: 200, color: '#F44336', text: 'Unhealthy IAQ (200)' }
    ]
  };

  // Detect dark mode
  useEffect(() => {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(isDark);

    // Add listener for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Calculate moving average
  const calculateMovingAverage = (values, windowSize) => {
    if (!values || values.length === 0) return [];
    
    const result = [];
    for (let i = 0; i < values.length; i++) {
      if (i < windowSize - 1) {
        result.push(null);
        continue;
      }
      
      let sum = 0;
      let count = 0;
      
      for (let j = 0; j < windowSize; j++) {
        const val = values[i - j];
        if (val !== null && val !== undefined && !isNaN(val)) {
          sum += val;
          count++;
        }
      }
      
      result.push(count > 0 ? sum / count : null);
    }
    
    return result;
  };
  
  // Function to find an available metric in the data if the preferred one isn't present
  const findAvailableMetric = (preferredMetric, data) => {
    // First check if the preferred metric exists in the data
    if (data.some(item => item[preferredMetric] !== undefined && item[preferredMetric] !== null)) {
      return preferredMetric;
    }
    
    // If not, look for alternate names for the same metric
    const preferredMetricInfo = metrics.find(m => m.value === preferredMetric);
    if (preferredMetricInfo) {
      for (const alt of preferredMetricInfo.alternates) {
        if (data.some(item => item[alt] !== undefined && item[alt] !== null)) {
          return alt;
        }
      }
    }
    
    // If still not found, find any available numeric metric
    for (const metric of metrics) {
      if (data.some(item => item[metric.value] !== undefined && item[metric.value] !== null)) {
        return metric.value;
      }
      
      // Check alternates too
      for (const alt of metric.alternates) {
        if (data.some(item => item[alt] !== undefined && item[alt] !== null)) {
          return alt;
        }
      }
    }
    
    // Last resort: check for any numeric column
    if (data.length > 0) {
      const firstItem = data[0];
      for (const key in firstItem) {
        if (typeof firstItem[key] === 'number' || !isNaN(Number(firstItem[key]))) {
          return key;
        }
      }
    }
    
    return null; // No suitable metric found
  };
  
  // Get all available metrics in the data
  const getAvailableMetrics = (data) => {
    if (!data || data.length === 0) return [];
    
    const available = [];
    
    // Check each standard metric
    for (const metric of metrics) {
      // Check standard name
      if (data.some(item => item[metric.value] !== undefined && item[metric.value] !== null)) {
        available.push({
          value: metric.value,
          label: metric.label
        });
        continue; // Skip checking alternates
      }
      
      // Check alternate names
      for (const alt of metric.alternates) {
        if (data.some(item => item[alt] !== undefined && item[alt] !== null)) {
          available.push({
            value: alt,
            label: metric.label
          });
          break; // Found one alternate, no need to check more
        }
      }
    }
    
    // Add any numeric columns that aren't in our predefined list
    if (data.length > 0) {
      const firstItem = data[0];
      for (const key in firstItem) {
        // Skip if it's already in our list
        if (available.some(m => m.value === key)) continue;
        
        // Add if numeric
        if (typeof firstItem[key] === 'number' || !isNaN(Number(firstItem[key]))) {
          available.push({
            value: key,
            label: key.charAt(0).toUpperCase() + key.slice(1) // Capitalize
          });
        }
      }
    }
    
    return available;
  };
  
  // Get available metrics once when data changes
  const [availableMetrics, setAvailableMetrics] = useState([]);
  
  useEffect(() => {
    if (data && data.length > 0) {
      const metrics = getAvailableMetrics(data);
      setAvailableMetrics(metrics);
    }
  }, [data]);
  
  // Enhanced version to handle data loading, error handling, and visualization
  useEffect(() => {
    if (data && data.length > 0) {
      setLoading(true);
      setError(null);
      
      try {
        // Find an available metric if the selected one isn't present
        const availableMetric = findAvailableMetric(selectedMetric, data);
        
        if (!availableMetric) {
          setError(`No suitable numeric data found for visualization.`);
          setLoading(false);
          return;
        }
        
        if (availableMetric !== selectedMetric) {
          console.log(`Selected metric ${selectedMetric} not found, using ${availableMetric} instead.`);
          setSelectedMetric(availableMetric);
        }
        
        // Check if we have datetime data
        if (!data.some(item => item.datetime || item.timestamp)) {
          setError("No datetime information available for time series chart.");
          setLoading(false);
          return;
        }
        
        // Prepare data for time series chart - sort by datetime
        const sortedData = [...data]
          .filter(item => item.datetime || item.timestamp) // Filter items with datetime
          .sort((a, b) => {
            const dateA = new Date(a.datetime || a.timestamp);
            const dateB = new Date(b.datetime || b.timestamp);
            return dateA - dateB;
          });
        
        if (sortedData.length === 0) {
          setError("No time-series data available after filtering.");
          setLoading(false);
          return;
        }
        
        console.log(`Processing ${sortedData.length} data points for time series chart`);
        
        // Extract dates and values, handling potential missing or invalid values
        const dates = sortedData.map(item => new Date(item.datetime || item.timestamp));
        const values = sortedData.map(item => {
          // Try different field name formats for the metric
          const value = item[availableMetric] !== null && item[availableMetric] !== undefined 
            ? Number(item[availableMetric]) 
            : (item[availableMetric.toLowerCase()] !== null && item[availableMetric.toLowerCase()] !== undefined 
                ? Number(item[availableMetric.toLowerCase()]) 
                : null);
          
          return value;
        });
        
        // Filter out null/undefined values for proper visualization
        const validData = [];
        const validDates = [];
        
        for (let i = 0; i < values.length; i++) {
          if (values[i] !== null && values[i] !== undefined && !isNaN(values[i])) {
            validData.push(values[i]);
            validDates.push(dates[i]);
          }
        }
        
        if (validData.length < 2) {
          setError("Not enough valid data points for time series chart.");
          setLoading(false);
          return;
        }
        
        // Calculate moving averages if there's enough data
        const windowSize = Math.min(12, Math.max(3, Math.floor(validData.length / 10)));
        const movingAvg = calculateMovingAverage(validData, windowSize);
        
        // For longer data series, add a longer moving average line
        const longWindowSize = Math.min(24, Math.max(6, Math.floor(validData.length / 5)));
        const longMovingAvg = calculateMovingAverage(validData, longWindowSize);
        
        // Get color scheme based on mode
        const colorSet = isDarkMode 
          ? colorSchemes.dark[availableMetric] || colorSchemes.dark.pm25Standard
          : colorSchemes.light[availableMetric] || colorSchemes.light.pm25Standard;
        
        // Main trace with enhanced styling
        const mainTrace = {
          type: 'scatter',
          mode: 'lines+markers',
          name: getMetricDisplayName(),
          x: validDates,
          y: validData,
          line: {
            color: useGradientLine ? null : colorSet.main,
            width: 3,
            shape: 'spline'
          },
          marker: {
            size: 6,
            color: colorSet.main,
            opacity: 0.8,
            line: {
              width: 1,
              color: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
            }
          },
          hovertemplate: `<b>${getMetricDisplayName()}</b>: %{y:.2f} ${getMetricUnits()}<br>%{x|%B %d, %Y %H:%M:%S}<extra></extra>`,
          fillcolor: colorSet.area,
          fill: 'tozeroy'
        };
        
        // Moving average trace with enhanced styling
        const maTrace = {
          type: 'scatter',
          mode: 'lines',
          name: `${windowSize}-point Moving Avg`,
          x: validDates,
          y: movingAvg,
          line: {
            color: colorSet.ma,
            width: 2.5,
            shape: 'spline',
            dash: 'dot'
          },
          hovertemplate: `<b>MA (${windowSize})</b>: %{y:.2f} ${getMetricUnits()}<br>%{x|%B %d, %Y %H:%M:%S}<extra></extra>`,
          visible: showMovingAverage ? true : 'legendonly'
        };
        
        // Long window moving average trace
        const longMaTrace = {
          type: 'scatter',
          mode: 'lines',
          name: `${longWindowSize}-point Moving Avg`,
          x: validDates,
          y: longMovingAvg,
          line: {
            color: colorSet.ma,
            width: 3,
            shape: 'spline'
          },
          hovertemplate: `<b>MA (${longWindowSize})</b>: %{y:.2f} ${getMetricUnits()}<br>%{x|%B %d, %Y %H:%M:%S}<extra></extra>`,
          visible: showMovingAverage ? true : 'legendonly'
        };
        
        // Set chart data with transitions for smoother appearance
        if (animateTransitions) {
          setChartData([]);
          setTimeout(() => {
            setChartData([mainTrace, maTrace, longMaTrace]);
          }, 50);
        } else {
          setChartData([mainTrace, maTrace, longMaTrace]);
        }
      } catch (error) {
        console.error('Error preparing time series data:', error);
        setError(`An error occurred: ${error.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      setChartData([]);
    }
  }, [data, selectedMetric, showMovingAverage, isDarkMode, useGradientLine, animateTransitions]);
  
  // Get the thresholds for the selected metric
  const getThresholdsForMetric = (metric) => {
    // First check direct match
    if (thresholds[metric]) {
      return thresholds[metric];
    }
    
    // Find normalized metric name match
    for (const metricInfo of metrics) {
      if (metricInfo.value === metric || metricInfo.alternates.includes(metric)) {
        if (thresholds[metricInfo.value]) {
          return thresholds[metricInfo.value];
        }
      }
    }
    
    return []; // No thresholds found
  };
  
  // Generate threshold shapes for the plot
  const getThresholdShapes = () => {
    if (!showThresholds) return [];
    
    const metricThresholds = getThresholdsForMetric(selectedMetric);
    if (!metricThresholds || metricThresholds.length === 0) return [];
    
    return metricThresholds.map((threshold, index) => ({
      type: 'line',
      x0: 0,
      x1: 1,
      y0: threshold.value,
      y1: threshold.value,
      xref: 'paper',
      yref: 'y',
      line: {
        color: threshold.color,
        width: 3,
        dash: 'dash'
      },
      layer: 'below'
    }));
  };
  
  // Generate threshold annotations for the plot
  const getThresholdAnnotations = () => {
    if (!showThresholds) return [];
    
    const metricThresholds = getThresholdsForMetric(selectedMetric);
    if (!metricThresholds || metricThresholds.length === 0) return [];
    
    return metricThresholds.map((threshold, index) => ({
      x: 0.99,
      y: threshold.value,
      xref: 'paper',
      yref: 'y',
      text: threshold.text,
      showarrow: false,
      xanchor: 'right',
      yanchor: 'bottom',
      bgcolor: 'rgba(255, 255, 255, 0.8)',
      bordercolor: threshold.color,
      borderwidth: 1,
      borderpad: 2,
      font: {
        size: 10,
        color: isDarkMode ? '#ffffff' : '#333333'
      }
    }));
  };
  
  // Get display name for the selected metric
  const getMetricDisplayName = () => {
    // Look for the metric in our predefined list
    const metricInfo = metrics.find(m => 
      m.value === selectedMetric || m.alternates.includes(selectedMetric)
    );
    
    if (metricInfo) {
      return metricInfo.label;
    }
    
    // If not found, capitalize the metric name
    return selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);
  };
  
  // Generate units for the selected metric
  const getMetricUnits = () => {
    if (selectedMetric.includes('pm') || selectedMetric.includes('PM')) {
      return 'μg/m³';
    } else if (selectedMetric.includes('temp')) {
      return '°C';
    } else if (selectedMetric.includes('humid')) {
      return '%';
    } else if (selectedMetric.includes('pressure')) {
      return 'hPa';
    } else if (selectedMetric.includes('resist')) {
      return 'Ω';
    }
    return '';
  };
  
  // Create Plotly layout
  const layout = {
    title: {
      text: `${getMetricDisplayName()} Over Time`,
      font: {
        size: 24,
        color: isDarkMode ? '#ffffff' : '#333333'
      },
      x: 0.5, // Center title
      xanchor: 'center',
      y: 0.97, // Position at top
      yanchor: 'top',
      pad: {
        t: 10,
        b: 20
      }
    },
    autosize: true,
    margin: { l: 70, r: 40, t: 80, b: 80 }, // Better margins for visibility
    hovermode: 'closest',
    hoverlabel: {
      bgcolor: isDarkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      bordercolor: isDarkMode ? 'rgba(200, 200, 200, 0.5)' : 'rgba(50, 50, 50, 0.5)',
      font: {
        size: 14,
        color: isDarkMode ? '#ffffff' : '#333333'
      },
      namelength: -1 // Don't truncate names
    },
    xaxis: {
      title: {
        text: 'Time',
        font: {
          size: 16,
          color: isDarkMode ? '#dddddd' : '#555555'
        },
        standoff: 15 // More space for title
      },
      showgrid: true,
      gridcolor: isDarkMode ? 'rgba(128, 128, 128, 0.15)' : 'rgba(0, 0, 0, 0.1)',
      gridwidth: 1,
      showline: true,
      linecolor: isDarkMode ? 'rgba(180, 180, 180, 0.4)' : 'rgba(60, 60, 60, 0.4)',
      linewidth: 1,
      zeroline: false,
      rangeselector: {
        buttons: [
          {count: 1, label: '1h', step: 'hour', stepmode: 'backward'},
          {count: 12, label: '12h', step: 'hour', stepmode: 'backward'},
          {count: 1, label: '1d', step: 'day', stepmode: 'backward'},
          {count: 7, label: '1w', step: 'day', stepmode: 'backward'},
          {step: 'all', label: 'All'}
        ],
        bgcolor: isDarkMode ? 'rgba(60, 60, 60, 0.7)' : 'rgba(240, 240, 240, 0.8)',
        activecolor: isDarkMode ? 'rgba(100, 100, 220, 0.7)' : 'rgba(0, 0, 180, 0.6)',
        font: {size: 13, color: isDarkMode ? '#eeeeee' : '#333333'},
        x: 0.01,
        y: 1.07, // Position above the chart for better visibility
        xanchor: 'left'
      },
      rangeslider: {
        visible: true,
        bgcolor: isDarkMode ? 'rgba(50, 50, 50, 0.3)' : 'rgba(240, 240, 240, 0.4)',
        bordercolor: isDarkMode ? 'rgba(180, 180, 180, 0.3)' : 'rgba(60, 60, 60, 0.3)',
        borderwidth: 1,
        thickness: 0.05 // Smaller rangeslider to save vertical space
      },
      tickfont: {
        size: 13,
        color: isDarkMode ? '#aaaaaa' : '#777777'
      },
      tickangle: -30, // Angle ticks for better readability with timestamps
      tickformat: '%m/%d %H:%M', // Format to show date and time
      automargin: true // Automatically adjust margins for long tick labels
    },
    yaxis: {
      title: {
        text: `${getMetricDisplayName()} (${getMetricUnits()})`,
        font: {
          size: 16,
          color: isDarkMode ? '#dddddd' : '#555555'
        },
        standoff: 15 // More space for title
      },
      showgrid: true,
      gridcolor: isDarkMode ? 'rgba(128, 128, 128, 0.15)' : 'rgba(0, 0, 0, 0.1)',
      gridwidth: 1,
      showline: true,
      linecolor: isDarkMode ? 'rgba(180, 180, 180, 0.4)' : 'rgba(60, 60, 60, 0.4)',
      linewidth: 1,
      zeroline: false,
      tickfont: {
        size: 13,
        color: isDarkMode ? '#aaaaaa' : '#777777'
      },
      automargin: true // Automatically adjust margins for long tick labels
    },
    shapes: getThresholdShapes(),
    annotations: getThresholdAnnotations(),
    legend: {
      orientation: 'h',
      xanchor: 'center',
      x: 0.5,
      y: 1.15, // Positioned above the chart
      bgcolor: isDarkMode ? 'rgba(40, 40, 40, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      bordercolor: isDarkMode ? 'rgba(150, 150, 150, 0.3)' : 'rgba(0, 0, 0, 0.1)',
      borderwidth: 1,
      font: {
        size: 14,
        color: isDarkMode ? '#eeeeee' : '#333333'
      },
      itemsizing: 'constant',
      itemwidth: 40,
      traceorder: 'normal',
      tracegroupgap: 10
    },
    plot_bgcolor: isDarkMode ? 'rgba(26, 26, 26, 0.8)' : 'rgba(252, 252, 252, 0.9)',
    paper_bgcolor: isDarkMode ? 'rgba(26, 26, 26, 0)' : 'rgba(252, 252, 252, 0)',
    uirevision: selectedMetric // Keep zoom level when changing traces
  };
  
  // Create config options for Plotly
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false, // Remove Plotly logo
    toImageButtonOptions: {
      format: 'png',
      filename: `${getMetricDisplayName().toLowerCase()}_timeseries`,
      scale: 2
    }
  };
  
  // Handle metric change
  const handleMetricChange = (metric) => {
    setSelectedMetric(metric);
  };
  
  // Render the chart
  return (
    <div className="w-full h-full flex flex-col">
      {/* Chart controls in a styled panel */}
      <div className="flex flex-wrap justify-between items-center mb-3 gap-2 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {/* Metric selector */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => handleMetricChange(e.target.value)}
            className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {availableMetrics.map(metric => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Additional controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="movingAverage"
              checked={showMovingAverage}
              onChange={() => setShowMovingAverage(prev => !prev)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="movingAverage" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Moving Avg
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="thresholds"
              checked={showThresholds}
              onChange={() => setShowThresholds(prev => !prev)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="thresholds" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Guidelines
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="gradient"
              checked={useGradientLine}
              onChange={() => setUseGradientLine(prev => !prev)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="gradient" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enhanced Line
            </label>
          </div>
        </div>
      </div>
      
      {/* Main chart area with loading and error states */}
      <div className="flex-grow relative bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden" style={{ minHeight: '500px' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 rounded">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-t-2 border-b-2 border-primary-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading chart data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded p-4">
            <div className="text-center max-w-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-lg font-medium mb-1">Chart Error</p>
              <p>{error}</p>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <Plot
            data={chartData}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            className="w-full h-full min-h-[500px]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
            <p>No data available for chart</p>
          </div>
        )}
      </div>
      
      {/* Chart stats and info */}
      {!loading && !error && chartData.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {getThresholdsForMetric(selectedMetric).map((threshold, index) => (
            <div 
              key={index} 
              className="py-2 px-3 rounded-md text-sm flex items-center" 
              style={{ backgroundColor: `${threshold.color}20`, borderLeft: `3px solid ${threshold.color}` }}
            >
              <span className="font-medium text-gray-800 dark:text-gray-200">{threshold.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}