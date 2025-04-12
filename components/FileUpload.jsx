import { useState, useRef } from 'react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function FileUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check if file is a CSV
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setUploadStatus({
          type: 'error',
          message: 'Please upload a CSV file.'
        });
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setUploadStatus(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Check if file is a CSV
      if (droppedFile.type !== 'text/csv' && !droppedFile.name.endsWith('.csv')) {
        setUploadStatus({
          type: 'error',
          message: 'Please upload a CSV file.'
        });
        return;
      }
      
      setFile(droppedFile);
      setUploadStatus(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus({
        type: 'error',
        message: 'Please select a file to upload.'
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Create FormData instance
    const formData = new FormData();
    formData.append('file', file);
    
    // Add date range if selected
    if (startDate && endDate) {
      formData.append('startDate', format(startDate, 'yyyy-MM-dd'));
      formData.append('endDate', format(endDate, 'yyyy-MM-dd'));
    }

    try {
      // Use XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          setUploadStatus({
            type: 'success',
            message: `File uploaded successfully! ${response.rowCount} rows imported.`
          });
          
          // Call the parent component's callback with the imported data
          if (onUploadComplete && typeof onUploadComplete === 'function') {
            onUploadComplete(response.data);
          }
        } else {
          // Try to parse the error response
          let errorMessage = `Upload failed: ${xhr.statusText}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error) {
              errorMessage = `Upload failed: ${errorResponse.error}`;
            }
          } catch (e) {
            console.error('Error parsing error response:', e);
          }
          
          setUploadStatus({
            type: 'error',
            message: errorMessage
          });
          
          console.error('Upload error details:', {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
        }
        setIsUploading(false);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });

      xhr.addEventListener('error', (event) => {
        console.error('Network error during upload:', event);
        
        setUploadStatus({
          type: 'error',
          message: 'A network error occurred during the upload. Please check your connection and try again.'
        });
        setIsUploading(false);
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: `Error: ${error.message}`
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer hover:bg-gray-50 transition ${
          file ? 'border-primary-400 bg-primary-50' : 'border-gray-300'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center">
          <svg
            className={`w-16 h-16 mb-3 ${file ? 'text-primary-500' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mb-2 text-sm text-gray-600">
            <span className="font-medium">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">CSV files only</p>
          {file && (
            <div className="mt-3 text-sm text-primary-600 font-medium">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Date Range (Optional)
        </label>
        <DatePicker
          selectsRange={true}
          startDate={startDate}
          endDate={endDate}
          onChange={(update) => setDateRange(update)}
          placeholderText="Select date range"
          className="w-full border border-gray-300 rounded-md p-2"
          isClearable
        />
        <p className="mt-1 text-xs text-gray-500">
          Leave blank to import all data from the file
        </p>
      </div>

      <button
        className={`w-full py-2 px-4 rounded-md font-medium ${
          isUploading
            ? 'bg-primary-300 cursor-not-allowed'
            : 'bg-primary-500 hover:bg-primary-600 text-white'
        }`}
        onClick={handleUpload}
        disabled={isUploading || !file}
      >
        {isUploading ? 'Uploading...' : 'Upload File'}
      </button>

      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary-500 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-center mt-1 text-gray-600">
            {uploadProgress}% uploaded
          </p>
        </div>
      )}

      {uploadStatus && (
        <div
          className={`mt-4 p-3 rounded-md ${
            uploadStatus.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {uploadStatus.message}
        </div>
      )}
    </div>
  );
}