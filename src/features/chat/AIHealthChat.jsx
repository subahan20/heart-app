import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  ChevronDown, 
  RefreshCw, 
  MessageSquare,
  X,
  Sparkles,
  HeartPulse
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { aiService } from '../../services/aiService';
import { useHealthProfile } from '../../hooks/useHealthProfile';

export const AIHealthChat = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { profile } = useHealthProfile();

  // 1. Initial Load: Fetch History
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const guestSessionId = !user ? aiService.getChatSessionId() : null;
        const history = await aiService.getChatHistory(user?.id, guestSessionId);
        
        if (history.length === 0) {
          setMessages([{
            role: 'assistant',
            message: "Hello! I'm your AI Health Assistant. How can I help you with your wellness journey today?",
            created_at: new Date().toISOString()
          }]);
        } else {
          setMessages(history);
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
        setError("Failed to load conversation history.");
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  // 2. Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // 3. Handle Send
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Optimistically add user message
    const newUserMsg = { 
      role: 'user', 
      message: userMessage, 
      created_at: new Date().toISOString() 
    };
    setMessages(prev => [...prev, newUserMsg]);
    
    setIsTyping(true);

    try {
      // Send message to AI with history
      // We exclude most recent message from history as Edge Function adds it
      const response = await aiService.chatWithAssistant(
        userMessage, 
        messages.slice(-10), // Send last 10 messages for context
        profile
      );

      const aiMsg = { 
        role: 'assistant', 
        message: response, 
        created_at: new Date().toISOString() 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setError("I'm having trouble connecting to my brain right now. Please try again!");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex items-center justify-between text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <HeartPulse className="w-32 h-32 -mr-8 -mt-8" />
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Health Assistant</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-blue-100 font-medium">Ready to help</span>
            </div>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scrollbar-hide">
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-slate-500 font-sans">Syncing conversation history...</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${
                    msg.role === 'user' ? 'bg-indigo-100' : 'bg-blue-600'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className={`p-4 rounded-2xl shadow-sm border ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                      : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                  }`}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.message}
                    </p>
                    <span className={`text-[10px] mt-2 block opacity-60 ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center animate-in zoom-in duration-300">
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-medium border border-red-100 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3" />
                  {error}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form 
          onSubmit={handleSend}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || isTyping}
            placeholder="Ask me anything about heart health..."
            className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-slate-700 text-[15px] resize-none overflow-hidden"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isTyping}
            className={`absolute right-1.5 p-2 rounded-xl transition-all ${
              input.trim() && !isLoading && !isTyping
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 hover:scale-105 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5 translate-x-0.5 -translate-y-0.5" />
          </button>
        </form>
        <p className="text-[10px] text-center mt-2.5 text-slate-400 font-medium flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          AI assistant may provide general health info. Consult a doctor for medical advice.
        </p>
      </div>
    </div>
  );
};
