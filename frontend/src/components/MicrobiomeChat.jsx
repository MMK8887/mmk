import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ThumbsUp, ThumbsDown, Upload, BarChart3, Brain, Activity, MessageCircle, Sparkles, TrendingUp, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  const [messages, setMessages] = useState(mockChatHistory);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [learningMode, setLearningMode] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);

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
    setInputText('');
    setIsTyping(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const aiResponse = generateMockResponse(inputText);
      
      const assistantMessage = {
        id: Date.now() + 1,
        message: inputText,
        response: aiResponse.response,
        timestamp: new Date().toISOString(),
        intent: aiResponse.intent,
        keywords: aiResponse.keywords,
        entities: aiResponse.entities,
        confidence: aiResponse.confidence,
        recommendations: aiResponse.recommendations || [],
        isUser: false,
        needsFeedback: true
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      setPendingFeedback(assistantMessage.id);
    }, 1000 + Math.random() * 1000);
  };

  const handleFeedback = (messageId, isCorrect) => {
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
      // In real app, this would open a modal for custom response
      console.log('Learning mode activated for message:', messageId);
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

  const MicrobiomeAnalysis = () => (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Microbiome Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-emerald-600">{mockMicrobiomeData.shannonIndex}</div>
              <div className="text-sm text-gray-600">Shannon Index</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{mockMicrobiomeData.diversityLevel}</div>
              <div className="text-sm text-gray-600">Diversity Level</div>
            </div>
          </div>
          
          <div className="space-y-3">
            {Object.entries(mockMicrobiomeData.microbes).map(([microbe, abundance]) => (
              <div key={microbe} className="flex items-center justify-between">
                <span className="text-sm font-medium">{microbe}</span>
                <div className="flex items-center gap-2 w-32">
                  <Progress value={abundance * 100} className="flex-1" />
                  <span className="text-xs text-gray-600">{(abundance * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Wearable Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{mockWearableData.sleepHours}h</div>
              <div className="text-xs text-gray-600">Sleep</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{mockWearableData.steps.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Steps</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{mockWearableData.stressScore}/10</div>
              <div className="text-xs text-gray-600">Stress</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Health Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Overall Health Score</span>
              <div className="flex items-center gap-2">
                <Progress value={mockHealthInsights.overallScore} className="w-20" />
                <span className="text-sm font-bold">{mockHealthInsights.overallScore}/100</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Key Improvements:</h4>
              {mockHealthInsights.improvements.map((item, idx) => (
                <div key={idx} className="text-sm bg-blue-50 p-2 rounded">
                  <div className="font-medium">{item.category}</div>
                  <div className="text-gray-600">{item.improvement}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ChatInterface = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-lg p-3 space-y-2`}>
              {msg.isUser ? (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>{msg.message}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                    <div>{msg.response}</div>
                  </div>
                  
                  {msg.intent && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge className={`${getIntentColor(msg.intent)} text-xs`}>
                        {msg.intent}
                      </Badge>
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
                    <div className="bg-emerald-50 p-2 rounded text-sm">
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFeedback(msg.id, true)}
                        className="h-6 w-6 p-0"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFeedback(msg.id, false)}
                        className="h-6 w-6 p-0"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-600" />
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
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about your gut health, probiotics, diet recommendations..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!inputText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {learningMode && (
          <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-800">Learning mode active - I'll improve my responses based on your feedback!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 h-screen flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Microbiome AI Assistant
            </h1>
            <p className="text-gray-600 text-sm">Personalized gut health insights with self-learning capabilities</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Connected to {mockMicrobiomeData.sampleId}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-4 w-4 text-blue-500" />
            <span>Wearable synced</span>
          </div>
          <div className="flex items-center gap-1">
            <Brain className="h-4 w-4 text-purple-500" />
            <span>AI Learning: Active</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <ChatInterface />
          </Card>
        </TabsContent>
        
        <TabsContent value="analysis" className="flex-1 overflow-y-auto">
          <MicrobiomeAnalysis />
        </TabsContent>
        
        <TabsContent value="insights" className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Intent Recognition Accuracy</span>
                    <span className="font-bold">94%</span>
                  </div>
                  <Progress value={94} />
                  
                  <div className="flex items-center justify-between">
                    <span>Personalization Score</span>
                    <span className="font-bold">87%</span>
                  </div>
                  <Progress value={87} />
                  
                  <div className="text-sm text-gray-600 mt-4">
                    <strong>Recent Improvements:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• Learned 3 new custom responses this week</li>
                      <li>• Improved fiber recommendation accuracy</li>
                      <li>• Better handling of allergy-specific queries</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Health Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockHealthInsights.warnings.map((warning, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${warning.level === 'moderate' ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'} border`}>
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`h-4 w-4 ${warning.level === 'moderate' ? 'text-orange-600' : 'text-yellow-600'}`} />
                        <span className="text-sm">{warning.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MicrobiomeChat;