import React, { useState, useRef, useEffect } from 'react';
import { aiService } from '../../services/aiService';

import { supabase } from '../../services/supabase';


const HealthChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchUserProfile();
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const guestSessionId = !user ? aiService.getChatSessionId() : null;
      
      const history = await aiService.getChatHistory(user?.id, guestSessionId);
      
      if (history && history.length > 0) {
        // Map DB messages to UI format
        const formattedMessages = history.map(msg => ({
          id: msg.id,
          text: msg.message,
          role: msg.role
        }));
        setMessages(formattedMessages);
      } else {
        // Default welcome message if no history
        setMessages([
          { id: 'welcome', text: "Hi! I'm your heart health assistant. How can I help you today?", role: 'assistant' }
        ]);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Use default profile for guest users
        setUserProfile({
          name: 'Guest',
          age: 30,
          gender: 'other',
          activity_level: 'moderate'
        });
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setUserProfile({
          name: data.name || 'User',
          age: data.age,
          weight: data.weight,
          height: data.height,
          diseases: data.diseases || []
        });
      }
    } catch (error) {
      console.error("Error fetching user profile for chat:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = { id: Date.now(), text: inputText, role: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Use the service which now handles the API call
      // Map current messages to history format {role, message}
      const chatHistory = messages.map(m => ({ role: m.role, message: m.text }));
      const responseText = await aiService.chatWithAssistant(userMessage.text, chatHistory, userProfile);
      
      const aiMessage = { id: Date.now() + 1, text: responseText, role: 'assistant' };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = { id: Date.now() + 1, text: "Sorry, I encountered an error. Please try again.", role: 'assistant' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl mb-4 overflow-hidden border border-gray-100 flex flex-col transition-all duration-300 ease-in-out
          w-[calc(100vw-2rem)] h-[60vh]                /* Mobile: Full width minus margin, viewport based height */
          sm:w-96 sm:h-[500px]                          /* Small/Medium: Fixed widget size */
          xl:w-[450px] xl:h-[600px]                     /* XL/2XL: Larger comfortable size */
        ">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-base sm:text-lg">Health Assistant</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-2 text-sm sm:text-base shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-green-600 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about your health..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-base sm:text-sm"
              />
              <button 
                type="submit" 
                disabled={isLoading || !inputText.trim()}
                className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sticky Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          isOpen ? 'bg-gray-600 rotate-90' : 'bg-gradient-to-r from-green-600 to-teal-600 hover:scale-105'
        } text-white p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center`}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default HealthChat;
