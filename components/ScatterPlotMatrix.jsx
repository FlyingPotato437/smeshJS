import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-full w-full rounded"></div>
});

const ScatterPlotMatrix = ({ data = [], metrics = ['pm25Standard', 'pm10Standard'] }) => {
  // Prepare data for the scatter plot matrix
  const plotData = useMemo(() => {
    if (!data || data.length === 0 || metrics.length < 2) return [];
    
    // Filter out records with missing values for any selected metrics
    const validData = data.filter(d => 
      metrics.every(metric => 
        d[metric] !== null && d[metric] !== undefined && !isNaN(d[metric])
      )
    );
    
    if (validData.length === 0) return [];
    
    // Calculate correlation matrix
    const correlations = {};
    metrics.forEach(metric1 => {
      correlations[metric1] = {};
      metrics.forEach(metric2 => {
        // Pearson correlation coefficient calculation
        if (metric1 === metric2) {
          correlations[metric1][metric2] = 1; // Perfect correlation with self
        } else {
          const values1 = validData.map(d => d[metric1]);
          const values2 = validData.map(d => d[metric2]);
          
          const mean1 = values1.reduce((acc, val) => acc + val, 0) / values1.length;
          const mean2 = values2.reduce((acc, val) => acc + val, 0) / values2.length;
          
          let numerator = 0;
          let denominator1 = 0;
          let denominator2 = 0;
          
          for (let i = 0; i < values1.length; i++) {
            const diff1 = values1[i] - mean1;
            const diff2 = values2[i] - mean2;
            
            numerator += diff1 * diff2;
            denominator1 += diff1 * diff1;
            denominator2 += diff2 * diff2;
          }
          
          const correlation = numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
          correlations[metric1][metric2] = correlation;
        }
      });
    });
    
    // Format display names for metrics
    const getDisplayName = (metric) => {
      switch(metric) {
        case 'pm25Standard': return 'PM2.5';
        case 'pm10Standard': return 'PM10';
        case 'temperature': return 'Temp';
        case 'relativeHumidity': return 'Humidity';
        default: return metric;
      }
    };
    
    // Choose colors for metrics
    const colors = {
      pm25Standard: '#FF9800',
      pm10Standard: '#F44336',
      temperature: '#2196F3',
      relativeHumidity: '#4CAF50',
      pressure: '#9C27B0',
      iaq: '#795548',
      voc: '#607D8B',
      co2: '#E91E63'
    };
    
    // Create scatter plots for each pair of metrics
    const scatterPlots = [];
    
    metrics.forEach((yMetric, i) => {
      metrics.forEach((xMetric, j) => {
        // Skip if the same metric (would be on diagonal)
        if (yMetric === xMetric) {
          // For diagonal, add histogram
          scatterPlots.push({
            type: 'histogram',
            x: validData.map(d => d[xMetric]),
            name: getDisplayName(xMetric),
            marker: {
              color: colors[xMetric] || '#9E9E9E',
              opacity: 0.7
            },
            xaxis: `x${i * metrics.length + j + 1}`,
            yaxis: `y${i * metrics.length + j + 1}`,
            showlegend: false
          });
        } else {
          // For non-diagonal, add scatter plot
          scatterPlots.push({
            type: 'scatter',
            mode: 'markers',
            x: validData.map(d => d[xMetric]),
            y: validData.map(d => d[yMetric]),
            name: `${getDisplayName(yMetric)} vs ${getDisplayName(xMetric)}`,
            marker: {
              color: colors[yMetric] || '#9E9E9E',
              size: 4,
              opacity: 0.6
            },
            xaxis: `x${i * metrics.length + j + 1}`,
            yaxis: `y${i * metrics.length + j + 1}`,
            showlegend: false,
            hovertemplate: `${getDisplayName(xMetric)}: %{x}<br>${getDisplayName(yMetric)}: %{y}<br>Correlation: ${correlations[yMetric][xMetric].toFixed(2)}<extra></extra>`
          });
        }
      });
    });
    
    return scatterPlots;
  }, [data, metrics]);
  
  // Create layout for scatter plot matrix
  const layout = useMemo(() => {
    if (metrics.length < 2) return {};
    
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Create grid layout for matrix
    const grid = {
      rows: metrics.length,
      columns: metrics.length,
      pattern: 'independent',
      roworder: 'bottom to top'
    };
    
    // Format display names for metrics
    const getDisplayName = (metric) => {
      switch(metric) {
        case 'pm25Standard': return 'PM2.5';
        case 'pm10Standard': return 'PM10';
        case 'temperature': return 'Temp';
        case 'relativeHumidity': return 'Humidity';
        default: return metric;
      }
    };
    
    // Create axes for each cell in the matrix
    const axes = {};
    const annotations = [];
    
    metrics.forEach((yMetric, i) => {
      metrics.forEach((xMetric, j) => {
        const idx = i * metrics.length + j + 1;
        
        // Configure X axis
        axes[`xaxis${idx}`] = {
          showgrid: true,
          zeroline: false,
          showticklabels: i === metrics.length - 1, // Show only bottom row
          title: i === metrics.length - 1 ? {
            text: getDisplayName(xMetric),
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 12,
              color: isDarkMode ? '#d1d5db' : '#4b5563'
            }
          } : {},
          domain: [(j) / metrics.length, (j + 0.95) / metrics.length],
          gridcolor: isDarkMode ? '#374151' : '#e5e7eb',
        };
        
        // Configure Y axis
        axes[`yaxis${idx}`] = {
          showgrid: true,
          zeroline: false,
          showticklabels: j === 0, // Show only leftmost column
          title: j === 0 ? {
            text: getDisplayName(yMetric),
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 12,
              color: isDarkMode ? '#d1d5db' : '#4b5563'
            }
          } : {},
          domain: [(metrics.length - i - 1) / metrics.length, (metrics.length - i - 0.05) / metrics.length],
          gridcolor: isDarkMode ? '#374151' : '#e5e7eb',
        };
        
        // Add correlation values as annotations on non-diagonal cells
        if (yMetric !== xMetric) {
          // Get correlation coefficient
          const validData = data.filter(d => 
            d[xMetric] !== null && d[xMetric] !== undefined && !isNaN(d[xMetric]) &&
            d[yMetric] !== null && d[yMetric] !== undefined && !isNaN(d[yMetric])
          );
          
          if (validData.length > 0) {
            const values1 = validData.map(d => d[xMetric]);
            const values2 = validData.map(d => d[yMetric]);
            
            const mean1 = values1.reduce((acc, val) => acc + val, 0) / values1.length;
            const mean2 = values2.reduce((acc, val) => acc + val, 0) / values2.length;
            
            let numerator = 0;
            let denominator1 = 0;
            let denominator2 = 0;
            
            for (let k = 0; k < values1.length; k++) {
              const diff1 = values1[k] - mean1;
              const diff2 = values2[k] - mean2;
              
              numerator += diff1 * diff2;
              denominator1 += diff1 * diff1;
              denominator2 += diff2 * diff2;
            }
            
            const correlation = numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
            
            // Add correlation as annotation
            annotations.push({
              text: correlation.toFixed(2),
              x: (j + 0.5) / metrics.length,
              y: (metrics.length - i - 0.5) / metrics.length,
              xref: 'paper',
              yref: 'paper',
              showarrow: false,
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 12,
                color: Math.abs(correlation) > 0.7 ? 
                  (correlation > 0 ? '#4CAF50' : '#F44336') : 
                  (isDarkMode ? '#9ca3af' : '#6b7280')
              },
              bgcolor: isDarkMode ? 'rgba(31, 41, 55, 0.7)' : 'rgba(255, 255, 255, 0.7)'
            });
          }
        }
      });
    });
    
    return {
      grid: grid,
      ...axes,
      title: {
        text: 'Correlation Matrix',
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 18,
          color: isDarkMode ? '#e5e7eb' : '#1f2937'
        }
      },
      showlegend: false,
      annotations: [
        ...annotations,
        {
          text: 'Values shown are correlation coefficients (r)',
          showarrow: false,
          xref: 'paper',
          yref: 'paper',
          x: 0.5,
          y: 1.05,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
            color: isDarkMode ? '#9ca3af' : '#6b7280'
          }
        }
      ],
      margin: {
        l: 50,
        r: 20,
        t: 50,
        b: 50
      },
      paper_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
      plot_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
      hovermode: 'closest'
    };
  }, [data, metrics]);
  
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
      {metrics.length >= 2 && plotData.length > 0 ? (
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
          <p className="text-gray-500 dark:text-gray-400">
            {metrics.length < 2 
              ? 'Select at least two metrics to show correlations'
              : 'No data available for selected metrics'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ScatterPlotMatrix; 