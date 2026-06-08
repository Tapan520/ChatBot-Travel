import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { text: "Hi! I'm your AI-powered travel assistant 🌍 Ask me anything about flights, hotels, visas, or tour packages!", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', email: '', query: '' });
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${API_URL}/suggestions`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Suggestions error:', err);
    }
  };

  const detectBookingIntent = (text) => {
    return ['book', 'booking', 'reserve', 'price', 'cost', 'package', 'plan', 'help me']
      .some(kw => text.toLowerCase().includes(kw));
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;

    const userMessage = { text: messageText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Build conversation history for Claude AI context
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: messageText }
    ];

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: messageText,
          sessionId: sessionId.current,
          conversationHistory,
        }),
      });

      const data = await res.json();

      // Show a small badge if answer came from AI
      const botMessage = {
        text: data.answer,
        sender: 'bot',
        showFeedback: true,
        source: data.source,
      };
      setMessages(prev => [...prev, botMessage]);

      // Update conversation history with AI's reply
      setConversationHistory([
        ...updatedHistory,
        { role: 'assistant', content: data.answer }
      ]);

      // Booking intent → show lead form
      if (detectBookingIntent(messageText)) {
        setLeadData(prev => ({ ...prev, query: messageText }));
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { text: "Great! I'd love to connect you with our travel team. Can you share your name and email so we can send you personalised options?", sender: 'bot' }
          ]);
          setShowLeadForm(true);
        }, 1000);
      }
    } catch (err) {
      setMessages(prev => [...prev, { text: 'Sorry, I ran into an error. Please try again!', sender: 'bot' }]);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.error('Feedback error:', err);
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
        { text: `Thank you, ${leadData.name}! Our team will reach out to you at ${leadData.email} with the best travel options!`, sender: 'bot' }
      ]);
      setShowLeadForm(false);
      setLeadData({ name: '', email: '', query: '' });
    } catch (err) {
      setMessages(prev => [...prev, { text: 'Sorry, there was an error. Please try again.', sender: 'bot' }]);
    } finally {
      setLoading(false);
    }
  };

  const getSourceBadge = (source) => {
    if (source === 'ai') return <span className="source-badge ai-badge">AI</span>;
    if (source === 'sheet') return <span className="source-badge sheet-badge">FAQ</span>;
    return null;
  };

  return (
    <div className="App">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-icon">✈️</div>
          <div>
            <h2>AI Travel Assistant</h2>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              <div className="message-bubble">
                {msg.source && getSourceBadge(msg.source)}
                <span>{msg.text}</span>
                {msg.showFeedback && (
                  <div className="feedback-buttons">
                    <button onClick={() => handleFeedback(index, true)} title="Helpful">👍</button>
                    <button onClick={() => handleFeedback(index, false)} title="Not Helpful">👎</button>
                  </div>
                )}
                {msg.feedbackGiven !== undefined && (
                  <span className="feedback-given">{msg.feedbackGiven ? '👍 Thanks!' : '👎 Noted!'}</span>
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
              {suggestions.map((s, i) => (
                <button key={i} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {showLeadForm && (
          <div className="lead-form">
            <form onSubmit={submitLeadForm}>
              <input
                type="text" placeholder="Your Name"
                value={leadData.name}
                onChange={e => setLeadData({ ...leadData, name: e.target.value })}
                required
              />
              <input
                type="email" placeholder="Your Email"
                value={leadData.email}
                onChange={e => setLeadData({ ...leadData, email: e.target.value })}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Connect Me With Travel Team'}
              </button>
            </form>
          </div>
        )}

        <div className="chat-input">
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask anything about your travel plans..."
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
