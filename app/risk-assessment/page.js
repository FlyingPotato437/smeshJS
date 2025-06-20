"use client";

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, Shield, TrendingUp, MapPin, Cloud, Thermometer,
  Wind, Droplets, Calendar, FileText, BarChart3, Target, CheckCircle,
  XCircle, AlertCircle, Info, Flame, Users, Clock, Zap
} from 'lucide-react';

export default function RiskAssessmentPage() {
  const [assessmentData, setAssessmentData] = useState({
    location: '',
    date: '',
    fuelType: '',
    fuelMoisture: 15,
    slope: 10,
    windSpeed: 8,
    temperature: 75,
    humidity: 40,
    infrastructureDistance: 500,
    crewExperience: 'experienced',
    weatherStability: 'stable',
    seasonalTiming: 'optimal'
  });

  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('Low');
  const [recommendations, setRecommendations] = useState([]);

  // Fuel types with different risk profiles
  const fuelTypes = [
    { value: 'grass', label: 'Grassland', baseRisk: 1 },
    { value: 'brush', label: 'Brush/Chaparral', baseRisk: 2 },
    { value: 'oak', label: 'Oak Woodland', baseRisk: 1.5 },
    { value: 'pine', label: 'Pine Forest', baseRisk: 2.5 },
    { value: 'mixed', label: 'Mixed Conifer', baseRisk: 3 },
    { value: 'dead', label: 'Heavy Dead/Down', baseRisk: 4 }
  ];

  // Calculate comprehensive risk score
  useEffect(() => {
    calculateRisk();
  }, [assessmentData]);

  const calculateRisk = () => {
    let score = 0;
    let newRecommendations = [];

    // Base fuel type risk
    const fuelType = fuelTypes.find(f => f.value === assessmentData.fuelType);
    if (fuelType) {
      score += fuelType.baseRisk;
    }

    // Fuel moisture factor (higher moisture = lower risk)
    if (assessmentData.fuelMoisture < 8) {
      score += 3;
      newRecommendations.push("Critical: Fuel moisture below safe threshold (8%). Consider postponing burn.");
    } else if (assessmentData.fuelMoisture < 12) {
      score += 2;
      newRecommendations.push("Caution: Low fuel moisture. Increase crew readiness and water resources.");
    } else if (assessmentData.fuelMoisture > 20) {
      score -= 1;
      newRecommendations.push("Good: High fuel moisture provides safety buffer.");
    }

    // Slope factor (steeper = higher risk)
    if (assessmentData.slope > 30) {
      score += 2;
      newRecommendations.push("High slope (>30%) increases fire spread rate. Use indirect attack methods.");
    } else if (assessmentData.slope > 15) {
      score += 1;
      newRecommendations.push("Moderate slope requires careful ignition pattern planning.");
    }

    // Wind speed factor
    if (assessmentData.windSpeed > 15) {
      score += 3;
      newRecommendations.push("High winds (>15 mph) pose significant risk. Consider postponing.");
    } else if (assessmentData.windSpeed > 10) {
      score += 1;
      newRecommendations.push("Moderate winds require close monitoring and downwind crew positioning.");
    } else if (assessmentData.windSpeed < 3) {
      score += 1;
      newRecommendations.push("Light winds may cause poor smoke dispersal. Monitor for inversions.");
    }

    // Temperature factor
    if (assessmentData.temperature > 85) {
      score += 2;
      newRecommendations.push("High temperature increases fire behavior intensity.");
    } else if (assessmentData.temperature < 45) {
      score += 1;
      newRecommendations.push("Low temperature may affect ignition success and crew comfort.");
    }

    // Humidity factor
    if (assessmentData.humidity < 25) {
      score += 2;
      newRecommendations.push("Low humidity (<25%) increases fire intensity and ember production.");
    } else if (assessmentData.humidity > 50) {
      score -= 1;
      newRecommendations.push("High humidity provides favorable burning conditions.");
    }

    // Infrastructure proximity
    if (assessmentData.infrastructureDistance < 100) {
      score += 3;
      newRecommendations.push("Critical: Infrastructure within 100 feet. Requires extensive protection measures.");
    } else if (assessmentData.infrastructureDistance < 300) {
      score += 2;
      newRecommendations.push("Infrastructure proximity requires additional safety precautions.");
    }

    // Crew experience factor
    if (assessmentData.crewExperience === 'novice') {
      score += 2;
      newRecommendations.push("Novice crew requires experienced supervision and simplified burn plan.");
    } else if (assessmentData.crewExperience === 'mixed') {
      score += 1;
      newRecommendations.push("Mixed experience crew - ensure proper task assignment and supervision.");
    }

    // Weather stability
    if (assessmentData.weatherStability === 'unstable') {
      score += 2;
      newRecommendations.push("Unstable weather conditions increase unpredictability. Monitor closely.");
    }

    // Seasonal timing
    if (assessmentData.seasonalTiming === 'marginal') {
      score += 1;
      newRecommendations.push("Marginal seasonal timing - verify ecological windows are appropriate.");
    } else if (assessmentData.seasonalTiming === 'poor') {
      score += 2;
      newRecommendations.push("Poor seasonal timing may compromise burn objectives or safety.");
    }

    // Determine risk level
    let level = 'Low';
    if (score > 8) level = 'Very High';
    else if (score > 6) level = 'High';
    else if (score > 4) level = 'Moderate';
    else if (score > 2) level = 'Moderate-Low';

    // Add general recommendations based on risk level
    if (level === 'Very High') {
      newRecommendations.unshift("STOP: Conditions not suitable for prescribed burning. Postpone operation.");
    } else if (level === 'High') {
      newRecommendations.unshift("Proceed with extreme caution. Consider additional resources and contingencies.");
    } else if (level === 'Moderate') {
      newRecommendations.unshift("Acceptable conditions with proper precautions and monitoring.");
    } else {
      newRecommendations.unshift("Favorable conditions for prescribed burning operations.");
    }

    setRiskScore(score);
    setRiskLevel(level);
    setRecommendations(newRecommendations);
  };

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'Low': return 'green';
      case 'Moderate-Low': return 'green';
      case 'Moderate': return 'yellow';
      case 'High': return 'orange';
      case 'Very High': return 'red';
      default: return 'gray';
    }
  };

  const getRiskIcon = () => {
    const color = getRiskColor();
    if (color === 'red') return <XCircle className="h-6 w-6 text-red-500" />;
    if (color === 'orange') return <AlertTriangle className="h-6 w-6 text-orange-500" />;
    if (color === 'yellow') return <AlertCircle className="h-6 w-6 text-yellow-500" />;
    return <CheckCircle className="h-6 w-6 text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#8C1515] rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Prescribed Fire Risk Assessment
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive safety and risk evaluation for prescribed fire operations
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Assessment Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <MapPin className="h-5 w-5 text-[#8C1515]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Site Information
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={assessmentData.location}
                      onChange={(e) => setAssessmentData({...assessmentData, location: e.target.value})}
                      placeholder="e.g., Los Padres NF, Unit 5A"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Assessment Date
                    </label>
                    <input
                      type="date"
                      value={assessmentData.date}
                      onChange={(e) => setAssessmentData({...assessmentData, date: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Dominant Fuel Type
                    </label>
                    <select
                      value={assessmentData.fuelType}
                      onChange={(e) => setAssessmentData({...assessmentData, fuelType: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select fuel type</option>
                      {fuelTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Average Slope (%)
                    </label>
                    <input
                      type="number"
                      value={assessmentData.slope}
                      onChange={(e) => setAssessmentData({...assessmentData, slope: parseInt(e.target.value) || 0})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Environmental Conditions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Cloud className="h-5 w-5 text-[#8C1515]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Environmental Conditions
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fuel Moisture (1-hr): {assessmentData.fuelMoisture}%
                    </label>
                    <input
                      type="range"
                      min="4"
                      max="25"
                      value={assessmentData.fuelMoisture}
                      onChange={(e) => setAssessmentData({...assessmentData, fuelMoisture: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>4% (Critical)</span>
                      <span>15% (Optimal)</span>
                      <span>25% (High)</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Wind Speed: {assessmentData.windSpeed} mph
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={assessmentData.windSpeed}
                      onChange={(e) => setAssessmentData({...assessmentData, windSpeed: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0 mph</span>
                      <span>10 mph</span>
                      <span>25+ mph</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Temperature: {assessmentData.temperature}°F
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      value={assessmentData.temperature}
                      onChange={(e) => setAssessmentData({...assessmentData, temperature: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>30°F</span>
                      <span>65°F</span>
                      <span>100°F</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Relative Humidity: {assessmentData.humidity}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      value={assessmentData.humidity}
                      onChange={(e) => setAssessmentData({...assessmentData, humidity: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10%</span>
                      <span>45%</span>
                      <span>80%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Factors */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="h-5 w-5 text-[#8C1515]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Operational Factors
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Distance to Infrastructure (feet)
                    </label>
                    <input
                      type="number"
                      value={assessmentData.infrastructureDistance}
                      onChange={(e) => setAssessmentData({...assessmentData, infrastructureDistance: parseInt(e.target.value) || 0})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Crew Experience Level
                    </label>
                    <select
                      value={assessmentData.crewExperience}
                      onChange={(e) => setAssessmentData({...assessmentData, crewExperience: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="experienced">Experienced (&gt;5 burns)</option>
                      <option value="mixed">Mixed Experience</option>
                      <option value="novice">Novice (&lt;3 burns)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Weather Stability
                    </label>
                    <select
                      value={assessmentData.weatherStability}
                      onChange={(e) => setAssessmentData({...assessmentData, weatherStability: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="stable">Stable Conditions</option>
                      <option value="mixed">Variable Conditions</option>
                      <option value="unstable">Unstable Conditions</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Seasonal Timing
                    </label>
                    <select
                      value={assessmentData.seasonalTiming}
                      onChange={(e) => setAssessmentData({...assessmentData, seasonalTiming: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="optimal">Optimal Window</option>
                      <option value="marginal">Marginal Window</option>
                      <option value="poor">Poor Timing</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Assessment Results */}
          <div className="space-y-6">
            
            {/* Risk Score */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Shield className="h-5 w-5 text-[#8C1515]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Risk Assessment
                  </h2>
                </div>
                
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    {getRiskIcon()}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {riskLevel}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Risk Score: {riskScore.toFixed(1)}/12
                  </div>
                  
                  {/* Risk Level Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        getRiskColor() === 'green' ? 'bg-green-500' :
                        getRiskColor() === 'yellow' ? 'bg-yellow-500' :
                        getRiskColor() === 'orange' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((riskScore / 12) * 100, 100)}%` }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1 text-xs text-gray-500">
                    <div className="text-center">Low</div>
                    <div className="text-center">Mod</div>
                    <div className="text-center">High</div>
                    <div className="text-center">Critical</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="h-5 w-5 text-[#8C1515]" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recommendations
                  </h2>
                </div>
                
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                      rec.startsWith('STOP:') || rec.startsWith('Critical:') ? 
                        'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200' :
                      rec.startsWith('Caution:') || rec.startsWith('Proceed with extreme caution') ?
                        'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-800 dark:text-orange-200' :
                      rec.startsWith('Good:') || rec.startsWith('Favorable') ?
                        'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200' :
                        'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-200'
                    }`}>
                      <p className="text-sm font-medium">{rec}</p>
                    </div>
                  ))}
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
                  <button className="w-full flex items-center space-x-2 p-3 bg-[#8C1515] hover:bg-[#B83A4B] text-white rounded-lg transition-colors">
                    <FileText className="h-4 w-4" />
                    <span>Generate Report</span>
                  </button>
                  
                  <button className="w-full flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    <BarChart3 className="h-4 w-4" />
                    <span>View History</span>
                  </button>
                  
                  <button className="w-full flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    <Clock className="h-4 w-4" />
                    <span>Save Assessment</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}