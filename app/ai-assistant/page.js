"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, FileText, MapPin, TrendingUp, AlertTriangle, Wind, Thermometer } from 'lucide-react';
import LoadingStages from '../../components/LoadingStages';

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm your Prescribed Fire AI Assistant, inspired by WildfireGPT. I can help you with fire planning, risk assessment, weather analysis, and post-burn evaluation. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sample quick actions for prescribed fire management
  const quickActions = [
    {
      icon: <Wind className="w-4 h-4" />,
      text: "Check weather conditions for burning",
      prompt: "What are the optimal weather conditions for a prescribed fire today? Include wind speed, humidity, and temperature requirements."
    },
    {
      icon: <MapPin className="w-4 h-4" />,
      text: "Assess fire risk for location",
      prompt: "Can you help me assess the fire risk for a 50-acre oak woodland in Northern California? What factors should I consider?"
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      text: "Plan vegetation management",
      prompt: "I need to plan a prescribed fire for fuel reduction in a chaparral ecosystem. What are the best practices and timing considerations?"
    },
    {
      icon: <FileText className="w-4 h-4" />,
      text: "Create burn plan outline",
      prompt: "Help me create a comprehensive prescribed fire burn plan outline. What sections and safety protocols should be included?"
    }
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsThinking(true);
    setCurrentStage(1);

    try {
      // Stage 1: Initial Analysis
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentStage(2);
      
      // Stage 2: Data Retrieval & Vector Search
      await new Promise(resolve => setTimeout(resolve, 1200));
      setCurrentStage(3);
      
      // Stage 3: Final Analysis - Make the actual API call
      const response = await fetch('/api/ai/prescribed-fire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: inputMessage,
          options: {
            includeHistory: true,
            history: messages.slice(-5) // Send last 5 messages for context
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Complete the final stage
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: data.fireAnalysis || data.response || "I'm sorry, I couldn't process that request. Please try again.",
        sources: data.knowledgeBase || data.sources,
        environmentalData: data.environmentalData,
        fireConditions: data.fireConditions,
        recommendations: data.recommendations,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "I'm experiencing technical difficulties. Please check your connection and try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setCurrentStage(1);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (prompt) => {
    setInputMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#8C1515] rounded-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Prescribed Fire AI Assistant
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Powered by domain-specific fire management knowledge
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-3xl ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} space-x-3`}>
                <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-3' : 'mr-3'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-500' 
                      : 'bg-[#8C1515]'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
                <div className={`flex-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-4 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.sources && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Sources:</p>
                        <div className="space-y-1">
                          {message.sources.map((source, idx) => (
                            <div key={idx} className="text-xs text-blue-600 dark:text-blue-400">
                              {typeof source === 'string' ? source : source.title || source.source || 'Unknown Source'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isThinking && (
            <div className="flex justify-center">
              <LoadingStages 
                currentStage={currentStage}
                isComplete={false}
              />
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center space-x-2 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="text-[#8C1515]">
                    {action.icon}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {action.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about prescribed fire planning, weather conditions, safety protocols..."
                className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#8C1515] focus:border-transparent"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="flex-shrink-0 p-3 bg-[#8C1515] hover:bg-[#B83A4B] disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}