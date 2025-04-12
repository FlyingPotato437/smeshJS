import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlayIcon, PauseIcon, StopIcon, BackwardIcon, ForwardIcon } from '@heroicons/react/24/solid';

// Time animation component for visualizing air quality data over time
const TimeAnimation = ({ 
  data = [], 
  onTimeChange = () => {},
  startDate = null,
  endDate = null,
  speed = 1,
  height = 150,
  colorScale = 'viridis',
  metricKey = 'pm25Standard'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [timePoints, setTimePoints] = useState([]);
  const [animationSpeed, setAnimationSpeed] = useState(speed);
  const animationRef = useRef(null);
  const containerRef = useRef(null);

  // Extract unique timestamps and sort them
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // Gather all unique timestamps
    const timestamps = data
      .filter(d => d.timestamp)
      .map(d => new Date(d.timestamp).getTime())
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => a - b);
    
    // Filter timestamps based on startDate and endDate if provided
    let filteredTimestamps = timestamps;
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      filteredTimestamps = timestamps.filter(t => t >= start && t <= end);
    }
    
    setTimePoints(filteredTimestamps);
    setCurrentTimeIndex(0);
  }, [data, startDate, endDate]);

  // Animation frame handler
  const animate = () => {
    setCurrentTimeIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % timePoints.length;
      // Call the onTimeChange callback with the current timestamp
      if (timePoints[nextIndex]) {
        onTimeChange(new Date(timePoints[nextIndex]));
      }
      return nextIndex;
    });
    
    animationRef.current = requestAnimationFrame(() => {
      // Delay based on speed
      setTimeout(animate, 1000 / animationSpeed);
    });
  };

  // Start/stop animation
  useEffect(() => {
    if (isPlaying && timePoints.length > 0) {
      animationRef.current = requestAnimationFrame(() => {
        setTimeout(animate, 1000 / animationSpeed);
      });
    } else if (!isPlaying && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, timePoints, animationSpeed]);

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter data for the current timestamp
  const currentData = useMemo(() => {
    if (!timePoints[currentTimeIndex] || !data || data.length === 0) return [];
    
    const currentTime = timePoints[currentTimeIndex];
    // Get data points for this timestamp
    return data.filter(d => {
      if (!d.timestamp) return false;
      return Math.abs(new Date(d.timestamp).getTime() - currentTime) < 60000; // Within 1 minute
    });
  }, [data, timePoints, currentTimeIndex]);

  // Handle play/pause button click
  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  // Stop animation and reset to beginning
  const stopAnimation = () => {
    setIsPlaying(false);
    setCurrentTimeIndex(0);
    if (timePoints[0]) {
      onTimeChange(new Date(timePoints[0]));
    }
  };

  // Step forward one frame
  const stepForward = () => {
    if (timePoints.length === 0) return;
    
    setCurrentTimeIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % timePoints.length;
      if (timePoints[nextIndex]) {
        onTimeChange(new Date(timePoints[nextIndex]));
      }
      return nextIndex;
    });
  };

  // Step backward one frame
  const stepBackward = () => {
    if (timePoints.length === 0) return;
    
    setCurrentTimeIndex(prevIndex => {
      const nextIndex = prevIndex === 0 ? timePoints.length - 1 : prevIndex - 1;
      if (timePoints[nextIndex]) {
        onTimeChange(new Date(timePoints[nextIndex]));
      }
      return nextIndex;
    });
  };

  // Adjust animation speed
  const handleSpeedChange = (e) => {
    setAnimationSpeed(parseFloat(e.target.value));
  };

  // Calculate timeline markers
  const timelineMarkers = useMemo(() => {
    if (timePoints.length < 2) return [];
    
    const markers = [];
    const step = Math.max(1, Math.floor(timePoints.length / 10));
    
    for (let i = 0; i < timePoints.length; i += step) {
      markers.push({
        index: i,
        time: timePoints[i]
      });
    }
    
    // Ensure the last marker is included
    if (markers.length > 0 && markers[markers.length - 1].index !== timePoints.length - 1) {
      markers.push({
        index: timePoints.length - 1,
        time: timePoints[timePoints.length - 1]
      });
    }
    
    return markers;
  }, [timePoints]);

  // Handle timeline click
  const handleTimelineClick = (e) => {
    if (!containerRef.current || timePoints.length === 0) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const containerWidth = rect.width;
    const clickRatio = clickPosition / containerWidth;
    
    const newIndex = Math.floor(clickRatio * timePoints.length);
    setCurrentTimeIndex(Math.min(Math.max(0, newIndex), timePoints.length - 1));
    
    if (timePoints[newIndex]) {
      onTimeChange(new Date(timePoints[newIndex]));
    }
  };

  // Calculate current time position on timeline
  const timelinePosition = useMemo(() => {
    if (timePoints.length === 0) return '0%';
    const percentage = (currentTimeIndex / (timePoints.length - 1)) * 100;
    return `${percentage}%`;
  }, [currentTimeIndex, timePoints]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Time Animation
        </h3>
      </div>
      
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {/* Current timestamp display */}
        <div className="text-center mb-2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {timePoints[currentTimeIndex] 
              ? formatTimestamp(timePoints[currentTimeIndex])
              : 'No data available'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {currentData.length} data points visible
          </p>
        </div>
        
        {/* Timeline */}
        <div 
          ref={containerRef}
          className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded relative mb-4 cursor-pointer"
          onClick={handleTimelineClick}
        >
          {/* Timeline markers */}
          {timelineMarkers.map(marker => (
            <div 
              key={marker.index}
              className="absolute top-0 w-px h-4 bg-gray-400 dark:bg-gray-500"
              style={{ left: `${(marker.index / (timePoints.length - 1)) * 100}%` }}
            />
          ))}
          
          {/* Current position indicator */}
          <div 
            className="absolute top-0 w-2 h-4 bg-blue-500 rounded"
            style={{ left: timelinePosition, transform: 'translateX(-50%)' }}
          />
          
          {/* Progress bar */}
          <div 
            className="absolute top-0 left-0 h-4 bg-blue-200 dark:bg-blue-900 rounded-l"
            style={{ width: timelinePosition }}
          />
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={stepBackward}
              disabled={timePoints.length === 0}
              className="p-2 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <BackwardIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={togglePlay}
              disabled={timePoints.length === 0}
              className="p-2 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {isPlaying ? (
                <PauseIcon className="h-5 w-5" />
              ) : (
                <PlayIcon className="h-5 w-5" />
              )}
            </button>
            
            <button
              onClick={stopAnimation}
              disabled={timePoints.length === 0}
              className="p-2 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <StopIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={stepForward}
              disabled={timePoints.length === 0}
              className="p-2 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ForwardIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Speed</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={animationSpeed}
              onChange={handleSpeedChange}
              className="w-24"
            />
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{animationSpeed}x</span>
          </div>
        </div>
        
        {/* Frame count indicator */}
        <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          Frame {currentTimeIndex + 1} of {timePoints.length}
        </div>
      </div>
    </div>
  );
};

export default TimeAnimation; 