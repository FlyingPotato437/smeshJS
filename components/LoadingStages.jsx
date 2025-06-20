import React from 'react';
import { Brain, Database, Sparkles, Check, Loader2 } from 'lucide-react';

const LoadingStages = ({ currentStage, stages, isComplete = false }) => {
  const defaultStages = [
    {
      id: 1,
      title: "Initial Analysis",
      description: "Analyzing your query with AI to understand fire management context",
      icon: Brain,
      color: "blue"
    },
    {
      id: 2, 
      title: "Data Retrieval",
      description: "Searching knowledge base and retrieving relevant environmental data",
      icon: Database,
      color: "green"
    },
    {
      id: 3,
      title: "Final Analysis", 
      description: "Synthesizing comprehensive response with fire management insights",
      icon: Sparkles,
      color: "purple"
    }
  ];

  const stageList = stages || defaultStages;

  const getStageStatus = (stageId) => {
    if (isComplete) return 'completed';
    if (stageId < currentStage) return 'completed';
    if (stageId === currentStage) return 'active';
    return 'pending';
  };

  const getStatusColor = (status, baseColor) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'active':
        return `text-${baseColor}-600 bg-${baseColor}-100 border-${baseColor}-200`;
      case 'pending':
      default:
        return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const getIconComponent = (status, IconComponent) => {
    if (status === 'completed') {
      return <Check className="w-5 h-5" />;
    } else if (status === 'active') {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    } else {
      return <IconComponent className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Prescribed Fire Analysis in Progress
        </h3>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: isComplete ? '100%' : `${((currentStage - 1) / stageList.length) * 100}%`
            }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {stageList.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const IconComponent = stage.icon;
          
          return (
            <div key={stage.id} className="flex items-start space-x-4">
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300
                ${getStatusColor(status, stage.color)}
              `}>
                {getIconComponent(status, IconComponent)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className={`
                    text-sm font-medium transition-colors duration-300
                    ${status === 'completed' ? 'text-green-600 dark:text-green-400' : 
                      status === 'active' ? `text-${stage.color}-600 dark:text-${stage.color}-400` :
                      'text-gray-500 dark:text-gray-400'}
                  `}>
                    {stage.title}
                  </h4>
                  {status === 'active' && (
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  )}
                </div>
                <p className={`
                  text-xs mt-1 transition-colors duration-300
                  ${status === 'active' ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}
                `}>
                  {stage.description}
                </p>
                
                {status === 'active' && (
                  <div className="mt-2">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Processing...
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Analysis Complete
            </span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            Your prescribed fire analysis is ready with comprehensive insights and recommendations.
          </p>
        </div>
      )}
    </div>
  );
};

export default LoadingStages;