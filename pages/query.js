import { useState, useEffect } from 'react';
import Head from 'next/head';
import AiQuery from '../components/AiQuery';
import { Info, AlertTriangle, HelpCircle, Sparkles, FileQuestion, RotateCw } from 'lucide-react';

export default function QueryPage() {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [airQualityData, setAirQualityData] = useState([]);
  const [dataStats, setDataStats] = useState({
    totalRecords: 0,
    dateRange: { start: null, end: null },
    metrics: {}
  });

  // Check if there's data available to query
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching air quality data...');
        
        // First, try to get data from localStorage (uploaded by user)
        let parsedData = [];
        const storedData = localStorage.getItem('filteredAirQualityData') || 
                         localStorage.getItem('airQualityData') ||
                         sessionStorage.getItem('mapDisplayData');
        
        if (storedData) {
          console.log('Found data in browser storage');
          try {
            parsedData = JSON.parse(storedData);
            
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              console.log(`Loaded ${parsedData.length} records from browser storage`);
              setAirQualityData(parsedData);
              
              // Calculate simple stats from the parsed data
              const dates = parsedData
                .filter(item => item.datetime)
                .map(item => new Date(item.datetime));
              
              setDataStats({
                totalRecords: parsedData.length,
                dateRange: dates.length > 0 ? {
                  start: new Date(Math.min(...dates)),
                  end: new Date(Math.max(...dates))
                } : { start: null, end: null },
                metrics: {
                  pm25: calculateMetricStats(parsedData, 'pm25Standard'),
                  pm10: calculateMetricStats(parsedData, 'pm10Standard'),
                  temperature: calculateMetricStats(parsedData, 'temperature'),
                  humidity: calculateMetricStats(parsedData, 'relativeHumidity')
                }
              });
              
              setIsDataLoaded(parsedData.length > 0);
              setIsLoading(false);
              return;
            }
          } catch (parseError) {
            console.error('Error parsing stored data:', parseError);
            // Continue to fetch from API if parsing fails
          }
        }
        
        // Fallback to API data if no local data found or parsing failed
        console.log('No valid data in browser storage, fetching from API...');
        try {
          const response = await fetch('/api/data?limit=500');
          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
          
          const result = await response.json();
          console.log('API data fetch result:', result);
          
          if (result.data && Array.isArray(result.data)) {
            console.log(`Loaded ${result.data.length} records from API`);
            parsedData = result.data;
            setAirQualityData(parsedData);
            
            // Calculate stats for API data
            const dates = parsedData
              .filter(item => item.datetime)
              .map(item => new Date(item.datetime));
            
            setDataStats({
              totalRecords: result.count || parsedData.length,
              dateRange: dates.length > 0 ? {
                start: new Date(Math.min(...dates)),
                end: new Date(Math.max(...dates))
              } : { start: null, end: null },
              metrics: {
                pm25: calculateMetricStats(parsedData, 'pm25Standard', 'pm25standard', 'pm25'),
                pm10: calculateMetricStats(parsedData, 'pm10Standard', 'pm10standard', 'pm10'),
                temperature: calculateMetricStats(parsedData, 'temperature'),
                humidity: calculateMetricStats(parsedData, 'relativeHumidity', 'relativehumidity', 'humidity')
              }
            });
            
            setIsDataLoaded(parsedData.length > 0);
          } else {
            throw new Error('Invalid data format from API');
          }
        } catch (apiError) {
          console.error('API data fetch error:', apiError);
          setError('Could not fetch data: ' + apiError.message);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Enhanced metric stats calculation to handle multiple field names
  const calculateMetricStats = (data, ...fieldNames) => {
    // Try each field name until we find one that exists in the data
    let validFieldName = null;
    let values = [];
    
    for (const field of fieldNames) {
      values = data
        .map(item => item[field])
        .filter(val => val !== undefined && val !== null && !isNaN(Number(val)));
      
      if (values.length > 0) {
        validFieldName = field;
        break;
      }
    }
    
    if (values.length === 0) return { avg: 'N/A', min: 'N/A', max: 'N/A' };
    
    // Convert all values to numbers to ensure proper calculations
    const numericValues = values.map(val => Number(val));
    
    return {
      avg: (numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length).toFixed(2),
      min: Math.min(...numericValues).toFixed(2),
      max: Math.max(...numericValues).toFixed(2),
      field: validFieldName
    };
  };
  
  const formatDate = (date) => {
    if (!date) return 'unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // This will trigger the useEffect
    setDataStats({
      totalRecords: 0,
      dateRange: { start: null, end: null },
      metrics: {}
    });
  };

  return (
    <main className="min-h-screen">
      <Head>
        <title>AI Query | Air Quality Data Analyzer</title>
        <meta name="description" content="Ask questions about your air quality data using natural language" />
      </Head>

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 animate-fadeDown text-center max-w-3xl mx-auto">
          <div className="inline-block p-3 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-3">
            AI-Powered Query
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Ask questions about your air quality data in natural language and get AI-powered insights.
          </p>
        </div>

        {/* Loading / Error / No Data States */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md animate-pulse">
            <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Checking available data...</p>
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
              <RotateCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        ) : !isDataLoaded ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-md p-8 animate-fadeIn text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-yellow-800 dark:text-yellow-200 mb-2">No Data Available</h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">There's no air quality data available to query. Please upload data first.</p>
            <a href="/upload" className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150">
              Upload Data
            </a>
          </div>
        ) : (
          <div className="space-y-8 animate-fadeUp">
            {/* Data Available Info */}
            {dataStats.totalRecords > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 shadow-md flex items-center">
                <Info className="h-5 w-5 text-blue-500 dark:text-blue-300 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-200">
                  <p>
                    <span className="font-medium">{dataStats.totalRecords.toLocaleString()}</span> records available from {' '}
                    <span className="font-medium">{formatDate(dataStats.dateRange.start)}</span> to {' '}
                    <span className="font-medium">{formatDate(dataStats.dateRange.end)}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Data Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {dataStats.metrics && Object.entries(dataStats.metrics).map(([metric, stats], index) => {
                const metricLabels = {
                  pm25: { name: 'PM2.5', unit: 'μg/m³' },
                  pm10: { name: 'PM10', unit: 'μg/m³' },
                  temperature: { name: 'Temperature', unit: '°C' },
                  humidity: { name: 'Humidity', unit: '%' }
                };
                
                const label = metricLabels[metric] || { name: metric, unit: '' };
                
                return (
                  <div 
                    key={metric} 
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 shadow-sm animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{label.name}</h3>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Avg: <span className="font-medium text-gray-900 dark:text-white">{stats.avg} {label.unit}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Range: {stats.min} - {stats.max} {label.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Query Component */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-fadeUp">
              <AiQuery data={airQualityData} />
            </div>

            {/* Example Questions Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg animate-fadeUp" style={{ animationDelay: '100ms' }}>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-700 dark:text-gray-200 flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                  Example Questions
                </h3>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="animate-fadeIn" style={{ animationDelay: '100ms' }}>
                    <h4 className="text-base font-medium text-gray-800 dark:text-white mb-3">Measurements</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {[ "What is the average PM2.5 level across all sensors?", "How have PM10 levels changed over time?", "Show me the highest humidity readings recorded", "What is the distribution of temperature readings?", "Compare PM2.5 levels between different sensors" ].map(q => ( 
                        <li key={q} className="flex items-start">
                          <span className="text-primary-500 mr-2 mt-0.5">•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
                    <h4 className="text-base font-medium text-gray-800 dark:text-white mb-3">Spatial Analysis</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {[ "Where are the highest PM2.5 concentrations located?", "Show me all sensor locations on a map", "Is there a correlation between elevation and air quality?", "Which location has the most consistent air quality?", "Compare air quality between indoor and outdoor sensors" ].map(q => ( 
                        <li key={q} className="flex items-start">
                          <span className="text-primary-500 mr-2 mt-0.5">•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
                    <h4 className="text-base font-medium text-gray-800 dark:text-white mb-3">Relationships</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {[ "How does humidity affect PM2.5 levels?", "Is there a correlation between temperature and air quality?", "Show the relationship between different pollutant measurements", "Do indoor air quality levels vary with outdoor temperature?", "What factors most strongly influence IAQ readings?" ].map(q => ( 
                        <li key={q} className="flex items-start">
                          <span className="text-primary-500 mr-2 mt-0.5">•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="animate-fadeIn" style={{ animationDelay: '400ms' }}>
                    <h4 className="text-base font-medium text-gray-800 dark:text-white mb-3">Time-Based</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {[ "When was air quality at its worst?", "Is there a time of day pattern to PM2.5 levels?", "Show me the trend in temperature over the last month", "How do weekend measurements compare to weekdays?", "What are the daily average PM10 levels over time?" ].map(q => (
                        <li key={q} className="flex items-start">
                          <span className="text-primary-500 mr-2 mt-0.5">•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}