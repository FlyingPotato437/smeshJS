"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { useRouter } from 'next/navigation';
import useDataUpload from '../../hooks/useDataUpload';

export default function UploadPage() {
  const [data, setData] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({ start: null, end: null });
  const [filteredData, setFilteredData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [databaseError, setDatabaseError] = useState(null);
  const router = useRouter();
  const { uploadData, isUploading, uploadError, uploadResult } = useDataUpload();

  // Handle the upload of parsed CSV data
  const handleUpload = async (parsedData) => {
    try {
      // Reset any previous errors
      setStorageError(false);
      setDatabaseError(null);
      
      // Set data without any additional processing
      setData(parsedData);
      setShowDatePicker(true);
      
      // Find date range in the data if datetime column exists
      if (parsedData && parsedData.length > 0 && parsedData[0].datetime) {
        try {
          let minTimestamp = Number.MAX_SAFE_INTEGER;
          let maxTimestamp = Number.MIN_SAFE_INTEGER;
          
          // Use a simple loop to find min/max dates
          for (let i = 0; i < Math.min(1000, parsedData.length); i++) {
            if (parsedData[i].datetime) {
              const timestamp = new Date(parsedData[i].datetime).getTime();
              if (!isNaN(timestamp)) {
                minTimestamp = Math.min(minTimestamp, timestamp);
                maxTimestamp = Math.max(maxTimestamp, timestamp);
              }
            }
          }
          
          // Only set the date range if we found valid dates
          if (minTimestamp !== Number.MAX_SAFE_INTEGER && maxTimestamp !== Number.MIN_SAFE_INTEGER) {
            setSelectedDateRange({
              start: new Date(minTimestamp),
              end: new Date(maxTimestamp)
            });
          }
        } catch (error) {
          console.error("Error processing dates:", error);
        }
      }
      
      // Upload a sample of the data to Supabase via API (max 5000 records)
      // This avoids uploading the entire dataset which could be very large
      const MAX_UPLOAD_RECORDS = 5000;
      const dataToUpload = parsedData.length > MAX_UPLOAD_RECORDS 
        ? parsedData.slice(0, MAX_UPLOAD_RECORDS) 
        : parsedData;
      
      console.log(`Uploading sample of ${dataToUpload.length} records out of ${parsedData.length} total records to API`);
      
      const result = await uploadData(dataToUpload);
      console.log('Upload result:', result);
      
      if (result.error) {
        // Check if it's a schema-related error
        if (result.error.includes('column') || result.error.includes('schema')) {
          setDatabaseError({
            message: result.error,
            type: 'schema'
          });
        } else {
          setStorageError(true);
        }
      }
      
      // Store data handling - simplified 
      if (typeof window !== 'undefined') {
        try {
          const dataSummary = {
            count: parsedData.length,
            sampleUploaded: dataToUpload.length,
            columnNames: parsedData.length > 0 ? Object.keys(parsedData[0]) : [],
            timestamp: Date.now(),
            dataSource: 'database', // Indicate that data is stored in database
            uploadId: result.uploadId || Date.now().toString() // Use upload ID from result or generate a timestamp
          };
          
          localStorage.setItem('airQualityDataSummary', JSON.stringify(dataSummary));
          
          // Only store metadata and reference to database - NOT the full dataset
          const dataReference = {
            count: parsedData.length,
            source: 'database',
            uploadId: result.uploadId || Date.now().toString(),
            hasBeenUploaded: result.success || false
          };
          
          sessionStorage.setItem('dataReference', JSON.stringify(dataReference));
        } catch (e) {
          console.error("Error storing data reference in localStorage:", e);
          setStorageError(true);
        }
      }
      console.log('Data uploaded:', parsedData?.length || 0, 'records');
    } catch (error) {
      console.error("Error in handleUpload:", error);
      setStorageError(true);
    }
  };

  const handleDateRangeChange = (type, date) => {
    setSelectedDateRange(prev => ({
      ...prev,
      [type]: date
    }));
  };

  const applyDateFilter = async () => {
    if (!data || !selectedDateRange.start || !selectedDateRange.end) return;
    
    setIsProcessing(true);
    
    // Filter data based on selected date range
    try {
      const startDate = new Date(selectedDateRange.start);
      const endDate = new Date(selectedDateRange.end);
      
      const filtered = [];
      // Use for loop instead of filter/map to avoid excessive object creation
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!item.datetime) {
          filtered.push(item);
          continue;
        }
        
        try {
          const itemDate = new Date(item.datetime);
          if (itemDate >= startDate && itemDate <= endDate) {
            filtered.push(item);
          }
        } catch (e) {
          console.error("Error filtering date:", e, item.datetime);
          filtered.push(item); // Include items that can't be parsed
        }
      }
      
      setFilteredData(filtered);
      
      // Upload the filtered data to the Supabase backend
      try {
        console.log('Uploading filtered data to Supabase...');
        
        // Convert filtered data to CSV
        const csvData = convertToCSV(filtered);
        
        // Create a File object from CSV string
        const csvFile = new File([csvData], "filtered_data.csv", { type: "text/csv" });
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', csvFile);
        
        // Add date range to formData
        formData.append('startDate', startDate.toISOString().split('T')[0]);
        formData.append('endDate', endDate.toISOString().split('T')[0]);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload data');
        }
        
        console.log('Upload result:', result);
        
        // Store only reference data for UI purposes
        if (typeof window !== 'undefined') {
          try {
            // Store a reference or summary instead of the full data
            const filteredSummary = {
              count: filtered.length,
              dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
              },
              timestamp: Date.now(),
              uploadedToSupabase: result.success ? true : false,
              filterId: result.filterId || startDate.toISOString() + '_' + endDate.toISOString(),
              dataSource: 'database'
            };
            
            localStorage.setItem('filteredDataSummary', JSON.stringify(filteredSummary));
            
            // Store only reference data, not the full dataset
            const dataReference = {
              count: filtered.length,
              dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
              },
              source: 'database',
              filterId: result.filterId || startDate.toISOString() + '_' + endDate.toISOString()
            };
            
            sessionStorage.setItem('dataReference', JSON.stringify(dataReference));
          } catch (e) {
            console.error("Error storing filtered summary:", e);
            setStorageError(true);
          }
        }
      } catch (error) {
        console.error("Error uploading to Supabase:", error);
        setStorageError(true);
        
        // Fall back to local storage only
        if (typeof window !== 'undefined') {
          try {
            const filteredSummary = {
              count: filtered.length,
              dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
              },
              timestamp: Date.now(),
              uploadedToSupabase: false,
              error: true
            };
            
            localStorage.setItem('filteredDataSummary', JSON.stringify(filteredSummary));
            
            // In case of error, we still need to reference some data
            // But make it clear there was an upload issue
            const dataReference = {
              count: filtered.length,
              dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
              },
              source: 'error',
              error: true,
              message: 'Upload failed. Data may be incomplete.'
            };
            
            sessionStorage.setItem('dataReference', JSON.stringify(dataReference));
          } catch (e) {
            console.error("Error storing filtered data:", e);
            setStorageError(true);
          }
        }
      }
    } catch (error) {
      console.error("Error in date filtering:", error);
    }
    
    setTimeout(() => {
      setIsProcessing(false);
      setProcessingComplete(true);
      
      // Automatically redirect after a short delay
      setTimeout(() => {
        router.push('/map');
      }, 2000);
    }, 1500); // Simulate processing time
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  };
  
  /**
   * Convert array of objects to CSV string
   * @param {Array} data - Array of objects to convert
   * @returns {string} CSV string
   */
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] !== null && row[header] !== undefined ? row[header] : '';
        // Handle values with commas by wrapping in quotes
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Upload Air Quality Data</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Upload your CSV data files containing air quality measurements. We support various formats with columns for pollutants, timestamps, and geographic information.
          </p>
        </div>
        
        {storageError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-6 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-300 font-medium">
                Browser storage limit reached. Consider using a smaller dataset or wait for our Supabase backend implementation.
              </p>
            </div>
          </div>
        )}
        
        {databaseError && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 mb-6 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-500 mr-2 mt-0.5" />
              <div>
                <p className="text-amber-700 dark:text-amber-300 font-medium">
                  Database schema issue detected
                </p>
                <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">
                  {databaseError.message}
                </p>
                <div className="mt-2">
                  <a 
                    href="/supabase/README.md" 
                    target="_blank" 
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium inline-flex items-center"
                  >
                    View Supabase setup instructions
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 1: File Upload */}
        {!showDatePicker && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">1</div>
              <h2 className="ml-3 text-xl font-semibold text-gray-800 dark:text-gray-200">Upload Your Data</h2>
            </div>
            <FileUpload 
              onUpload={handleUpload} 
              maxFiles={3} 
              maxSize={100} 
              acceptedFileTypes={["text/csv", "application/vnd.ms-excel"]} 
            />
          </div>
        )}
        
        {/* Step 2: Date Range Selection */}
        {showDatePicker && !processingComplete && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-300 animate-fadeIn">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">2</div>
              <h2 className="ml-3 text-xl font-semibold text-gray-800 dark:text-gray-200">Select Date Range</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your data contains {data?.length || 0} records. 
                You can filter by date range to analyze specific time periods.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5"
                      value={selectedDateRange.start ? new Date(selectedDateRange.start).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleDateRangeChange('start', new Date(e.target.value))}
                    />
                  </div>
                  {selectedDateRange.start && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(selectedDateRange.start)}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5"
                      value={selectedDateRange.end ? new Date(selectedDateRange.end).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleDateRangeChange('end', new Date(e.target.value))}
                    />
                  </div>
                  {selectedDateRange.end && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(selectedDateRange.end)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Upload
              </button>
              
              <button
                onClick={applyDateFilter}
                disabled={!selectedDateRange.start || !selectedDateRange.end || isProcessing}
                className={`flex items-center px-6 py-2.5 rounded-lg text-white font-medium transition-all ${
                  !selectedDateRange.start || !selectedDateRange.end || isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Apply Filter
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Processing Complete */}
        {processingComplete && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-all duration-300 animate-fadeIn">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Processing Complete!</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Successfully processed {filteredData?.length || 0} records in the selected date range.
                Redirecting you to the map view...
              </p>
              <div className="w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
                <div className="bg-primary-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
            <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-300">Data Format Tips</h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">For best results, your CSV should include some of the following columns:</p>
            <ul className="list-disc pl-5 text-blue-700 dark:text-blue-300 space-y-1 text-sm">
              <li>Timestamp/Date columns (for time-series analysis)</li>
              <li>Pollutant measurements (PM2.5, PM10, NO2, O3, etc.)</li>
              <li>Geographic coordinates (latitude, longitude) for map visualization</li>
              <li>Location identifiers (station names, city, etc.)</li>
              <li>Temperature, humidity, and other meteorological data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 