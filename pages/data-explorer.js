import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import { RefreshCw, Calendar, Filter, BarChart2, Table, Database, AlertTriangle, Info, List, Grid, ChevronDown, ChevronUp, TrendingUp, PieChart, Wind, CloudRain, ThermometerSun, Droplets, Globe } from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Dynamically import chart components
const TimeSeriesChart = dynamic(() => import('../components/TimeSeriesChart'), { ssr: false });
const CorrelationHeatmap = dynamic(() => import('../components/CorrelationHeatmap'), { ssr: false });
const AirQualityDashboard = dynamic(() => import('../components/AirQualityDashboard'), { ssr: false });
const BoxPlotChart = dynamic(() => import('../components/BoxPlotChart'), { ssr: false });
const ScatterPlotMatrix = dynamic(() => import('../components/ScatterPlotMatrix'), { ssr: false });
const AirQualityMap = dynamic(() => import('../components/AirQualityLeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
      <p className="ml-3 text-gray-600 dark:text-gray-300">Loading map component...</p>
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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Grid className="w-4 h-4" /> },
    { id: 'time-series', label: 'Time Series', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'distribution', label: 'Distribution', icon: <PieChart className="w-4 h-4" /> },
    { id: 'correlation', label: 'Correlation', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'table', label: 'Data Table', icon: <Table className="w-4 h-4" /> },
    { id: 'map', label: 'Map', icon: <Globe className="w-4 h-4" /> },
  ];
  
  const metricIcons = {
    pm25Standard: <Wind className="w-4 h-4" />,
    pm10Standard: <CloudRain className="w-4 h-4" />,
    temperature: <ThermometerSun className="w-4 h-4" />,
    relativeHumidity: <Droplets className="w-4 h-4" />
  };

  // Function to fetch data from Supabase
  const fetchData = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to get data from localStorage first (for user uploaded data)
      const storedData = localStorage.getItem('filteredAirQualityData') || localStorage.getItem('airQualityData');
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        processData(parsedData);
      } else {
        // Construct query to Supabase
        let query = supabase.from('sensor_readings').select('*, devices(name, latitude, longitude)');
        
        // Apply filters
        if (filters.dateStart) {
          query = query.gte('timestamp', filters.dateStart.toISOString());
        }
        
        if (filters.dateEnd) {
          query = query.lte('timestamp', filters.dateEnd.toISOString());
        }
        
        if (filters.sensors && filters.sensors.length > 0) {
          query = query.in('device_id', filters.sensors);
        }
        
        // Limit to 10000 records for performance
        query = query.limit(10000);
        
        const { data: supabaseData, error: supabaseError } = await query;
        
        if (supabaseError) {
          throw new Error(supabaseError.message);
        }
        
        if (supabaseData && supabaseData.length > 0) {
          // Process and normalize the data from sensor_readings table
          const processedData = supabaseData.map(reading => ({
            id: reading.id,
            deviceId: reading.device_id,
            deviceName: reading.devices?.name || `Device ${reading.device_id}`,
            datetime: reading.timestamp,
            timestamp: reading.timestamp,
            from_node: reading.device_id, // For backward compatibility with existing filter UI
            latitude: reading.devices?.latitude,
            longitude: reading.devices?.longitude,
            pm25Standard: reading.pm25,
            pm10Standard: reading.pm10,
            temperature: reading.temperature,
            relativeHumidity: reading.humidity,
            voc: reading.voc,
            co2: reading.co2
          }));
          
          processData(processedData);
        } else {
          // Fallback to API if Supabase doesn't return data
          const response = await fetch('/api/data');
          if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
          }
          const result = await response.json();
          processData(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      setIsLoading(false);
    }
  }, []);
  
  const processData = (fetchedData) => {
    // Clean and normalize data
    const cleanedData = fetchedData.map(item => {
      // Handle missing datetime
      if (!item.datetime) {
        return { ...item, datetime: new Date().toISOString() };
      }
      
      // Convert numeric fields from strings to numbers if needed
      const numericFields = [
        'pm25Standard', 'pm10Standard', 'pm1Standard', 'pm100Standard',
        'temperature', 'relativeHumidity', 'pressure', 'iaq', 'voc', 'co2'
      ];
      
      numericFields.forEach(field => {
        if (typeof item[field] === 'string') {
          item[field] = parseFloat(item[field]);
        }
      });
      
      // Ensure latitude and longitude are available and numeric
      if (item.latitude && typeof item.latitude === 'string') {
        item.latitude = parseFloat(item.latitude);
      }
      
      if (item.longitude && typeof item.longitude === 'string') {
        item.longitude = parseFloat(item.longitude);
      }
      
      return item;
    });
    
    // Set the data
    setData(cleanedData);
    setFilteredData(cleanedData);
    
    // Extract sensors
    const sensors = [...new Set(cleanedData.map(item => item.from_node).filter(Boolean))];
    setAvailableSensors(sensors);
    setSelectedSensors(sensors);
    
    // Extract metrics
    const availableMetrics = Object.keys(cleanedData[0] || {}).filter(key => 
      ['pm25Standard', 'pm10Standard', 'pm1Standard', 'pm100Standard', 'temperature', 
       'relativeHumidity', 'pressure', 'iaq', 'voc', 'co2'].includes(key)
    );
    setMetrics(availableMetrics);
    
    // Extract date range
    if (cleanedData.length > 0 && cleanedData[0].datetime) {
      const dates = cleanedData
        .filter(item => item.datetime)
        .map(item => new Date(item.datetime));
      
      if (dates.length > 0) {
        setDateRange({
          start: new Date(Math.min(...dates)),
          end: new Date(Math.max(...dates)),
        });
      }
    }
    
    setIsLoading(false);
  };
  
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
          <div className="inline-block p-3 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
            <Database className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-3">
            Air Quality Data Explorer
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Explore and visualize your air quality data with interactive charts and filters.
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
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">There's no air quality data available to explore. Please upload data first.</p>
            <a href="/upload" className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150">
              Upload Data
            </a>
          </div>
        ) : (
          <div className="animate-fadeUp">
            {/* Data Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 shadow-md flex items-center mb-6">
              <Info className="h-5 w-5 text-blue-500 dark:text-blue-300 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-200">
                <p>
                  <span className="font-medium">{filteredData.length.toLocaleString()}</span> records shown 
                  {data.length !== filteredData.length && ` (out of ${data.length.toLocaleString()} total)`}
                  {' '}from <span className="font-medium">{formatDate(dateRange.start)}</span> to{' '}
                  <span className="font-medium">{formatDate(dateRange.end)}</span>
                </p>
              </div>
              <button 
                onClick={applyFilters}
                className="ml-auto px-3 py-1 text-xs bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors shadow-sm"
              >
                Apply Filters
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
                              {metric === 'pm25Standard' ? 'PM2.5' : 
                               metric === 'pm10Standard' ? 'PM10' : 
                               metric === 'relativeHumidity' ? 'Humidity' : 
                               metric}
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
                                {filteredData.length > 0 && Object.keys(filteredData[0]).slice(0, 10).map(key => (
                                  <th 
                                    key={key} 
                                    scope="col" 
                                    className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                  >
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredData.slice(0, 20).map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  {Object.keys(row).slice(0, 10).map(key => (
                                    <td key={key} className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                      {typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? 'N/A')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {filteredData.length > 20 && (
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                              Showing 20 of {filteredData.length} records
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