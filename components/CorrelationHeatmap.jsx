import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { ArrowPathIcon, QuestionMarkCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from 'react-tooltip';

const NUMERICAL_METRICS = [
  'pm25', 'pm10', 'pm1', 'pm4', 'temperature', 'humidity', 'pressure', 'voc', 'nox'
];

// Display names mapping for metrics with proper chemical formulas
const METRIC_DISPLAY_NAMES = {
  'pm25': 'PM2.5',
  'pm10': 'PM10',
  'pm1': 'PM1.0',
  'pm4': 'PM4.0',
  'humidity': 'Humidity',
  'temperature': 'Temp',
  'pressure': 'Pressure',
  'voc': 'VOC',
  'nox': 'NOx'
};

const CorrelationHeatmap = ({ 
  data = [], 
  isDarkMode = false, 
  height = 500,
  onMetricRelationshipSelect = () => {}
}) => {
  const [correlationData, setCorrelationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [annotateValues, setAnnotateValues] = useState(true);
  const [sortMetrics, setSortMetrics] = useState(false); // New state for sorting metrics
  
  // Create formatted display names for metrics
  const getMetricDisplayName = useCallback((metric) => {
    return METRIC_DISPLAY_NAMES[metric] || metric;
  }, []);
  
  // Find available numerical fields in the data
  useEffect(() => {
    if (!data || data.length < 5) {
      setError('Insufficient data points for correlation analysis');
      setLoading(false);
      return;
    }
    
    try {
      // Get a sample data point
      const sample = data[0];
      
      // Find all numeric fields
      const availableMetrics = [];
      
      // Check both possible field name formats (camelCase and lowercase)
      for (const metric of NUMERICAL_METRICS) {
        // Check camelCase format
        if (sample[metric] !== undefined && !isNaN(Number(sample[metric]))) {
          availableMetrics.push(metric);
        } 
        // Check lowercase format
        else if (sample[metric.toLowerCase()] !== undefined && !isNaN(Number(sample[metric.toLowerCase()]))) {
          availableMetrics.push(metric);
        }
      }
      
      // Only keep metrics that have enough non-null values (at least 30% of data points)
      const filteredMetrics = availableMetrics.filter(metric => {
        const validCount = data.reduce((count, item) => {
          const value = item[metric] !== undefined ? item[metric] : item[metric.toLowerCase()];
          return (value !== null && value !== undefined && !isNaN(Number(value))) ? count + 1 : count;
        }, 0);
        
        return validCount >= data.length * 0.3;
      });
      
      if (filteredMetrics.length < 2) {
        setError('Not enough numerical data available for correlation analysis.');
        setLoading(false);
        return;
      }
      
      setMetrics(filteredMetrics);
    } catch (err) {
      console.error('Error identifying metrics:', err);
      setError('Failed to analyze data structure');
      setLoading(false);
    }
  }, [data]);
  
  // Calculate correlation matrix
  useEffect(() => {
    if (data && data.length > 0 && metrics.length >= 2) {
      setLoading(true);
      setError(null);
      
      try {
        // Extract values for each metric
        const metricValues = {};
        
        metrics.forEach(metric => {
          metricValues[metric] = data.map(item => {
            // Try both camelCase and lowercase versions
            const value = 
              (item[metric] !== undefined && item[metric] !== null) ? Number(item[metric]) : 
              (item[metric.toLowerCase()] !== undefined && item[metric.toLowerCase()] !== null) ? 
              Number(item[metric.toLowerCase()]) : null;
            
            return value;
          }).filter(val => val !== null && !isNaN(val));
        });
        
        // Calculate correlation matrix
        const correlationMatrix = [];
        let metricNames = Object.keys(metricValues);
        
        // Sort metrics alphabetically by display name if enabled
        if (sortMetrics) {
          metricNames.sort((a, b) => 
            getMetricDisplayName(a).localeCompare(getMetricDisplayName(b))
          );
        }
        
        metricNames.forEach(metric1 => {
          const row = [];
          
          metricNames.forEach(metric2 => {
            // For the same metric, correlation is 1
            if (metric1 === metric2) {
              row.push(1);
              return;
            }
            
            const values1 = metricValues[metric1];
            const values2 = metricValues[metric2];
            
            // Find common indices where both metrics have values
            const pairedValues = [];
            
            // Use the smallest dataset to avoid index out of bounds
            const minLength = Math.min(values1.length, values2.length);
            
            for (let i = 0; i < minLength; i++) {
              if (values1[i] !== null && values2[i] !== null) {
                pairedValues.push({ x: values1[i], y: values2[i] });
              }
            }
            
            if (pairedValues.length < 5) {
              // Not enough data for meaningful correlation
              row.push(null);
              return;
            }
            
            // Calculate Pearson correlation coefficient
            const correlation = calculatePearsonCorrelation(
              pairedValues.map(p => p.x),
              pairedValues.map(p => p.y)
            );
            
            row.push(correlation);
          });
          
          correlationMatrix.push(row);
        });
        
        setCorrelationData({
          matrix: correlationMatrix,
          metrics: metricNames
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error calculating correlation matrix:', err);
        setError('Failed to calculate correlations');
        setLoading(false);
      }
    }
  }, [data, metrics, sortMetrics, getMetricDisplayName]);
  
  // Calculate Pearson correlation coefficient
  const calculatePearsonCorrelation = (x, y) => {
    const n = x.length;
    
    if (n < 5) return null; // Require at least 5 data points for meaningful correlation
    
    // Calculate means
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate correlation
    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = y[i] - yMean;
      
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }
    
    if (xDenominator === 0 || yDenominator === 0) {
      return 0; // Avoid division by zero
    }
    
    const correlation = numerator / Math.sqrt(xDenominator * yDenominator);
    
    // Limit to range [-1, 1] to handle floating point errors
    return Math.max(-1, Math.min(1, correlation));
  };
  
  // Handle clicking on a correlation cell
  const handleCellClick = useCallback((i, j) => {
    if (i !== j && correlationData) {
      const metric1 = correlationData.metrics[i];
      const metric2 = correlationData.metrics[j];
      const correlation = correlationData.matrix[i][j];
      
      setSelectedCell({
        metric1,
        metric2,
        correlation
      });
      
      // Call the callback with the selected metrics
      onMetricRelationshipSelect({
        metric1,
        metric2,
        correlation
      });
    }
  }, [correlationData, onMetricRelationshipSelect]);
  
  // Get interpretation of correlation value
  const getCorrelationInterpretation = useCallback((value) => {
    const absValue = Math.abs(value);
    
    if (absValue >= 0.8) return 'Very strong';
    if (absValue >= 0.6) return 'Strong';
    if (absValue >= 0.4) return 'Moderate';
    if (absValue >= 0.2) return 'Weak';
    return 'Very weak';
  }, []);
  
  // Get color for correlation value
  const getCorrelationColor = useCallback((value, isDark) => {
    const absValue = Math.abs(value);
    
    if (value > 0) {
      // Positive correlations - green spectrum
      if (absValue >= 0.8) return isDark ? 'text-green-400' : 'text-green-600';
      if (absValue >= 0.6) return isDark ? 'text-green-500' : 'text-green-500';
      if (absValue >= 0.4) return isDark ? 'text-emerald-400' : 'text-emerald-500';
      if (absValue >= 0.2) return isDark ? 'text-teal-400' : 'text-teal-500';
      return isDark ? 'text-gray-400' : 'text-gray-500';
    } else {
      // Negative correlations - red spectrum
      if (absValue >= 0.8) return isDark ? 'text-red-400' : 'text-red-600';
      if (absValue >= 0.6) return isDark ? 'text-red-500' : 'text-red-500';
      if (absValue >= 0.4) return isDark ? 'text-rose-400' : 'text-rose-500';
      if (absValue >= 0.2) return isDark ? 'text-pink-400' : 'text-pink-500';
      return isDark ? 'text-gray-400' : 'text-gray-500';
    }
  }, []);
  
  // Prepare plot data for Plotly
  const plotData = useMemo(() => {
    if (!correlationData) return null;
    
    const { matrix, metrics } = correlationData;
    
    // Create enhanced color scale based on theme
    const colorscale = isDarkMode
      ? [
          [0, 'rgb(220, 38, 38)'],     // Dark red
          [0.25, 'rgb(148, 41, 57)'],   // Muted red
          [0.5, 'rgb(42, 46, 60)'],     // Dark gray
          [0.75, 'rgb(39, 78, 90)'],    // Muted teal
          [1, 'rgb(16, 185, 129)']      // Green
        ]
      : [
          [0, 'rgb(239, 68, 68)'],     // Red
          [0.25, 'rgb(252, 165, 165)'], // Light red
          [0.5, 'rgb(229, 231, 235)'],  // Light gray
          [0.75, 'rgb(153, 246, 228)'], // Light teal
          [1, 'rgb(16, 185, 129)']      // Green
        ];
    
    // Format display labels
    const labels = metrics.map(getMetricDisplayName);
    
    return [{
      z: matrix,
      x: labels,
      y: labels,
      zmin: -1,
      zmax: 1,
      type: 'heatmap',
      colorscale: colorscale,
      reversescale: false,
      colorbar: {
        title: 'Correlation',
        titleside: 'right',
        thickness: 15,
        len: 0.5,
        y: 0.5,
        tickvals: [-1, -0.5, 0, 0.5, 1],
        ticktext: ['-1', '-0.5', '0', '0.5', '1'],
        tickfont: {
          color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'
        }
      },
      hoverinfo: 'none',
      showscale: true
    }];
  }, [correlationData, isDarkMode, getMetricDisplayName]);
  
  // Create annotations for the heatmap
  const annotations = useMemo(() => {
    if (!correlationData || !annotateValues) return [];
    
    const { matrix, metrics } = correlationData;
    const annotations = [];
    
    for (let i = 0; i < metrics.length; i++) {
      for (let j = 0; j < metrics.length; j++) {
        if (matrix[i][j] !== null) {
          const color = Math.abs(matrix[i][j]) > 0.5
            ? (isDarkMode ? 'white' : 'black')
            : (isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)');
          
          // Create annotation object with appropriate font sizes for readability
          annotations.push({
            xref: 'x',
            yref: 'y',
            x: getMetricDisplayName(metrics[j]),
            y: getMetricDisplayName(metrics[i]),
            text: matrix[i][j].toFixed(2),
            font: {
              color: color,
              size: 10
            },
            showarrow: false
          });
        }
      }
    }
    
    return annotations;
  }, [correlationData, isDarkMode, annotateValues, getMetricDisplayName]);
  
  // Configure plot layout
  const layout = useMemo(() => {
    return {
      title: {
        text: 'Air Quality Metric Correlations',
        font: {
          size: 16,
          color: isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'
        }
      },
      width: '100%',
      height: height,
      margin: {
        l: 60,
        r: 50,
        b: 60,
        t: 80,
        pad: 4
      },
      xaxis: {
        title: {
          text: 'Air Quality Metrics',
          font: {
            size: 13,
            color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
          }
        },
        tickfont: {
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
        },
        gridcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      },
      yaxis: {
        title: {
          text: 'Air Quality Metrics',
          font: {
            size: 13,
            color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
          }
        },
        tickfont: {
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
        },
        gridcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      },
      annotations: annotations,
      plot_bgcolor: isDarkMode ? 'rgba(26, 32, 44, 0.8)' : 'rgba(247, 250, 252, 0.8)',
      paper_bgcolor: isDarkMode ? 'rgb(26, 32, 44)' : 'rgb(255, 255, 255)',
      font: {
        color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'
      },
      hovermode: 'closest'
    };
  }, [isDarkMode, annotations, height]);
  
  // Configuration for Plotly
  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'resetScale2d'],
    responsive: true
  };
  
  // Handle hover events on the heatmap
  const handleHover = useCallback((eventData) => {
    if (eventData && eventData.points && eventData.points.length > 0) {
      const point = eventData.points[0];
      const i = correlationData.metrics.findIndex(
        metric => getMetricDisplayName(metric) === point.y
      );
      const j = correlationData.metrics.findIndex(
        metric => getMetricDisplayName(metric) === point.x
      );
      
      if (i !== -1 && j !== -1 && i !== j) {
        const metric1 = correlationData.metrics[i];
        const metric2 = correlationData.metrics[j];
        const correlation = correlationData.matrix[i][j];
        
        if (correlation !== null) {
          setHoverInfo({
            metric1: getMetricDisplayName(metric1),
            metric2: getMetricDisplayName(metric2),
            correlation: correlation.toFixed(2),
            interpretation: getCorrelationInterpretation(correlation),
            x: eventData.event.clientX,
            y: eventData.event.clientY
          });
          
          setIsTooltipVisible(true);
        }
      }
    }
  }, [correlationData, getMetricDisplayName, getCorrelationInterpretation]);
  
  // Handle end of hover
  const handleUnhover = useCallback(() => {
    setIsTooltipVisible(false);
  }, []);
  
  // Handle clicks on the heatmap
  const handlePlotClick = useCallback((eventData) => {
    if (eventData && eventData.points && eventData.points.length > 0) {
      const point = eventData.points[0];
      const i = correlationData.metrics.findIndex(
        metric => getMetricDisplayName(metric) === point.y
      );
      const j = correlationData.metrics.findIndex(
        metric => getMetricDisplayName(metric) === point.x
      );
      
      if (i !== -1 && j !== -1) {
        handleCellClick(i, j);
      }
    }
  }, [correlationData, getMetricDisplayName, handleCellClick]);
  
  // Reset the selected cell
  const handleReset = useCallback(() => {
    setSelectedCell(null);
    onMetricRelationshipSelect(null);
  }, [onMetricRelationshipSelect]);
  
  // Toggle sorting metrics
  const handleToggleSort = useCallback(() => {
    setSortMetrics(prev => !prev);
  }, []);
  
  // Tooltip content for the info icon
  const tooltipContent = (
    <div className="max-w-xs text-sm p-2">
      <p className="mb-2">Correlation strength interpretation:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><span className="font-semibold">0.8-1.0:</span> Very strong correlation</li>
        <li><span className="font-semibold">0.6-0.8:</span> Strong correlation</li>
        <li><span className="font-semibold">0.4-0.6:</span> Moderate correlation</li>
        <li><span className="font-semibold">0.2-0.4:</span> Weak correlation</li>
        <li><span className="font-semibold">0.0-0.2:</span> Very weak or no correlation</li>
      </ul>
      <p className="mt-2">The sign (+ or -) indicates direction:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><span className="text-green-500">Positive:</span> As one increases, so does the other</li>
        <li><span className="text-red-500">Negative:</span> As one increases, the other decreases</li>
      </ul>
      <p className="mt-2">Click on any cell to explore the relationship between metrics.</p>
    </div>
  );
  
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center w-full h-${Math.max(200, height/2)}px ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <ArrowPathIcon className="animate-spin h-8 w-8 mb-4" />
        <span>Calculating correlations...</span>
        <span className="text-sm mt-2 text-gray-500">This may take a moment</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`p-4 border rounded-md ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
        <p className="flex items-center">
          <QuestionMarkCircleIcon className="h-5 w-5 mr-2" />
          {error}
        </p>
        <p className="text-sm mt-2">
          Please ensure that your dataset contains at least 5 data points with valid numerical values for at least 2 air quality metrics.
        </p>
      </div>
    );
  }
  
  return (
    <div className={`relative ${isDarkMode ? 'text-gray-200 bg-gray-900' : 'text-gray-800 bg-white'} rounded-lg shadow-md p-4`}>
      <div className="flex flex-row justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium">Correlation Analysis</h3>
          <div
            className="cursor-help text-gray-500 dark:text-gray-400"
            data-tooltip-id="correlation-info"
            data-tooltip-content="Correlation measures the relationship strength between two variables. Values range from -1 (perfect negative) to +1 (perfect positive), with 0 indicating no correlation."
          >
            <InformationCircleIcon className="h-5 w-5" />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={annotateValues}
              onChange={() => setAnnotateValues(!annotateValues)}
              className="mr-2"
            />
            Show values
          </label>
          
          <label className="flex items-center text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={sortMetrics}
              onChange={handleToggleSort}
              className="mr-2"
            />
            Sort metrics
          </label>
          
          {selectedCell && (
            <button 
              onClick={handleReset}
              className={`px-2 py-1 text-sm rounded-md transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Reset selection
            </button>
          )}
        </div>
      </div>
      
      {selectedCell && (
        <div className={`mb-4 p-4 rounded-md ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-300'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h4 className="font-medium text-md mb-1">Selected Relationship</h4>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">{getMetricDisplayName(selectedCell.metric1)}</span>
                <span>and</span>
                <span className="font-semibold">{getMetricDisplayName(selectedCell.metric2)}</span>
              </div>
            </div>
            
            <div className="mt-2 sm:mt-0">
              <h4 className="font-medium text-md mb-1">Correlation Coefficient</h4>
              <span 
                className={`text-xl font-bold ${getCorrelationColor(selectedCell.correlation, isDarkMode)}`}
              >
                {selectedCell.correlation.toFixed(2)}
              </span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                Math.abs(selectedCell.correlation) > 0.6
                  ? (selectedCell.correlation > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                  : Math.abs(selectedCell.correlation) > 0.3
                    ? (selectedCell.correlation > 0 ? 'bg-teal-100 text-teal-800' : 'bg-pink-100 text-pink-800')
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {getCorrelationInterpretation(selectedCell.correlation)}
                {selectedCell.correlation > 0 ? ' positive' : ' negative'}
              </span>
            </div>
          </div>
          
          <div className="mt-3 text-sm">
            <p>
              {selectedCell.correlation > 0 
                ? `Higher values in ${getMetricDisplayName(selectedCell.metric1)} tend to be associated with higher values in ${getMetricDisplayName(selectedCell.metric2)}.`
                : `Higher values in ${getMetricDisplayName(selectedCell.metric1)} tend to be associated with lower values in ${getMetricDisplayName(selectedCell.metric2)}.`
              }
            </p>
          </div>
        </div>
      )}
      
      {correlationData && plotData && (
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          onHover={handleHover}
          onUnhover={handleUnhover}
          onClick={handlePlotClick}
          className="w-full rounded-md"
        />
      )}
      
      {isTooltipVisible && hoverInfo && (
        <div 
          className={`absolute z-10 p-3 rounded-md shadow-lg text-sm ${
            isDarkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-800 border border-gray-200'
          }`}
          style={{
            left: `${hoverInfo.x + 10}px`,
            top: `${hoverInfo.y + 10}px`,
            pointerEvents: 'none'
          }}
        >
          <p className="font-semibold mb-1">
            {hoverInfo.metric1} vs {hoverInfo.metric2}
          </p>
          <p className={`font-bold ${getCorrelationColor(parseFloat(hoverInfo.correlation), isDarkMode)}`}>
            Correlation: {hoverInfo.correlation}
          </p>
          <p className="text-xs mt-1">
            {hoverInfo.interpretation} {parseFloat(hoverInfo.correlation) > 0 ? 'positive' : 'negative'} relationship
          </p>
          <p className="text-xs mt-2 italic">(Click to explore)</p>
        </div>
      )}
      
      {correlationData && correlationData.metrics.length > 0 && (
        <div className={`mt-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>Based on {data.length} data points and {correlationData.metrics.length} metrics</p>
        </div>
      )}
    </div>
  );
};

export default CorrelationHeatmap;