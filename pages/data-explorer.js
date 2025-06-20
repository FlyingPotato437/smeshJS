import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import { RefreshCw, Calendar, Filter, BarChart2, Table, Database, AlertTriangle, Info, List, Grid, ChevronDown, ChevronUp, TrendingUp, PieChart, Wind, CloudRain, ThermometerSun, Droplets, Globe } from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Lazy load components only when needed - prevents bundle bloat
const ChartLoadingFallback = () => (
  <div className="w-full h-[400px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="w-8 h-8 border-3 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
    <p className="ml-3 text-gray-600 dark:text-gray-300">Loading chart...</p>
  </div>
);

// Load components on demand to improve initial page load
const TimeSeriesChart = dynamic(() => import('../components/TimeSeriesChart'), { 
  ssr: false,
  loading: ChartLoadingFallback
});
const CorrelationHeatmap = dynamic(() => import('../components/CorrelationHeatmap'), { 
  ssr: false,
  loading: ChartLoadingFallback
});
const AirQualityDashboard = dynamic(() => import('../components/AirQualityDashboard'), { 
  ssr: false,
  loading: ChartLoadingFallback
});
const BoxPlotChart = dynamic(() => import('../components/BoxPlotChart'), { 
  ssr: false,
  loading: ChartLoadingFallback
});
const ScatterPlotMatrix = dynamic(() => import('../components/ScatterPlotMatrix'), { 
  ssr: false,
  loading: ChartLoadingFallback
});
const AirQualityMap = dynamic(() => import('../components/AirQualityLeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="w-8 h-8 border-3 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
      <p className="ml-3 text-gray-600 dark:text-gray-300">Loading map...</p>
    </div>
  )
});

