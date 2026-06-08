import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const GLOBE      = String.fromCodePoint(0x1F30D);
const THUMBS_UP  = String.fromCodePoint(0x1F44D);
const THUMBS_DOWN = String.fromCodePoint(0x1F44E);

function App() {
  const [messages, setMessages] = useState([
    { text: 'Hi! I\'m your travel assistant. Ask me anything about flights, hotels, visas, or bookings!', sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', email: '', query: '' });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const API_URL = '/api';

  useEffect(() => {
    fetchSuggestions();

    const handleUnload = () => {
      navigator.sendBeacon(
        `${API_URL}/end-session`,
        new Blob([JSON.stringify({ sessionId: sessionId.current })], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`${API_URL}/suggestions`);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const detectBookingIntent = (question) => {
    const bookingKeywords = ['book', 'booking', 'reserve', 'price', 'cost', 'package', 'plan', 'help me'];
    return bookingKeywords.some(kw => question.toLowerCase().includes(kw));
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;

    const userMessage = { text: messageText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: messageText, sessionId: sessionId.current }),
      });

      const data = await response.json();
      const botMessage = { text: data.answer, sender: 'bot', showFeedback: true };
      setMessages(prev => [...prev, botMessage]);

      // Check if booking intent detected
      if (detectBookingIntent(messageText)) {
        setLeadData({ ...leadData, query: messageText });
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { text: 'Great! I\'d love to help you with that. Can you share your name and email so I can send you personalized details?', sender: 'bot' }
          ]);
          setShowLeadForm(true);
        }, 1000);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { text: 'Sorry, I encountered an error. Please try again.', sender: 'bot' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const handleFeedback = async (messageIndex, helpful) => {
    const message = messages[messageIndex];
    try {
      await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: message.text, helpful }),
      });

      setMessages(prev =>
        prev.map((msg, idx) =>
          idx === messageIndex ? { ...msg, showFeedback: false, feedbackGiven: helpful } : msg
        )
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const submitLeadForm = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch(`${API_URL}/capture-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });

      setMessages(prev => [
        ...prev,
        { text: `Thank you, ${leadData.name}! I've sent your request to our team. We'll reach out to you at ${leadData.email} shortly with the best options!`, sender: 'bot' }
      ]);

      setShowLeadForm(false);
      setLeadData({ name: '', email: '', query: '' });
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { text: 'Sorry, there was an error. Please try again.', sender: 'bot' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="chat-container">
        <div className="chat-header">
          <h2>{GLOBE} Travel Chatbot</h2>
          <p>Your 24/7 travel companion</p>
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              <div className="message-bubble">
                {msg.text}
                {msg.showFeedback && (
                  <div className="feedback-buttons">
                    <button onClick={() => handleFeedback(index, true)} title="Helpful">{THUMBS_UP}</button>
                    <button onClick={() => handleFeedback(index, false)} title="Not Helpful">{THUMBS_DOWN}</button>
                  </div>
                )}
                {msg.feedbackGiven !== undefined && (
                  <span className="feedback-given">{msg.feedbackGiven ? `${THUMBS_UP} Thanks!` : `${THUMBS_DOWN} Noted`}</span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message bot">
              <div className="message-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {suggestions.length > 0 && messages.length <= 2 && (
          <div className="suggestions">
            <p>Popular questions:</p>
            <div className="suggestion-chips">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-chip"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {showLeadForm && (
          <div className="lead-form">
            <form onSubmit={submitLeadForm}>
              <input
                type="text"
                placeholder="Your Name"
                value={leadData.name}
                onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Your Email"
                value={leadData.email}
                onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>
        )}

        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me about your travel plans..."
            disabled={loading}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
