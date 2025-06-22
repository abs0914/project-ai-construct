
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  FileText, 
  Calendar, 
  AlertCircle,
  Settings,
  History,
  Star,
  Lightbulb,
  BarChart3
} from 'lucide-react';

interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  category?: string;
}

const AIChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your ConstructAI assistant. I can help you with project management, safety compliance, scheduling, and more. What would you like to know?',
      timestamp: new Date(),
      category: 'greeting'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mock AI responses based on keywords
  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('safety') || lowerMessage.includes('compliance')) {
      return 'I can help you with safety compliance! Here are some key points:\n\n• Ensure all workers wear proper PPE\n• Conduct daily safety briefings\n• Check equipment maintenance schedules\n• Review incident reports regularly\n\nWould you like me to generate a safety checklist for your current project?';
    }
    
    if (lowerMessage.includes('schedule') || lowerMessage.includes('timeline')) {
      return 'For project scheduling, I recommend:\n\n• Review critical path activities\n• Check for resource conflicts\n• Monitor weather impact on outdoor work\n• Update progress weekly\n\nI can help you optimize your project timeline. Which phase needs attention?';
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('cost')) {
      return 'Budget management is crucial! Here\'s what I suggest:\n\n• Track actual vs planned costs weekly\n• Monitor material price fluctuations\n• Review labor productivity rates\n• Plan for contingencies (10-15%)\n\nWould you like me to analyze your current budget variance?';
    }
    
    if (lowerMessage.includes('task') || lowerMessage.includes('assignment')) {
      return 'For task management:\n\n• Prioritize tasks by deadline and dependency\n• Assign clear responsibilities\n• Set up progress tracking\n• Use collaborative tools for updates\n\nI can help you create task assignments. What area needs organization?';
    }
    
    if (lowerMessage.includes('report') || lowerMessage.includes('document')) {
      return 'I can help generate various reports:\n\n• Daily progress reports\n• Safety incident summaries\n• Budget variance analysis\n• Resource utilization reports\n\nWhich type of report would you like me to prepare?';
    }
    
    return 'I understand you\'re asking about construction project management. I can assist with:\n\n• Project scheduling and timelines\n• Safety and compliance matters\n• Budget tracking and cost control\n• Task management and assignments\n• Report generation\n• Resource planning\n\nCould you be more specific about what you need help with?';
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const botResponse: Message = {
        id: Date.now() + 1,
        type: 'bot',
        content: generateResponse(inputMessage),
        timestamp: new Date(),
        category: 'response'
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { label: 'Generate Safety Report', icon: AlertCircle, category: 'safety' },
    { label: 'Check Project Timeline', icon: Calendar, category: 'schedule' },
    { label: 'Budget Analysis', icon: BarChart3, category: 'budget' },
    { label: 'Task Recommendations', icon: Lightbulb, category: 'tasks' },
  ];

  const handleQuickAction = (action: typeof quickActions[0]) => {
    setInputMessage(`Please ${action.label.toLowerCase()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground">
            Your intelligent construction project management assistant
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            <Bot className="mr-1 h-3 w-3" />
            Online
          </Badge>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3">
              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Chat with AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'user' ? 'bg-primary' : 'bg-secondary'}`}>
                              {message.type === 'user' ? (
                                <User className="h-4 w-4 text-primary-foreground" />
                              ) : (
                                <Bot className="h-4 w-4 text-secondary-foreground" />
                              )}
                            </div>
                            <div className={`rounded-lg p-3 ${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="flex items-start space-x-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary">
                              <Bot className="h-4 w-4 text-secondary-foreground" />
                            </div>
                            <div className="rounded-lg p-3 bg-muted">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div ref={messagesEndRef} />
                  </ScrollArea>
                  <div className="mt-4 flex space-x-2">
                    <Input
                      placeholder="Ask me anything about your construction project..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleQuickAction(action)}
                      >
                        <action.icon className="mr-2 h-4 w-4" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>AI Capabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                      Document Analysis
                    </div>
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      Schedule Optimization
                    </div>
                    <div className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                      Safety Recommendations
                    </div>
                    <div className="flex items-center">
                      <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
                      Cost Analysis
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat History</CardTitle>
              <CardDescription>
                Your previous conversations with the AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Safety Protocol Discussion</p>
                    <span className="text-sm text-muted-foreground">2 hours ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Discussed PPE requirements and safety checklist generation...</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Project Timeline Review</p>
                    <span className="text-sm text-muted-foreground">1 day ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Analyzed critical path and resource allocation for Building A...</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Budget Variance Analysis</p>
                    <span className="text-sm text-muted-foreground">3 days ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Reviewed cost overruns in materials and labor for Q1...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Schedule Optimization</p>
                      <p className="text-sm text-muted-foreground">
                        Consider parallel execution of foundation and electrical rough-in
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Cost Savings</p>
                      <p className="text-sm text-muted-foreground">
                        Bulk purchase of concrete could save 12% on materials
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Safety Alert</p>
                      <p className="text-sm text-muted-foreground">
                        Increase safety inspections during high-wind weather
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Conversations</span>
                    <span className="font-medium">47</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Questions Answered</span>
                    <span className="font-medium">156</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reports Generated</span>
                    <span className="font-medium">23</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Saved</span>
                    <span className="font-medium">18.5 hrs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIChatbot;
