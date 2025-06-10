/**
 * Utility functions for chart and visualization components
 */

/**
 * Generate an optimized layout for time series charts
 * @param {boolean} isDarkMode - Whether dark mode is active
 * @param {string} title - Chart title
 * @param {object} options - Additional layout options
 * @returns {object} Plotly layout configuration
 */
export function getTimeSeriesLayout(isDarkMode, title = '', options = {}) {
  // Base colors for dark/light modes
  const baseColors = {
    dark: {
      background: 'rgba(26, 32, 44, 1)',
      text: 'rgba(237, 242, 247, 0.9)',
      gridLines: 'rgba(74, 85, 104, 0.3)',
      zeroLine: 'rgba(74, 85, 104, 0.5)'
    },
    light: {
      background: 'rgba(255, 255, 255, 1)',
      text: 'rgba(45, 55, 72, 0.9)',
      gridLines: 'rgba(160, 174, 192, 0.2)',
      zeroLine: 'rgba(113, 128, 150, 0.4)'
    }
  };

  const colors = isDarkMode ? baseColors.dark : baseColors.light;
  
  // Responsive layout that looks good on both mobile and desktop
  return {
    title: title ? {
      text: title,
      font: {
        family: 'Inter, system-ui, -apple-system, sans-serif',
        size: 16,
        color: colors.text
      },
      x: 0.01
    } : undefined,
    
    // Modern, clean styling
    font: {
      family: 'Inter, system-ui, -apple-system, sans-serif',
      color: colors.text
    },
    paper_bgcolor: colors.background,
    plot_bgcolor: colors.background,
    
    // Margins
    margin: {
      t: title ? 40 : 20,
      r: 20,
      b: 50,
      l: 50,
      pad: 0
    },
    
    // X axis (time)
    xaxis: {
      showgrid: true,
      gridcolor: colors.gridLines,
      gridwidth: 1,
      tickfont: { size: 10 },
      tickformat: '%b %d, %H:%M',
      zeroline: false,
      showline: false,
      fixedrange: options.fixedRangeX !== false,
    },
    
    // Y axis (metric value)
    yaxis: {
      showgrid: true,
      gridcolor: colors.gridLines,
      gridwidth: 1,
      tickfont: { size: 10 },
      zeroline: true,
      zerolinecolor: colors.zeroLine,
      zerolinewidth: 1,
      showline: false,
      fixedrange: options.fixedRangeY !== false,
    },
    
    // Hover interactions
    hovermode: 'closest',
    hoverlabel: {
      bgcolor: isDarkMode ? 'rgba(44, 55, 72, 0.95)' : 'rgba(247, 250, 252, 0.95)',
      font: { size: 11, color: colors.text },
      bordercolor: 'transparent',
    },
    
    // Legend styling
    showlegend: true,
    legend: {
      orientation: 'h',
      y: -0.15,
      x: 0.5,
      xanchor: 'center',
      font: { size: 10 },
      bgcolor: 'transparent',
    },
    
    // Make responsive
    autosize: true,
    
    // Merge in any additional options
    ...options,
  };
}

/**
 * Get color for a specific metric, optimized for both dark and light mode
 * @param {string} metric - The metric name
 * @param {boolean} isDarkMode - Whether dark mode is active
 * @returns {object} Color settings for the metric
 */
export function getMetricColors(metric, isDarkMode = false) {
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
      'default': {
        main: '#4CAF50',
        gradient: ['#A5D6A7', '#4CAF50', '#2E7D32'],
        ma: '#1B5E20',
        area: 'rgba(76, 175, 80, 0.1)'
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
      'default': {
        main: '#81C784',
        gradient: ['#C8E6C9', '#81C784', '#4CAF50'],
        ma: '#43A047',
        area: 'rgba(129, 199, 132, 0.15)'
      }
    }
  };

  const mode = isDarkMode ? 'dark' : 'light';
  return colorSchemes[mode][metric] || colorSchemes[mode].default;
}

/**
 * Creates a consistent format for timestamp fields in chart data
 * @param {Array} data - Array of data points
 * @param {string} dateField - Field name containing the date/time
 * @returns {Array} Data with standardized timestamps
 */
export function normalizeChartData(data, dateField = 'datetime') {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  
  return data.map(point => {
    const normalizedPoint = { ...point };
    
    // Ensure datetime is properly converted to Date object
    if (point[dateField]) {
      try {
        normalizedPoint[dateField] = new Date(point[dateField]);
      } catch (e) {
        console.warn('Invalid date format:', point[dateField]);
        normalizedPoint[dateField] = new Date(); // Fallback to current date
      }
    }
    
    // Convert any string numeric values to actual numbers
    Object.keys(point).forEach(key => {
      if (key !== dateField && typeof point[key] === 'string') {
        const num = Number(point[key]);
        if (!isNaN(num)) {
          normalizedPoint[key] = num;
        }
      }
    });
    
    return normalizedPoint;
  });
}

/**
 * Calculate moving average for a series of values
 * @param {Array} values - Array of numeric values
 * @param {number} windowSize - Size of moving average window
 * @returns {Array} Moving averages
 */
export function calculateMovingAverage(values, windowSize = 5) {
  if (!values || values.length === 0) return [];
  if (!windowSize || windowSize < 2) return values;
  
  const result = [];
  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      result.push(null); // Not enough data points yet
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
}
