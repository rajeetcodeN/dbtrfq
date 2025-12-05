import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, Bot, User, Settings, Plus } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  options?: string[];
}

interface ResponseTemplate {
  id: string;
  name: string;
  message: string;
  options?: string[];
}

interface ChatInterfaceProps {
  onProductSelect?: (product: string) => void;
  onReceiveMessage?: (message: string) => void;
  onFormFill?: (data: any) => void;
}

// Function to clean markdown formatting from text
const cleanMarkdown = (text: string): string => {
  return text
    // Remove bold formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic formatting
    .replace(/\*(.*?)\*/g, '$1')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    .replace(/^___+$/gm, '')
    .replace(/^\*\*\*+$/gm, '')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove numbered lists formatting
    .replace(/^\d+\.\s+/gm, '• ')
    // Remove bullet points and replace with clean bullets
    .replace(/^[\-\*\+]\s+/gm, '• ')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove extra asterisks and dashes
    .replace(/\*{3,}/g, '')
    .replace(/-{3,}/g, '')
    // Clean up extra whitespace and empty lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();
};

export default function ChatInterface({ onProductSelect, onReceiveMessage, onFormFill }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Welcome to dbt ai ! I\'m here to help you 24/7 with your product needs.',
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'bot',
      content: 'How can I assist you today? Choose from the quick options below or type your question:',
      timestamp: new Date(),
      options: ['Product Selection', 'Need Help', 'material or Configuration Unavailable']
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  // Generate new sessionId on component mount/refresh similar to how n8n does it
  const [sessionId] = useState(() => {
    // Generate a 32 character hex string similar to n8n's session format
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  });
  const [webhookUrl, setWebhookUrl] = useState('https://nosta.app.n8n.cloud/webhook/b4c843be-698d-40c6-8e31-9370f5e165e0');
  const [responseTemplates, setResponseTemplates] = useState<ResponseTemplate[]>([
    { id: '1', name: 'Product Selection', message: 'Please choose a product:', options: ['Passfeder', 'Scheibenfeder', 'Nutenstein'] },
    { id: '2', name: 'Need Help', message: 'How can I help you today?', options: ['Technical Support', 'Pricing Info', 'Product Details'] },
    { id: '3', name: 'Product Groups', message: 'Please choose a product:', options: ['Passfeder', 'Scheibenfeder', 'Nutenstein'] },
    { id: '4', name: 'material or Configuration Unavailable', message: 'The specification/material I am looking for is unavailable' }
  ]);
  const [newTemplate, setNewTemplate] = useState({ name: '', message: '', options: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to receive external messages (from Ask AI buttons)
  const receiveExternalMessage = (content: string) => {
    // Send directly to webhook - sendMessage will handle adding the user message
    sendMessage(content);
  };

  // Expose the function to parent component
  useEffect(() => {
    if (onReceiveMessage) {
      // Store the function reference so parent can call it
      (window as any).sendMessageToChat = receiveExternalMessage;
    }
  }, [onReceiveMessage]);

  const sendMessage = async (content: string, isOptionClick = false) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Handle product selection
    if (isOptionClick && onProductSelect) {
      onProductSelect(content);
    }

    // Check if webhook URL is configured
    if (!webhookUrl) {
      // Add error message for missing webhook URL
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Please configure your N8N webhook URL in settings first.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    try {
      // Send to n8n webhook in the required format
      const requestBody = [
        {
          sessionId,
          action: "sendMessage",
          chatInput: content
        }
      ];

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        let responseData;
        const responseText = await response.text();

        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch (error) {
          console.error('Error parsing JSON response:', error, 'Response text:', responseText);
          // Create fallback bot message
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'bot',
            content: 'Sorry, I received an invalid response. Please try again.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, botMessage]);
          return;
        }

        console.log('Received webhook response:', responseData);

        // Handle both array and object formats
        let data = responseData;
        if (Array.isArray(responseData) && responseData.length > 0) {
          data = responseData[0];
        }

        // Extract and display the output message
        const rawBotContent = data.output || 'Thank you for your message. How can I help you further?';
        const botContent = cleanMarkdown(rawBotContent);

        // Create dynamic buttons from the button field
        let options: string[] | undefined = undefined;
        if (data.button) {
          // Handle multiple buttons separated by comma or create single button
          options = typeof data.button === 'string'
            ? data.button.split(',').map(btn => btn.trim()).filter(btn => btn)
            : [data.button.toString()];
        }

        // Add bot response
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: botContent,
          timestamp: new Date(),
          options,
        };

        setMessages(prev => [...prev, botMessage]);

        // Handle form fill data from fromfill field
        if (data.fromfill && (window as any).fillFormFromChat) {
          try {
            // Parse fromfill data format: "productGroup: Passfeder (Keyway)• dinNorm: Keine Norm• material: C45• breite: 4• hohe: 4• tiefe: 4"
            const formData: any = {};
            const entries = data.fromfill.split('•').map((entry: string) => entry.trim());

            entries.forEach((entry: string) => {
              const colonIndex = entry.indexOf(':');
              if (colonIndex > -1) {
                const key = entry.substring(0, colonIndex).trim();
                const value = entry.substring(colonIndex + 1).trim();
                formData[key] = value;
              }
            });

            console.log('Filling form with data:', formData);
            (window as any).fillFormFromChat(formData);

            // Don't show formfill JSON in chat - it's processed automatically
          } catch (error) {
            console.error('Error parsing fromfill data:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Connection error. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleOptionClick = (option: string) => {
    // Check if this is a template name, if so send the template message
    const template = responseTemplates.find(t => t.name === option);
    if (template) {
      sendMessage(template.message, true);
    } else {
      // Regular product option
      sendMessage(option, true);
    }
  };

  const addResponseTemplate = () => {
    if (!newTemplate.name || !newTemplate.message) return;

    const template: ResponseTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      message: newTemplate.message,
      options: newTemplate.options ? newTemplate.options.split(',').map(o => o.trim()).filter(o => o) : undefined
    };

    setResponseTemplates(prev => [...prev, template]);
    setNewTemplate({ name: '', message: '', options: '' });
  };

  const sendTemplateResponse = (template: ResponseTemplate) => {
    // Send template message as user message to N8N backend
    sendMessage(template.message);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-chat-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6" />
          <div>
            <h2 className="font-semibold text-lg">DBT AI</h2>
            <p className="text-sm opacity-90">Session: {sessionId.substring(0, 8)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Response Templates */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Plus className="h-4 w-4 mr-1" />
                Response
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Quick Responses</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  {responseTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => sendTemplateResponse(template)}
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{template.message}</div>
                      </div>
                    </Button>
                  ))}
                </div>
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium text-sm">Create New Template</h4>
                  <Input
                    placeholder="Template name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Message"
                    value={newTemplate.message}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, message: e.target.value }))}
                  />
                  <Input
                    placeholder="Options (comma separated, optional)"
                    value={newTemplate.options}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, options: e.target.value }))}
                  />
                  <Button onClick={addResponseTemplate} className="w-full">Add Template</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Settings */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                aria-label="Settings"
              >
                <span className="sr-only">Settings</span>
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Chat Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">N8N Webhook URL</label>
                  <Input
                    placeholder="https://your-n8n-instance.com/webhook/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default webhook URL is pre-configured
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium">
            nosta
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="space-y-8 px-6 py-8">
            {messages.map((message) => (
              <div key={message.id} className="w-full">
                {message.type === 'user' ? (
                  // User message with modern bubble design
                  <div className="flex justify-end mb-6">
                    <div className="max-w-[75%] flex items-start gap-3">
                      <div className="flex-1">
                        <div className="bg-primary text-primary-foreground rounded-2xl px-6 py-4 shadow-lg">
                          <div
                            className="whitespace-pre-wrap break-words leading-relaxed"
                            style={{
                              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                              fontSize: '14px',
                              lineHeight: '1.6'
                            }}
                          >
                            {message.content}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 text-right font-medium opacity-70">
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Bot message with clean document-style layout (no bubble)
                  <div className="w-full mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary-dark flex items-center justify-center text-white font-semibold text-xs">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-muted-foreground font-medium opacity-70">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>

                    {/* Bot Response Content - Clean text without bubble */}
                    <div className="ml-11">
                      <div
                        className="text-gray-800 leading-relaxed"
                        style={{
                          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontSize: '14px',
                          lineHeight: '1.6'
                        }}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {cleanMarkdown(message.content)}
                        </div>
                      </div>

                      {message.options && (
                        <div className="flex flex-wrap gap-3 mt-5">
                          {message.options.map((option, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => handleOptionClick(option)}
                              className={`rounded-full text-sm font-medium px-5 py-2.5 transition-all duration-200 border-2 ${option === 'Passfeder' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:shadow-md hover:scale-105' :
                                option === 'Scheibenfeder' ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:shadow-md hover:scale-105' :
                                  'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:shadow-md hover:scale-105'
                                }`}
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>
      {/* Input - Fixed at bottom */}
      <div className="border-t border-gray-200 bg-white p-6 flex-shrink-0">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex gap-3 items-end">
            <Input
              id="chat-message-input"
              name="chatMessage"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 rounded-2xl bg-gray-50 border-gray-200 px-5 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                minHeight: '48px'
              }}
              aria-label="Type your message"
              aria-required="true"
              role="textbox"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 shrink-0 h-12 w-12 shadow-lg transition-all duration-200 hover:scale-105"
              disabled={!inputValue.trim()}
              aria-label="Send message"
              role="button"
            >
              <span className="sr-only">Send message</span>
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 px-1 font-medium opacity-70">
            Press Enter to send your message
          </p>
        </form>
      </div>
    </div>
  );
}