export default function DataExplorerPage() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null,
  });
  const [selectedSensors, setSelectedSensors] = useState([]);
  const [availableSensors, setAvailableSensors] = useState([]);
  const [showFilters, setShowFilters] = useState(true);
  const [metrics, setMetrics] = useState(['pm25Standard', 'pm10Standard', 'temperature', 'relativeHumidity']);
  const [selectedMetrics, setSelectedMetrics] = useState(['pm25Standard']);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeSeriesOptions, setTimeSeriesOptions] = useState({
    aggregation: 'hourly', // none, hourly, daily, weekly
    smoothing: 0, // 0 = none, 1-10 = smoothing level
    showTrend: true
  });
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [isOffline, setIsOffline] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Grid className="w-4 h-4" /> },
    { id: 'time-series', label: 'Time Series', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'distribution', label: 'Distribution', icon: <PieChart className="w-4 h-4" /> },
    { id: 'correlation', label: 'Correlation', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'table', label: 'Data Table', icon: <Table className="w-4 h-4" /> },
    { id: 'map', label: 'Map', icon: <Globe className="w-4 h-4" /> },
  ];
  
  const metricIcons = {
    pm1Standard: <Wind className="w-4 h-4" />,
    pm25Standard: <Wind className="w-4 h-4" />,
    pm10Standard: <CloudRain className="w-4 h-4" />,
    pm100Standard: <CloudRain className="w-4 h-4" />,
    temperature: <ThermometerSun className="w-4 h-4" />,
    relativeHumidity: <Droplets className="w-4 h-4" />,
    barometricPressure: <BarChart2 className="w-4 h-4" />,
    gasResistance: <Wind className="w-4 h-4" />,
    iaq: <BarChart2 className="w-4 h-4" />,
    voc: <Wind className="w-4 h-4" />,
    co2: <CloudRain className="w-4 h-4" />
  };
  
  const metricDisplayNames = {
    pm1Standard: 'PM1',
    pm25Standard: 'PM2.5',
    pm10Standard: 'PM10', 
    pm100Standard: 'PM100',
    temperature: 'Temperature',
    relativeHumidity: 'Humidity',
    barometricPressure: 'Pressure',
    gasResistance: 'Gas Res.',
    iaq: 'IAQ',
    voc: 'VOC',
    co2: 'CO2'
  };

  // Optimized data fetching with better error handling and timeouts
  const fetchData = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching air quality data directly from legacy schema...');
      
      // Use air_quality table directly since normalized schema is broken
      let query = supabase
        .from('air_quality')
        .select('*');
      
      if (filters.dateStart) {
        query = query.gte('datetime', filters.dateStart.toISOString());
      }
      if (filters.dateEnd) {
        query = query.lte('datetime', filters.dateEnd.toISOString());
      }
      if (filters.sensors && filters.sensors.length > 0) {
        query = query.in('from_node', filters.sensors);
      }
      
      // Don't filter out 0 values - they might be valid readings
      // Only filter out clearly invalid data
      query = query
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .neq('latitude', 0)
        .neq('longitude', 0);
      
      // Order by datetime descending and limit for performance
      query = query.order('datetime', { ascending: false }).limit(5000);
      
      const { data: rawData, error: supabaseError } = await query;
      
      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }
      
      if (!rawData || rawData.length === 0) {
        throw new Error('No data found in air_quality table.');
      }
      
      console.log(`✅ Fetched ${rawData.length} records from air_quality table`);
      processData(rawData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      setIsLoading(false);
    }
  }, []);
  
  const processData = (fetchedData) => {
    // Clean and normalize data with robust null handling
    const cleanedData = fetchedData.map(item => {
      // Handle missing datetime
      if (!item.datetime) {
        return { ...item, datetime: new Date().toISOString() };
      }
      
      // Convert numeric fields from strings to numbers if needed
      const numericFields = [
        'pm25', 'pm10', 'temperature', 'humidity', 'co2', 'voc', 'latitude', 'longitude', 'elevation', 'rxsnr', 'hoplimit', 'rxrssi', 'hopstart'
      ];
      
      numericFields.forEach(field => {
        if (item[field] !== null && item[field] !== undefined && typeof item[field] === 'string') {
          item[field] = parseFloat(item[field]);
        }
      });
      
      // Safely extract device information with null handling
      const deviceName = item.device?.name || item.from_node || `Device-${item.id}`;
      const deviceLat = item.device?.latitude || item.latitude || 0;
      const deviceLng = item.device?.longitude || item.longitude || 0;
      const deviceElevation = item.device?.elevation || item.elevation || 0;
      
      // Return all fields from the database with safe access
      return {
        id: item.id,
        datetime: item.datetime,
        from_node: deviceName,
        deviceId: deviceName,
        deviceName: deviceName,
        // All PM measurements
        pm1Standard: item.pm1,
        pm25Standard: item.pm25,
        pm10Standard: item.pm10,
        pm100Standard: item.pm100,
        // Weather data
        temperature: item.temperature,
        relativeHumidity: item.humidity,
        barometricPressure: item.barometricPressure,
        // Air quality data
        gasResistance: item.gasResistance,
        iaq: item.iaq,
        voc: item.voc,
        co2: item.co2,
        // Location data with safe fallbacks
        latitude: deviceLat,
        longitude: deviceLng,
        elevation: deviceElevation,
        // Network data
        rxsnr: item.rxsnr,
        hoplimit: item.hoplimit,
        rxrssi: item.rxrssi,
        hopstart: item.hopstart,
        from_short_name: deviceName,
        // Metadata
        created_at: item.created_at
      };
    });
    
    // Set the data
    setData(cleanedData);
    setFilteredData(cleanedData);
    
    // Extract sensors
    const sensors = [...new Set(cleanedData.map(item => item.from_node).filter(Boolean))];
    setAvailableSensors(sensors);
    setSelectedSensors(sensors);
    
    // Extract all available metrics
    const availableMetrics = [
      'pm1Standard', 'pm25Standard', 'pm10Standard', 'pm100Standard',
      'temperature', 'relativeHumidity', 'barometricPressure',
      'gasResistance', 'iaq', 'voc', 'co2'
    ].filter(metric => 
      cleanedData.some(item => item[metric] !== null && item[metric] !== undefined)
    );
    setMetrics(availableMetrics);
    
    // Set initial selected metrics to the most important ones
    if (selectedMetrics.length === 0) {
      setSelectedMetrics(['pm25Standard', 'temperature', 'relativeHumidity']);
    }
    
    // Extract date range - include ALL data
    if (cleanedData.length > 0) {
      const dates = cleanedData
        .filter(item => item.datetime)
        .map(item => new Date(item.datetime));
      
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        // Set date range to include all data
        setDateRange({
          start: minDate,
          end: maxDate,
        });
      }
    }
    
    setIsLoading(false);
  };
  
  // Monitor network status for wifi issues
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOffline(!online);
      setConnectionStatus(online ? 'online' : 'offline');
      console.log('Connection status:', online ? 'online' : 'offline');
    };

    // Initial check
    updateOnlineStatus();

    // Listen for network changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters when filter state changes
  useEffect(() => {
    // If no data yet, skip filtering
    if (data.length === 0) return;
    
    // Apply in-memory filtering
    let filtered = [...data];
    
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(item => {
        if (!item.datetime) return false;
        const itemDate = new Date(item.datetime);
        return itemDate >= dateRange.start && itemDate <= dateRange.end;
      });
    }
    
    if (selectedSensors.length > 0) {
      filtered = filtered.filter(item => 
        !item.from_node || selectedSensors.includes(item.from_node)
      );
    }
    
    setFilteredData(filtered);
  }, [data, dateRange, selectedSensors]);

  // Handle filter changes with server-side filtering
  const applyFilters = useCallback(() => {
    fetchData({
      dateStart: dateRange.start,
      dateEnd: dateRange.end,
      sensors: selectedSensors
    });
  }, [fetchData, dateRange, selectedSensors]);

  const handleDateRangeChange = (event) => {
    const { name, value } = event.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value ? new Date(value) : null
    }));
  };

  const handleToggleAllSensors = () => {
    setSelectedSensors(prev => 
      prev.length === availableSensors.length ? [] : [...availableSensors]
    );
  };

  const handleToggleSensor = (sensor) => {
    setSelectedSensors(prev => 
      prev.includes(sensor) ? prev.filter(s => s !== sensor) : [...prev, sensor]
    );
  };
  
  const handleToggleMetric = (metric) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };
  
  const handleRetry = () => {
    setError(null);
    fetchData();
  };
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <main className="min-h-screen">
      <Head>
        <title>Data Explorer | Air Quality Data Analyzer</title>
        <meta name="description" content="Explore and visualize your air quality data" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fadeDown text-center max-w-3xl mx-auto">
          <div className="inline-block p-3 bg-[#8C1515]/10 dark:bg-[#8C1515]/30 rounded-full mb-4">
            <Database className="h-8 w-8 text-[#8C1515] dark:text-[#f8d6d6]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-3">
            Fire Data Explorer
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Analyze prescribed fire operations, weather conditions, and burn outcomes with comprehensive data visualization.
          </p>
        </div>

        {/* Loading / No Data / Error States */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-md p-8 animate-fadeIn text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-red-800 dark:text-red-200 mb-2">Error Loading Data</h3>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button
              className="mt-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-md transition-colors duration-150 flex items-center mx-auto shadow-md hover:shadow-lg"
              onClick={handleRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-md p-8 animate-fadeIn text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-yellow-800 dark:text-yellow-200 mb-2">No Data Available</h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">There&apos;s no air quality data available to explore. Please upload data first.</p>
            <a href="/upload" className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150">
              Upload Data
            </a>
          </div>
        ) : (
          <div className="animate-fadeUp">
            {/* Connection Status Banner */}
            {isOffline && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-md flex items-center mb-6">
                <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 flex-shrink-0" />
                <div className="text-sm text-red-700 dark:text-red-200">
                  <p>You are currently offline. Showing cached data if available.</p>
                </div>
              </div>
            )}
            
            {/* Data Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 shadow-md flex items-center mb-6">
              <Info className="h-5 w-5 text-blue-500 dark:text-blue-300 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-200">
                <p>
                  <span className="font-medium">{filteredData.length.toLocaleString()}</span> records shown 
                  {data.length !== filteredData.length && ` (out of ${data.length.toLocaleString()} total)`}
                  {' '}from <span className="font-medium">{formatDate(dateRange.start)}</span> to{' '}
                  <span className="font-medium">{formatDate(dateRange.end)}</span>
                  {connectionStatus === 'offline' && ' (cached)'}
                </p>
              </div>
              <button 
                onClick={applyFilters}
                disabled={isOffline}
                className={`ml-auto px-3 py-1 text-xs rounded-md transition-colors shadow-sm ${
                  isOffline 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800'
                }`}
              >
                {isOffline ? 'Offline' : 'Apply Filters'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filters Sidebar */}
              <aside className="lg:col-span-1 animate-fadeIn">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden sticky top-4 border border-gray-100 dark:border-gray-700">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center">
                      <Filter className="w-5 h-5 mr-2 text-primary-500" />
                      Filters
                    </h2>
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className="text-gray-500 dark:text-gray-400 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                      {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {showFilters && (
                    <div className="p-4 space-y-6">
                      {/* Date Range Filter */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5 text-gray-500 dark:text-gray-400" />
                          Date Range
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                            <input
                              type="date"
                              name="start"
                              value={dateRange.start ? dateRange.start.toISOString().slice(0, 10) : ''}
                              onChange={handleDateRangeChange}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                            <input
                              type="date"
                              name="end"
                              value={dateRange.end ? dateRange.end.toISOString().slice(0, 10) : ''}
                              onChange={handleDateRangeChange}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Sensor Filter */}
                      {availableSensors.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sensors</h3>
                            <button
                              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-150"
                              onClick={handleToggleAllSensors}
                            >
                              {selectedSensors.length === availableSensors.length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {availableSensors.map(sensor => (
                              <div key={sensor} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`sensor-${sensor}`}
                                  checked={selectedSensors.includes(sensor)}
                                  onChange={() => handleToggleSensor(sensor)}
                                  className="h-4 w-4 text-primary-600 dark:text-primary-500 rounded focus:ring-primary-500 transition-colors duration-150"
                                />
                                <label htmlFor={`sensor-${sensor}`} className="ml-2 text-sm text-gray-600 dark:text-gray-400 truncate">
                                  {sensor}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Metrics Filter */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Metrics</h3>
                        <div className="flex flex-wrap gap-2">
                          {metrics.map(metric => (
                            <button
                              key={metric}
                              onClick={() => handleToggleMetric(metric)}
                              className={`px-3 py-1.5 text-xs rounded-full flex items-center border ${
                                selectedMetrics.includes(metric)
                                  ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/40 dark:border-primary-700 dark:text-primary-300'
                                  : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {metricIcons[metric] && <span className="mr-1">{metricIcons[metric]}</span>}
                              {metricDisplayNames[metric] || metric}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Time Series Options */}
                      {activeTab === 'time-series' && (
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Chart Options</h3>
                          
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Aggregation</label>
                            <select
                              value={timeSeriesOptions.aggregation}
                              onChange={e => setTimeSeriesOptions(prev => ({ ...prev, aggregation: e.target.value }))}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="none">None</option>
                              <option value="hourly">Hourly</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Smoothing</label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={timeSeriesOptions.smoothing}
                              onChange={e => setTimeSeriesOptions(prev => ({ ...prev, smoothing: parseInt(e.target.value) }))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>None</span>
                              <span>Medium</span>
                              <span>High</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="showTrend"
                              checked={timeSeriesOptions.showTrend}
                              onChange={e => setTimeSeriesOptions(prev => ({ ...prev, showTrend: e.target.checked }))}
                              className="h-4 w-4 text-primary-600 dark:text-primary-500 rounded focus:ring-primary-500"
                            />
                            <label htmlFor="showTrend" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                              Show Trend Line
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 flex">
                        <button
                          onClick={applyFilters}
                          className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors shadow-sm flex items-center justify-center"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
              
              {/* Main Visualization Area */}
              <main className="lg:col-span-3 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 animate-fadeUp">
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <nav className="-mb-px flex space-x-4 px-4" aria-label="Tabs">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`
                            ${activeTab === tab.id 
                              ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                          `}
                        >
                          <span className="mr-2">{tab.icon}</span>
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                  
                  {/* Visualization Content */}
                  <div className="p-4 md:p-6">
                    {activeTab === 'dashboard' && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Air Quality Dashboard</h3>
                        {filteredData.length > 0 ? (
                          <AirQualityDashboard data={filteredData} metrics={selectedMetrics} />
                        ) : (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No data available with the current filters.</p>
                          </div>
                        )}
                      </div>
                    )}
                  
                    {activeTab === 'time-series' && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Time Series Analysis</h3>
                        {filteredData.length > 0 ? (
                          <div className="h-[500px]">
                            <TimeSeriesChart 
                              data={filteredData} 
                              metrics={selectedMetrics}
                              options={timeSeriesOptions}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No data available with the current filters.</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'distribution' && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Data Distribution</h3>
                        {filteredData.length > 0 ? (
                          <div className="h-[500px]">
                            <BoxPlotChart data={filteredData} metrics={selectedMetrics} />
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No data available with the current filters.</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'correlation' && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Correlation Analysis</h3>
                        {filteredData.length > 0 ? (
                          selectedMetrics.length > 1 ? (
                            <div className="h-[600px]">
                              <ScatterPlotMatrix data={filteredData} metrics={selectedMetrics} />
                            </div>
                          ) : (
                            <div className="text-center py-12 text-yellow-500 dark:text-yellow-400">
                              <p>Please select at least two metrics to see correlations.</p>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No data available with the current filters.</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'table' && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Data Table</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                              <tr>
                                {/* Show specific important columns */}
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">DateTime</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sensor</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PM2.5</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PM10</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Temperature</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Humidity</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pressure</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Latitude</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Longitude</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IAQ</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">VOC</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CO2</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredData.slice(0, 50).map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.datetime ? new Date(row.datetime).toLocaleString() : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.from_node || 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.pm25Standard !== null && row.pm25Standard !== undefined ? row.pm25Standard.toFixed(1) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.pm10Standard !== null && row.pm10Standard !== undefined ? row.pm10Standard.toFixed(1) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.temperature !== null && row.temperature !== undefined ? `${row.temperature.toFixed(1)}°C` : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.relativeHumidity !== null && row.relativeHumidity !== undefined ? `${row.relativeHumidity.toFixed(1)}%` : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.barometricPressure !== null && row.barometricPressure !== undefined ? row.barometricPressure.toFixed(1) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.latitude !== null && row.latitude !== undefined ? row.latitude.toFixed(6) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.longitude !== null && row.longitude !== undefined ? row.longitude.toFixed(6) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.iaq !== null && row.iaq !== undefined ? row.iaq : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.voc !== null && row.voc !== undefined ? row.voc : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {row.co2 !== null && row.co2 !== undefined ? row.co2 : 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {filteredData.length > 50 && (
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                              Showing 50 of {filteredData.length} records
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {activeTab === 'map' && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Air Quality Map</h3>
                        {filteredData.length > 0 ? (
                          <div className="h-[600px]">
                            <AirQualityMap data={filteredData} height="600px" />
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No data available with the current filters.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </main>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}