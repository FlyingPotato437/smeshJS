"use client";

import { useState } from 'react';

/**
 * Hook for uploading data to the API
 * @returns {Object} Methods and state for handling data upload
 */
export default function useDataUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  /**
   * Upload data to the API
   * @param {Array} data - Array of data objects to upload
   * @returns {Promise<Object>} Upload result
   */
  const uploadData = async (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      setUploadError('No valid data provided');
      return { success: false, error: 'No valid data provided' };
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      console.log(`Uploading ${data.length} records to API...`);

      // Convert data to CSV format
      const csvData = convertToCSV(data);
      
      // Create a File object from the CSV string
      const csvFile = new File([csvData], "data.csv", { type: "text/csv" });
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok && response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload result:', result);
      
      setUploadResult(result);
      setIsUploading(false);
      
      return result;
    } catch (error) {
      console.error('Error uploading data:', error);
      setUploadError(error.message);
      setIsUploading(false);
      
      return { 
        success: false, 
        error: error.message,
        usingLocalStorage: true
      };
    }
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

  return {
    uploadData,
    isUploading,
    uploadError,
    uploadResult,
  };
} 