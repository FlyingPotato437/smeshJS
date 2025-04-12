"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { 
  FileText, 
  X, 
  Upload, 
  AlertCircle,
  BarChart,
  Wind,
  Table
} from "lucide-react";
import Papa from "papaparse";
import Link from "next/link";

function useFileUpload({
  onUpload,
  maxFiles = 3,
  maxSize = 100, // 100MB default (increased from 10MB)
  acceptedFileTypes = ["text/csv"],
} = {}) {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const [parsedData, setParsedData] = useState(null);
  
  const validateFile = useCallback(
    (file) => {
      const errors = [];
      
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        errors.push(`File ${file.name} exceeds the maximum size of ${maxSize}MB`);
      }

      // Check file type if specific types are provided
      if (
        acceptedFileTypes.length > 0 &&
        acceptedFileTypes[0] !== "*" &&
        !acceptedFileTypes.some(type => {
          if (type.includes("*")) {
            const mimePrefix = type.split("/")[0];
            return file.type.startsWith(mimePrefix + "/");
          }
          return file.type === type;
        })
      ) {
        errors.push(`File ${file.name} has an unsupported format. Please upload a CSV file.`);
      }

      return errors;
    },
    [maxSize, acceptedFileTypes]
  );

  const parseCSV = useCallback((file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length) {
            reject(results.errors.map(err => err.message).join(", "));
            return;
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(error.message);
        }
      });
    });
  }, []);

  const handleFileChange = useCallback(
    async (event) => {
      const newFiles = "dataTransfer" in event 
        ? Array.from(event.dataTransfer.files) 
        : Array.from(event.target.files || []);
      
      if (files.length + newFiles.length > maxFiles) {
        setErrors([`You can only upload a maximum of ${maxFiles} files`]);
        return;
      }

      const fileErrors = [];
      const validFiles = [];

      for (const file of newFiles) {
        const validationErrors = validateFile(file);
        if (validationErrors.length > 0) {
          fileErrors.push(...validationErrors);
        } else {
          validFiles.push(file);
        }
      }

      if (fileErrors.length > 0) {
        setErrors(fileErrors);
      }

      if (validFiles.length > 0) {
        // Create previews for valid files
        const newPreviews = [];
        const parsedResults = [];
        
        for (const file of validFiles) {
          const id = Math.random().toString(36).substring(2, 11);
          
          // Simulate upload progress
          simulateUploadProgress(id);
          
          try {
            const parsedData = await parseCSV(file);
            parsedResults.push(parsedData);
            newPreviews.push({ id, file, columns: Object.keys(parsedData[0] || {}) });
          } catch (error) {
            fileErrors.push(`Error parsing ${file.name}: ${error}`);
            continue;
          }
        }
        
        if (fileErrors.length > 0) {
          setErrors(fileErrors);
        }
        
        if (newPreviews.length > 0) {
          setFiles(prev => [...prev, ...validFiles]);
          setPreviews(prev => [...prev, ...newPreviews]);
          setParsedData(parsedResults[0]); // Use the first file's data
          onUpload?.(parsedResults[0]);
        }
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [files, maxFiles, onUpload, validateFile, parseCSV]
  );

  const simulateUploadProgress = useCallback((fileId) => {
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const currentProgress = prev[fileId] || 0;
        if (currentProgress >= 100) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, [fileId]: Math.min(currentProgress + 10, 100) };
      });
    }, 300);
  }, []);

  const handleRemoveFile = useCallback((id) => {
    setPreviews(prev => prev.filter(p => p.id !== id));
    
    setFiles(prev => {
      const fileToRemove = previews.find(p => p.id === id)?.file;
      return prev.filter(f => f !== fileToRemove);
    });
    
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
    
    setParsedData(null);
  }, [previews]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      handleFileChange({ dataTransfer: e.dataTransfer });
    },
    [handleFileChange]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    files,
    previews,
    fileInputRef,
    uploadProgress,
    isDragging,
    errors,
    parsedData,
    handleFileChange,
    handleRemoveFile,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleBrowseClick,
    clearErrors,
  };
}

function FileUpload({
  onUpload,
  maxFiles = 3,
  maxSize = 100,
  acceptedFileTypes = ["text/csv"],
  className,
}) {
  const {
    fileInputRef,
    previews,
    uploadProgress,
    isDragging,
    errors,
    parsedData,
    handleFileChange,
    handleRemoveFile,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleBrowseClick,
    clearErrors,
  } = useFileUpload({
    onUpload,
    maxFiles,
    maxSize,
    acceptedFileTypes,
  });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return bytes + " B";
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + " KB";
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }
  };

  return (
    <div className="w-full p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Air Quality Data</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Upload your air quality data in CSV format with headers. The data will be analyzed and visualized.
          </p>
        </div>

        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple={maxFiles > 1}
        />

        <div
          onClick={handleBrowseClick}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex h-40 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
            isDragging ? "border-blue-500/50 bg-blue-50 dark:bg-blue-900/10" : ""
          }`}
        >
          <div className="rounded-full bg-white dark:bg-gray-800 p-3 shadow-sm">
            <Upload className="h-6 w-6 text-blue-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800 dark:text-white">Drag and drop your CSV files here</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              or <span className="text-blue-500">browse</span> to upload
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Max file size: {maxSize}MB (up to {maxFiles} files)
            </p>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Error uploading files
                </p>
                <ul className="text-xs text-red-600 dark:text-red-300">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
                <button 
                  onClick={clearErrors}
                  className="mt-1 h-auto p-0 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {previews.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Uploaded Files</h4>
            <div className="space-y-3">
              {previews.map((preview) => (
                <div
                  key={preview.id}
                  className="relative rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
                      <FileText className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium truncate max-w-[200px] text-gray-900 dark:text-white">
                          {preview.file.name}
                        </p>
                        <button
                          className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          onClick={() => handleRemoveFile(preview.id)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove file</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(preview.file.size)} • {preview.columns?.length || 0} columns
                      </p>
                      <div className="pt-1">
                        <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress[preview.id] || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {parsedData && (
          <div className="mt-6 space-y-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Available Analysis</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/explore">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Table className="h-5 w-5" />
                    </div>
                    <span className="text-gray-800 dark:text-white font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Data Explorer
                    </span>
                  </div>
                </div>
              </Link>
              
              <Link href="/map">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                      <Wind className="h-5 w-5" />
                    </div>
                    <span className="text-gray-800 dark:text-white font-medium group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      Map View
                    </span>
                  </div>
                </div>
              </Link>
              
              <Link href="/analyze">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                      <BarChart className="h-5 w-5" />
                    </div>
                    <span className="text-gray-800 dark:text-white font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Data Analysis
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUpload; 