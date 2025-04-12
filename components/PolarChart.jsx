import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-full w-full rounded"></div>
});

const PolarChart = ({ data = [], metrics = ['pm25Standard', 'pm10Standard', 'temperature', 'relativeHumidity'] }) => {
  // Process data for polar chart
  const { chartData, displayNames, range } = useMemo(() => {
    if (!data || data.length === 0 || metrics.length < 3) {
      return { chartData: [], displayNames: {}, range: {} };
    }
    
    // Get display names for metrics
    const displayNames = {
      pm25Standard: 'PM2.5',
      pm10Standard: 'PM10',
      temperature: 'Temperature',
      relativeHumidity: 'Rel. Humidity',
      pressure: 'Pressure',
      voc: 'VOC',
      co2: 'CO2',
      iaq: 'IAQ'
    };
    
    // Filter valid data
    const validData = data.filter(d => 
      metrics.every(metric => 
        d[metric] !== null && d[metric] !== undefined && !isNaN(d[metric])
      )
    );
    
    if (validData.length === 0) {
      return { chartData: [], displayNames, range: {} };
    }
    
    // Calculate min and max for each metric to normalize values
    const range = {};
    metrics.forEach(metric => {
      const values = validData.map(d => d[metric]);
      range[metric] = {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });
    
    // Group data by devices if device_id exists
    const deviceGroups = {};
    validData.forEach(d => {
      if (d.device_id) {
        if (!deviceGroups[d.device_id]) {
          deviceGroups[d.device_id] = [];
        }
        deviceGroups[d.device_id].push(d);
      }
    });
    
    // Prepare chart data
    let chartData = [];
    
    // If we have device groups, create a trace for each device
    if (Object.keys(deviceGroups).length > 0) {
      Object.entries(deviceGroups).forEach(([deviceId, deviceData], index) => {
        // Calculate average values for this device
        const avgValues = {};
        metrics.forEach(metric => {
          const values = deviceData.map(d => d[metric]);
          avgValues[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
        });
        
        // Normalize values to 0-1 range
        const normalizedValues = metrics.map(metric => {
          const { min, max } = range[metric];
          return max > min ? (avgValues[metric] - min) / (max - min) : 0.5;
        });
        
        // Create a radar/polar chart trace
        chartData.push({
          type: 'scatterpolar',
          r: [...normalizedValues, normalizedValues[0]], // Close the polygon
          theta: [...metrics.map(m => displayNames[m] || m), displayNames[metrics[0]] || metrics[0]], // Close the polygon
          fill: 'toself',
          name: `Device ${deviceId}`,
          opacity: 0.7,
          line: {
            width: 2
          }
        });
      });
    } else {
      // If no device grouping, create traces by time periods
      const timeGroups = [];
      
      // Divide data into time buckets if we have timestamps
      if (validData[0].timestamp) {
        // Sort by timestamp
        validData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Divide into equal time segments (e.g., 3 segments)
        const numSegments = Math.min(3, Math.ceil(validData.length / 5));
        const segmentSize = Math.ceil(validData.length / numSegments);
        
        for (let i = 0; i < numSegments; i++) {
          const startIdx = i * segmentSize;
          const endIdx = Math.min((i + 1) * segmentSize, validData.length);
          timeGroups.push(validData.slice(startIdx, endIdx));
        }
      } else {
        // If no timestamps, just use all data
        timeGroups.push(validData);
      }
      
      // Create a trace for each time group
      timeGroups.forEach((group, index) => {
        // Calculate average values for this time period
        const avgValues = {};
        metrics.forEach(metric => {
          const values = group.map(d => d[metric]);
          avgValues[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
        });
        
        // Normalize values to 0-1 range
        const normalizedValues = metrics.map(metric => {
          const { min, max } = range[metric];
          return max > min ? (avgValues[metric] - min) / (max - min) : 0.5;
        });
        
        // Get time range for this group if available
        let periodName = `Period ${index + 1}`;
        if (group[0].timestamp && group[group.length - 1].timestamp) {
          const startDate = new Date(group[0].timestamp);
          const endDate = new Date(group[group.length - 1].timestamp);
          
          // Format dates
          const formatOptions = { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          };
          
          periodName = `${startDate.toLocaleDateString('en-US', formatOptions)} - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
        }
        
        // Create radar chart trace
        chartData.push({
          type: 'scatterpolar',
          r: [...normalizedValues, normalizedValues[0]], // Close the polygon
          theta: [...metrics.map(m => displayNames[m] || m), displayNames[metrics[0]] || metrics[0]], // Close the polygon
          fill: 'toself',
          name: periodName,
          opacity: 0.7,
          line: {
            width: 2
          }
        });
      });
    }
    
    return { chartData, displayNames, range };
  }, [data, metrics]);
  
  // Define chart layout
  const layout = useMemo(() => {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    return {
      polar: {
        radialaxis: {
          visible: true,
          showticklabels: false,
          range: [0, 1],
          tickfont: {
            family: 'Inter, system-ui, sans-serif',
            size: 10,
            color: isDarkMode ? '#d1d5db' : '#4b5563'
          }
        },
        angularaxis: {
          tickfont: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
            color: isDarkMode ? '#d1d5db' : '#4b5563'
          },
          rotation: 90,
          direction: 'clockwise'
        },
        bgcolor: isDarkMode ? 'rgba(31, 41, 55, 0.4)' : 'rgba(243, 244, 246, 0.4)'
      },
      title: {
        text: 'Air Quality Parameter Comparison',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 18,
          color: isDarkMode ? '#e5e7eb' : '#1f2937'
        }
      },
      showlegend: true,
      legend: {
        x: 0,
        y: -0.2,
        orientation: 'h',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
          color: isDarkMode ? '#d1d5db' : '#4b5563'
        }
      },
      annotations: metrics.map((metric, i) => ({
        text: `<b>${displayNames[metric] || metric}</b><br>Min: ${range[metric]?.min?.toFixed(1) || 'N/A'}<br>Max: ${range[metric]?.max?.toFixed(1) || 'N/A'}`,
        showarrow: false,
        x: 0.5 + 0.45 * Math.cos(2 * Math.PI * (i / metrics.length) + Math.PI/2),
        y: 0.5 + 0.45 * Math.sin(2 * Math.PI * (i / metrics.length) + Math.PI/2),
        xref: 'paper',
        yref: 'paper',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 10,
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        },
        bgcolor: isDarkMode ? 'rgba(31, 41, 55, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        borderpad: 4
      })),
      margin: {
        l: 40,
        r: 40,
        t: 50,
        b: 80
      },
      paper_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
      plot_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
      hovermode: 'closest'
    };
  }, [metrics, range, displayNames]);
  
  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      'lasso2d', 
      'select2d', 
      'hoverClosestCartesian',
      'hoverCompareCartesian',
      'toggleSpikelines'
    ]
  };
  
  return (
    <div className="h-full w-full">
      {chartData.length > 0 ? (
        <Plot
          data={chartData}
          layout={layout}
          config={config}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          className="w-full h-full"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            {metrics.length < 3 
              ? 'Select at least three metrics for radar chart visualization'
              : 'No data available for selected metrics'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PolarChart; 