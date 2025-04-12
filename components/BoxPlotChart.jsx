import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-full w-full rounded"></div>
});

const BoxPlotChart = ({ data = [], metrics = ['pm25Standard'] }) => {
  // Compute statistics for box plot
  const plotData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return metrics.map(metric => {
      // Filter valid values for this metric
      const values = data
        .map(d => d[metric])
        .filter(val => val !== null && val !== undefined && !isNaN(val));
      
      // Format display names
      let displayName = metric;
      if (metric === 'pm25Standard') displayName = 'PM2.5';
      else if (metric === 'pm10Standard') displayName = 'PM10';
      else if (metric === 'temperature') displayName = 'Temperature';
      else if (metric === 'relativeHumidity') displayName = 'Humidity';
      
      // Choose appropriate color
      let color;
      switch(metric) {
        case 'pm25Standard':
          color = '#FF9800';
          break;
        case 'pm10Standard':
          color = '#F44336'; 
          break;
        case 'temperature':
          color = '#2196F3';
          break;
        case 'relativeHumidity':
          color = '#4CAF50';
          break;
        default:
          color = '#9C27B0';
      }
      
      return {
        type: 'box',
        y: values,
        name: displayName,
        boxpoints: 'outliers',
        boxmean: true,
        marker: {
          color: color,
          opacity: 0.7
        },
        line: {
          color: color
        }
      };
    });
  }, [data, metrics]);
  
  // Define the layout
  const layout = useMemo(() => {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    return {
      title: {
        text: 'Data Distribution',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 18,
          color: isDarkMode ? '#e5e7eb' : '#1f2937'
        }
      },
      showlegend: true,
      legend: {
        x: 0,
        y: 1.1,
        orientation: 'h',
        font: {
          family: 'Inter, system-ui, sans-serif',
          color: isDarkMode ? '#e5e7eb' : '#1f2937'
        }
      },
      margin: {
        l: 50,
        r: 30,
        t: 80,
        b: 80
      },
      paper_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
      plot_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
      xaxis: {
        title: {
          text: 'Metric',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 14,
            color: isDarkMode ? '#d1d5db' : '#4b5563'
          }
        },
        gridcolor: isDarkMode ? '#374151' : '#e5e7eb',
        zeroline: true,
        zerolinecolor: isDarkMode ? '#6b7280' : '#9ca3af',
        tickfont: {
          family: 'Inter, system-ui, sans-serif',
          color: isDarkMode ? '#d1d5db' : '#4b5563'
        }
      },
      yaxis: {
        title: {
          text: 'Value',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 14,
            color: isDarkMode ? '#d1d5db' : '#4b5563'
          }
        },
        gridcolor: isDarkMode ? '#374151' : '#e5e7eb',
        zeroline: true,
        zerolinecolor: isDarkMode ? '#6b7280' : '#9ca3af',
        tickfont: {
          family: 'Inter, system-ui, sans-serif',
          color: isDarkMode ? '#d1d5db' : '#4b5563'
        }
      },
      annotations: [
        {
          text: 'Box plots show median (center line), quartiles (box), range (whiskers), and outliers (points)',
          showarrow: false,
          xref: 'paper',
          yref: 'paper',
          x: 0.5,
          y: -0.15,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
            color: isDarkMode ? '#9ca3af' : '#6b7280'
          }
        }
      ]
    };
  }, []);
  
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
      {plotData.length > 0 ? (
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          className="w-full h-full"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No data available for selected metrics</p>
        </div>
      )}
    </div>
  );
};

export default BoxPlotChart; 