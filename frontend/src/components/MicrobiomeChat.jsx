import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Keep mock data for fallback scenarios
import { 
  mockMicrobiomeData, 
  mockWearableData, 
  mockUserProfile, 
  mockChatHistory, 
  mockKnowledgeGraph, 
  mockHealthInsights,
  generateMockResponse 
} from '../utils/mockData';

const MicrobiomeChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [learningMode, setLearningMode] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [microbiomeData, setMicrobiomeData] = useState(mockMicrobiomeData);
  const [wearableData, setWearableData] = useState(mockWearableData);
  const [userProfile, setUserProfile] = useState(mockUserProfile);
  const [healthInsights, setHealthInsights] = useState(mockHealthInsights);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load real data on component mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userId = 'USER_001'; // In real app, get from auth
    setLoading(true);
    
    try {
      // Load health dashboard data
      const dashboardResponse = await axios.get(`${API}/health-dashboard/${userId}`);
      const dashboard = dashboardResponse.data;
      
      if (dashboard.microbiome_analysis) {
        setMicrobiomeData(dashboard.microbiome_analysis);
      }
      
      if (dashboard.wearable_data) {
        setWearableData(dashboard.wearable_data);
      }
      
      if (dashboard.user_profile) {
        setUserProfile(dashboard.user_profile);
      }
      
      if (dashboard.learning_stats) {
        setHealthInsights(prev => ({
          ...prev,
          overallScore: dashboard.learning_stats.personalization_score || prev.overallScore
        }));
      }
      
    } catch (error) {
      console.log('Using mock data - no backend data available');
      // Keep using mock data as fallback
    }
    
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      message: inputText,
      timestamp: new Date().toISOString(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsTyping(true);

    try {
      // Call real backend API
      const response = await axios.post(`${API}/chat`, {
        message: currentInput,
        session_id: `session_${Date.now()}`, // Generate session ID
        user_profile: {
          user_id: mockUserProfile.user_id || "USER_001",
          diet: mockUserProfile.diet,
          allergies: mockUserProfile.allergies,
          goal: mockUserProfile.goal
        }
      });

      const assistantMessage = {
        id: response.data.id,
        message: currentInput,
        response: response.data.response,
        timestamp: response.data.timestamp,
        intent: response.data.intent,
        keywords: response.data.keywords,
        entities: response.data.entities,
        confidence: response.data.confidence,
        recommendations: response.data.recommendations || [],
        isUser: false,
        needsFeedback: true
      };

      setMessages(prev => [...prev, assistantMessage]);
      setPendingFeedback(assistantMessage.id);

    } catch (error) {
      console.error('API Error:', error);
      
      // Fallback to mock response
      const mockResponse = generateMockResponse(currentInput);
      const assistantMessage = {
        id: Date.now() + 1,
        message: currentInput,
        response: mockResponse.response + " (Note: Using offline mode)",
        timestamp: new Date().toISOString(),
        intent: mockResponse.intent,
        keywords: mockResponse.keywords,
        entities: mockResponse.entities,
        confidence: mockResponse.confidence,
        recommendations: mockResponse.recommendations || [],
        isUser: false,
        needsFeedback: true
      };

      setMessages(prev => [...prev, assistantMessage]);
      setPendingFeedback(assistantMessage.id);
    }

    setIsTyping(false);
  };

  const handleFeedback = async (messageId, isCorrect) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, wasCorrect: isCorrect, needsFeedback: false }
          : msg
      )
    );
    setPendingFeedback(null);
    
    if (!isCorrect) {
      setLearningMode(true);
      
      // Find the message that received negative feedback
      const message = messages.find(msg => msg.id === messageId);
      if (message) {
        try {
          // Submit feedback to backend
          await axios.post(`${API}/feedback`, {
            message_id: messageId,
            message: message.message,
            is_correct: false,
            custom_response: "Please provide a better response for this query."
          });
          
          console.log('Feedback submitted to learning system');
        } catch (error) {
          console.error('Failed to submit feedback:', error);
        }
      }
    } else {
      // Submit positive feedback
      const message = messages.find(msg => msg.id === messageId);
      if (message) {
        try {
          await axios.post(`${API}/feedback`, {
            message_id: messageId,
            message: message.message,
            is_correct: true
          });
        } catch (error) {
          console.error('Failed to submit positive feedback:', error);
        }
      }
    }
  };

  const getIntentColor = (intent) => {
    const colors = {
      'gut_health': 'bg-green-100 text-green-800',
      'probiotic_info': 'bg-blue-100 text-blue-800',
      'fiber_info': 'bg-yellow-100 text-yellow-800',
      'diversity_info': 'bg-purple-100 text-purple-800',
      'diet_suggestion': 'bg-orange-100 text-orange-800',
      'hello': 'bg-gray-100 text-gray-800',
      'unknown': 'bg-red-100 text-red-800'
    };
    return colors[intent] || colors['unknown'];
  };

  return (
    <div className="max-w-6xl mx-auto p-4 h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-xl">🧬</span>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Microbiome AI Assistant
            </h1>
            <p className="text-gray-600">Personalized gut health insights with self-learning capabilities</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Connected to {mockMicrobiomeData.sampleId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Wearable synced</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>AI Learning: Active</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4">
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
          {['chat', 'analysis', 'insights'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'chat' && '💬 Chat'}
              {tab === 'analysis' && '📊 Analysis'}
              {tab === 'insights' && '⚡ Insights'}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 bg-white rounded-lg shadow-lg flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-lg p-4 space-y-2`}>
                  {msg.isUser ? (
                    <div className="flex items-start gap-2">
                      <span className="text-blue-200">👤</span>
                      <div>{msg.message}</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-600">🤖</span>
                        <div>{msg.response}</div>
                      </div>
                      
                      {msg.intent && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-1 rounded-full text-xs ${getIntentColor(msg.intent)}`}>
                            {msg.intent}
                          </span>
                          {msg.confidence && (
                            <span className="text-gray-500">
                              {(msg.confidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </div>
                      )}
                      
                      {msg.keywords && msg.keywords.length > 0 && (
                        <div className="text-xs text-gray-600">
                          <strong>Keywords:</strong> {msg.keywords.join(', ')}
                        </div>
                      )}
                      
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="bg-emerald-50 p-3 rounded-lg text-sm">
                          <strong className="text-emerald-800">Recommendations:</strong>
                          <ul className="mt-1 space-y-1">
                            {msg.recommendations.map((rec, idx) => (
                              <li key={idx} className="text-emerald-700">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {msg.needsFeedback && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <span className="text-xs text-gray-600">Was this helpful?</span>
                          <button
                            onClick={() => handleFeedback(msg.id, true)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                          >
                            👍 Yes
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, false)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                          >
                            👎 No
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4 flex items-center gap-2">
                  <span className="text-emerald-600">🤖</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about your gut health, probiotics, diet recommendations..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            
            {learningMode && (
              <div className="mt-2 p-3 bg-yellow-50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600">🧠</span>
                  <span className="text-yellow-800">Learning mode active - I'll improve my responses based on your feedback!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-emerald-600 mb-4 flex items-center gap-2">
              📊 Microbiome Analysis
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                <div className="text-3xl font-bold text-emerald-600">{mockMicrobiomeData.shannonIndex}</div>
                <div className="text-sm text-gray-600">Shannon Index</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{mockMicrobiomeData.diversityLevel}</div>
                <div className="text-sm text-gray-600">Diversity Level</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">Microbe Abundance:</h3>
              {Object.entries(mockMicrobiomeData.microbes).map(([microbe, abundance]) => (
                <div key={microbe} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{microbe}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${abundance * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 min-w-[40px]">{(abundance * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-blue-600 mb-4 flex items-center gap-2">
              ⌚ Wearable Data
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{mockWearableData.sleepHours}h</div>
                <div className="text-sm text-gray-600">Sleep</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="text-2xl font-bold text-green-600">{mockWearableData.steps.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Steps</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">{mockWearableData.stressScore}/10</div>
                <div className="text-sm text-gray-600">Stress</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-purple-600 mb-4 flex items-center gap-2">
              🧠 Learning Progress
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Intent Recognition Accuracy</span>
                <span className="font-bold">94%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '94%'}}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Personalization Score</span>
                <span className="font-bold">87%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '87%'}}></div>
              </div>
              
              <div className="text-sm text-gray-600 mt-4">
                <strong>Recent Improvements:</strong>
                <ul className="mt-2 space-y-1">
                  <li>• Learned 3 new custom responses this week</li>
                  <li>• Improved fiber recommendation accuracy</li>
                  <li>• Better handling of allergy-specific queries</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-orange-600 mb-4 flex items-center gap-2">
              ⚠️ Health Alerts
            </h2>
            <div className="space-y-3">
              {mockHealthInsights.warnings.map((warning, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${warning.level === 'moderate' ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'} border-2`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${warning.level === 'moderate' ? 'text-orange-600' : 'text-yellow-600'}`}>
                      {warning.level === 'moderate' ? '⚠️' : '⚡'}
                    </span>
                    <span className="text-sm">{warning.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-green-600 mb-4 flex items-center gap-2">
              📈 Health Score
            </h2>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-green-600">{mockHealthInsights.overallScore}/100</div>
              <div className="text-gray-600">Overall Health Score</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-green-500 h-4 rounded-full transition-all duration-300"
                style={{width: `${mockHealthInsights.overallScore}%`}}
              ></div>
            </div>
            
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm">Key Improvements:</h4>
              {mockHealthInsights.improvements.map((item, idx) => (
                <div key={idx} className="text-sm bg-blue-50 p-2 rounded">
                  <div className="font-medium">{item.category}</div>
                  <div className="text-gray-600">{item.improvement}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MicrobiomeChat;