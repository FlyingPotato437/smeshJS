"use client";

import { useState, useEffect } from 'react';
import { 
  Calendar, Cloud, Thermometer, Wind, Droplets, AlertTriangle, 
  CheckCircle, MapPin, Users, Flame, Shield, FileText, TrendingUp, 
  Clock, Target, Globe, BarChart3 
} from 'lucide-react';
import Link from 'next/link';

export default function FirePlanningPage() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [burnObjective, setBurnObjective] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [acreage, setAcreage] = useState('');
  const [ecosystemType, setEcosystemType] = useState('');
  
  // Weather data simulation
  const [weatherData, setWeatherData] = useState({
    temperature: 68,
    humidity: 45,
    windSpeed: 8,
    windDirection: 'SW',
    forecast: 'Favorable',
    hainesIndex: 4
  });

  // Risk assessment factors
  const [riskFactors, setRiskFactors] = useState({
    fuelMoisture: 12,
    topography: 'Moderate',
    infrastructure: 'Low',
    weather: 'Favorable',
    season: 'Optimal'
  });

  const ecosystemTypes = [
    'Oak Woodland',
    'Chaparral',
    'Grassland',
    'Pine Forest',
    'Mixed Conifer',
    'Riparian',
    'Coastal Sage'
  ];

  const burnObjectives = [
    'Fuel Reduction',
    'Ecosystem Restoration',
    'Wildlife Habitat Enhancement', 
    'Invasive Species Control',
    'Cultural Resource Protection',
    'Research/Monitoring'
  ];

  // Risk level calculation
  const calculateRiskLevel = () => {
    const factors = [
      riskFactors.fuelMoisture > 10 ? 1 : 2,
      riskFactors.topography === 'Low' ? 1 : riskFactors.topography === 'Moderate' ? 2 : 3,
      riskFactors.infrastructure === 'Low' ? 1 : riskFactors.infrastructure === 'Moderate' ? 2 : 3,
      weatherData.windSpeed < 10 ? 1 : weatherData.windSpeed < 15 ? 2 : 3,
      weatherData.humidity > 40 ? 1 : weatherData.humidity > 25 ? 2 : 3
    ];
    
    const avgRisk = factors.reduce((a, b) => a + b, 0) / factors.length;
    
    if (avgRisk <= 1.5) return { level: 'Low', color: 'green', recommendation: 'Proceed with standard protocols' };
    if (avgRisk <= 2.2) return { level: 'Moderate', color: 'yellow', recommendation: 'Implement enhanced safety measures' };
    return { level: 'High', color: 'red', recommendation: 'Consider postponing or additional resources' };
  };

  const riskAssessment = calculateRiskLevel();

  // Planning checklist
  const planningSteps = [
    { 
      category: 'Pre-Planning',
      items: [
        'Define burn objectives and success criteria',
        'Conduct site assessment and fuel mapping',
        'Review historical weather patterns',
        'Identify water sources and access roads',
        'Notify adjacent landowners and authorities'
      ]
    },
    {
      category: 'Prescription Development', 
      items: [
        'Set weather parameter windows',
        'Determine fuel moisture targets',
        'Plan ignition pattern and timing',
        'Calculate resource requirements',
        'Develop contingency plans'
      ]
    },
    {
      category: 'Safety Planning',
      items: [
        'Establish firebreaks and safety zones',
        'Plan crew positioning and escape routes',
        'Arrange medical and emergency support',
        'Test communication systems',
        'Prepare suppression resources'
      ]
    },
    {
      category: 'Implementation',
      items: [
        'Verify prescription conditions met',
        'Brief all personnel on objectives and safety',
        'Monitor weather conditions continuously',
        'Execute ignition according to plan',
        'Conduct mop-up and patrol activities'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#8C1515] rounded-lg">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Fire Planning & Risk Assessment
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive tools for prescribed fire planning and safety evaluation
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Planning Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Project Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <FileText className="h-5 w-5 text-[#8C1515]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Project Details
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      placeholder="e.g., Los Padres National Forest, Unit 5A"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Planned Acreage
                    </label>
                    <input
                      type="number"
                      value={acreage}
                      onChange={(e) => setAcreage(e.target.value)}
                      placeholder="150"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ecosystem Type
                    </label>
                    <select
                      value={ecosystemType}
                      onChange={(e) => setEcosystemType(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select ecosystem</option>
                      {ecosystemTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Primary Objective
                    </label>
                    <select
                      value={burnObjective}
                      onChange={(e) => setBurnObjective(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select objective</option>
                      {burnObjectives.map(obj => (
                        <option key={obj} value={obj}>{obj}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Burn Date
                    </label>
                    <input
                      type="date"
                      value={plannedDate}
                      onChange={(e) => setPlannedDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Conditions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Cloud className="h-5 w-5 text-[#8C1515]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Current Conditions
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Thermometer className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Temperature</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{weatherData.temperature}°F</div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Droplets className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Humidity</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{weatherData.humidity}%</div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Wind className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Wind</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{weatherData.windSpeed} mph {weatherData.windDirection}</div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Haines Index:</span>
                    <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">{weatherData.hainesIndex}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">24hr Forecast:</span>
                    <span className="ml-2 text-lg font-semibold text-green-600">{weatherData.forecast}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Planning Checklist */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-[#8C1515]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Planning Checklist
                  </h2>
                </div>
                
                <div className="space-y-6">
                  {planningSteps.map((step, idx) => (
                    <div key={idx}>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                        {step.category}
                      </h3>
                      <div className="space-y-2">
                        {step.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-[#8C1515] rounded focus:ring-[#8C1515]"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Risk Assessment */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Shield className="h-5 w-5 text-[#8C1515]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Risk Assessment
                  </h2>
                </div>
                
                <div className={`p-4 rounded-lg mb-4 ${
                  riskAssessment.color === 'green' ? 'bg-green-50 dark:bg-green-900/20' :
                  riskAssessment.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                  'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className={`h-5 w-5 ${
                      riskAssessment.color === 'green' ? 'text-green-600' :
                      riskAssessment.color === 'yellow' ? 'text-yellow-600' :
                      'text-red-600'
                    }`} />
                    <span className={`font-semibold ${
                      riskAssessment.color === 'green' ? 'text-green-800 dark:text-green-200' :
                      riskAssessment.color === 'yellow' ? 'text-yellow-800 dark:text-yellow-200' :
                      'text-red-800 dark:text-red-200'
                    }`}>
                      {riskAssessment.level} Risk
                    </span>
                  </div>
                  <p className={`text-sm ${
                    riskAssessment.color === 'green' ? 'text-green-700 dark:text-green-300' :
                    riskAssessment.color === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' :
                    'text-red-700 dark:text-red-300'
                  }`}>
                    {riskAssessment.recommendation}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Fuel Moisture</span>
                    <span className="font-medium">{riskFactors.fuelMoisture}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Topography</span>
                    <span className="font-medium">{riskFactors.topography}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Infrastructure Risk</span>
                    <span className="font-medium">{riskFactors.infrastructure}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <Link href="/ai-assistant" className="w-full">
                    <button className="w-full flex items-center space-x-2 p-3 bg-[#8C1515] hover:bg-[#B83A4B] text-white rounded-lg transition-colors">
                      <Target className="h-4 w-4" />
                      <span>Ask AI Assistant</span>
                    </button>
                  </Link>
                  
                  <button className="w-full flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    <Globe className="h-4 w-4" />
                    <span>Weather Forecast</span>
                  </button>
                  
                  <button className="w-full flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    <BarChart3 className="h-4 w-4" />
                    <span>Historical Data</span>
                  </button>
                  
                  <button className="w-full flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    <FileText className="h-4 w-4" />
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Unit 3B burn completed</p>
                      <p className="text-xs text-gray-500">2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Weather window identified</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Permit application submitted</p>
                      <p className="text-xs text-gray-500">1 week ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}