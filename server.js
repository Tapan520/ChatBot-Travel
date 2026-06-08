const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// Google Sheets Setup
// Local dev  → uses credentials.json file
// Railway    → uses GOOGLE_CREDENTIALS_JSON env variable
// ─────────────────────────────────────────────
const googleAuthConfig = process.env.GOOGLE_CREDENTIALS_JSON
  ? { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON), scopes: ['https://www.googleapis.com/auth/spreadsheets'] }
  : { keyFile: 'credentials.json', scopes: ['https://www.googleapis.com/auth/spreadsheets'] };

const auth = new google.auth.GoogleAuth(googleAuthConfig);
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// ─────────────────────────────────────────────
// Email Setup
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ Email verification FAILED:', error.message);
  } else {
    console.log('✅ Email transporter verified — ready to send emails');
  }
});

// ─────────────────────────────────────────────
// Anthropic Claude AI Setup (Hybrid)
// ─────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AI_MODEL = 'claude-haiku-4-5-20251001'; // Cheapest model — perfect for travel Q&A

async function askClaude(question, conversationHistory = []) {
  if (!ANTHROPIC_API_KEY) {
    return null; // Gracefully fall back if no key set
  }

  const systemPrompt = `You are a helpful travel assistant for an Indian travel agency. 
You specialise in travel from India — flights, hotels, visa requirements, tour packages, honeymoon trips, group travel, and travel tips.
Always give practical, specific answers. Mention prices in Indian Rupees (₹) where relevant.
Keep answers concise (3-5 sentences max) and friendly.
If asked about booking, gently ask for the user's name and email to pass to the travel team.
Do not make up specific prices — give realistic ranges instead.`;

  const messages = [
    ...conversationHistory,
    { role: 'user', content: question }
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Claude API error:', data.error.message);
      return null;
    }

    return data.content?.[0]?.text || null;
  } catch (err) {
    console.error('Claude API call failed:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Session Store (for unanswered question emails)
// ─────────────────────────────────────────────
const sessionStore = new Map();
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

function scheduleSessionFlush(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) return;
  if (session.timer) clearTimeout(session.timer);
  session.timer = setTimeout(() => flushSessionEmail(sessionId), SESSION_TIMEOUT_MS);
}

async function flushSessionEmail(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session || session.questions.length === 0) {
    sessionStore.delete(sessionId);
    return;
  }
  const questions = session.questions;
  sessionStore.delete(sessionId);

  const rows = questions.map((q, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#ffffff'}">
      <td style="padding:8px;border:1px solid #ddd">${i + 1}</td>
      <td style="padding:8px;border:1px solid #ddd">${q.question}</td>
      <td style="padding:8px;border:1px solid #ddd">${q.intent.toUpperCase()}</td>
      <td style="padding:8px;border:1px solid #ddd;color:${q.sentiment === 'high_priority' ? 'red' : 'orange'}">${q.sentiment}</td>
      <td style="padding:8px;border:1px solid #ddd">${q.timestamp}</td>
    </tr>`).join('');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `❓ ${questions.length} Unanswered Question(s) — Add to Google Sheet`,
    html: `
      <h2>Questions AI Could Not Answer</h2>
      <p>These <strong>${questions.length}</strong> question(s) were not answered even by AI. Consider adding them to your Google Sheet for faster responses in future:</p>
      <table style="border-collapse:collapse;width:100%">
        <thead><tr style="background:#4a90d9;color:white">
          <th style="padding:10px;border:1px solid #ddd">#</th>
          <th style="padding:10px;border:1px solid #ddd">Question</th>
          <th style="padding:10px;border:1px solid #ddd">Intent</th>
          <th style="padding:10px;border:1px solid #ddd">Priority</th>
          <th style="padding:10px;border:1px solid #ddd">Time</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p><em>Tip: Adding these to the QnA_Database sheet reduces AI API calls and saves cost.</em></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Unanswered summary email sent — ${questions.length} question(s)`);
  } catch (error) {
    console.error('Error sending summary email:', error);
  }
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
function calculateSimilarity(question, dbQuestion) {
  const q1 = question.toLowerCase().split(' ');
  const q2 = dbQuestion.toLowerCase().split(' ');
  const intersection = q1.filter(word => q2.includes(word));
  return intersection.length / Math.max(q1.length, q2.length);
}

function detectIntent(question) {
  const lowerQ = question.toLowerCase();
  if (['book', 'booking', 'reserve', 'price', 'cost', 'package'].some(kw => lowerQ.includes(kw))) return 'booking';
  if (['flight', 'airline', 'fly', 'ticket'].some(kw => lowerQ.includes(kw))) return 'flight';
  if (['hotel', 'accommodation', 'stay', 'resort'].some(kw => lowerQ.includes(kw))) return 'hotel';
  if (['visa', 'passport', 'documents', 'embassy'].some(kw => lowerQ.includes(kw))) return 'visa';
  return 'general';
}

function detectSentiment(question) {
  const urgentWords = ['urgent', 'asap', 'immediately', 'soon', 'ready', 'excited', '!'];
  const score = urgentWords.filter(w => question.toLowerCase().includes(w)).length;
  if (score >= 2) return 'high_priority';
  if (score === 1) return 'medium_priority';
  return 'normal';
}

// ─────────────────────────────────────────────
// Google Sheets Helpers
// ─────────────────────────────────────────────
async function getQnADatabase() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'QnA_Database!A2:E',
    });
    return response.data.values || [];
  } catch (error) {
    console.error('Error fetching QnA:', error.message);
    return [];
  }
}

async function saveUnansweredQuestion(question, intent) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Unanswered_Questions!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[new Date().toISOString(), question, '', intent]] },
    });
  } catch (error) {
    console.error('Error saving unanswered question:', error.message);
  }
}

async function saveLeadCapture(name, email, query, sentiment) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Lead_Capture!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[new Date().toISOString(), name, email, query, sentiment, sentiment === 'high_priority' ? 'YES' : 'NO']] },
    });
  } catch (error) {
    console.error('Error saving lead:', error.message);
  }
}

async function sendLeadEmail(name, email, query, sentiment) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `🌍 New ${sentiment === 'high_priority' ? 'URGENT ' : ''}Travel Lead — ${name}`,
      html: `
        <h2>New Booking Intent Detected!</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Query:</strong> ${query}</p>
        <p><strong>Priority:</strong> <span style="color:${sentiment === 'high_priority' ? 'red' : 'green'}">${sentiment.toUpperCase()}</span></p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>`,
    });
    console.log('✅ Lead email sent for:', name);
  } catch (error) {
    console.error('Error sending lead email:', error.message);
  }
}

async function incrementPopularCount(rowIndex) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `QnA_Database!E${rowIndex}`,
    });
    const current = parseInt(res.data.values?.[0]?.[0] || 0);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `QnA_Database!E${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[current + 1]] },
    });
  } catch (error) {
    console.error('Error updating count:', error.message);
  }
}

// ─────────────────────────────────────────────
// HYBRID MATCHING LOGIC
// Step 1: Try Google Sheet (free)
// Step 2: If no match → ask Claude AI (paid but cheap)
// Step 3: If AI also fails → save as unanswered
// ─────────────────────────────────────────────
async function getHybridAnswer(question, conversationHistory) {

  // STEP 1 — Google Sheet lookup
  const qnaData = await getQnADatabase();
  let bestMatch = null;
  let bestScore = 0;
  let bestRowIndex = -1;

  qnaData.forEach((row, index) => {
    const [dbQuestion, answer, , keywords] = row;
    const score = calculateSimilarity(question, dbQuestion);
    const keywordArray = keywords?.toLowerCase().split(',') || [];
    const keywordMatch = keywordArray.some(kw => question.toLowerCase().includes(kw.trim()));
    const finalScore = keywordMatch ? score + 0.3 : score;

    if (finalScore > bestScore && finalScore > 0.3) {
      bestScore = finalScore;
      bestMatch = { question: dbQuestion, answer, category: row[2] };
      bestRowIndex = index + 2;
    }
  });

  if (bestMatch) {
    await incrementPopularCount(bestRowIndex);
    console.log(`✅ Sheet match — score: ${bestScore.toFixed(2)} — "${bestMatch.question}"`);
    return {
      answer: bestMatch.answer,
      source: 'sheet',
      matched: true,
      category: bestMatch.category,
      confidence: bestScore,
    };
  }

  // STEP 2 — Claude AI fallback
  console.log(`🤖 No sheet match for: "${question}" — calling Claude AI...`);
  const aiAnswer = await askClaude(question, conversationHistory);

  if (aiAnswer) {
    console.log(`✅ AI answered: "${question}"`);
    return {
      answer: aiAnswer,
      source: 'ai',
      matched: true,
    };
  }

  // STEP 3 — Truly unanswered
  console.log(`❌ No answer found for: "${question}"`);
  return {
    answer: "I don't have a specific answer for that yet. Our travel team will look into it! Can I help you with flights, hotels, or visa queries?",
    source: 'fallback',
    matched: false,
  };
}

// ─────────────────────────────────────────────
// API Endpoints
// ─────────────────────────────────────────────

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { question, sessionId, conversationHistory = [] } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const result = await getHybridAnswer(question, conversationHistory);

    // If still unmatched, buffer for email
    if (!result.matched) {
      const intent = detectIntent(question);
      const sentiment = detectSentiment(question);
      await saveUnansweredQuestion(question, intent);

      const sid = sessionId || 'default';
      if (!sessionStore.has(sid)) sessionStore.set(sid, { questions: [], timer: null });
      sessionStore.get(sid).questions.push({
        question, intent, sentiment,
        timestamp: new Date().toLocaleString(),
      });
      scheduleSessionFlush(sid);
    }

    return res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Suggestions endpoint
app.get('/api/suggestions', async (req, res) => {
  try {
    const qnaData = await getQnADatabase();
    const sorted = qnaData
      .map(row => ({ question: row[0], count: parseInt(row[4] || 0) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => item.question);
    res.json({ suggestions: sorted });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lead capture endpoint
app.post('/api/capture-lead', async (req, res) => {
  try {
    const { name, email, query } = req.body;
    if (!name || !email || !query) {
      return res.status(400).json({ error: 'Name, email, and query are required' });
    }
    const sentiment = detectSentiment(query);
    await saveLeadCapture(name, email, query, sentiment);
    await sendLeadEmail(name, email, query, sentiment);
    res.json({ success: true, message: 'Lead captured successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Feedback endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const { question, helpful } = req.body;
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Feedback!A:C',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[new Date().toISOString(), question, helpful ? 'Thumbs Up' : 'Thumbs Down']] },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End session endpoint
app.post('/api/end-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) await flushSessionEmail(sessionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Travel Chatbot API is running',
    ai_enabled: !!ANTHROPIC_API_KEY,
    mode: ANTHROPIC_API_KEY ? 'Hybrid (Sheet + Claude AI)' : 'Sheet only (add ANTHROPIC_API_KEY to enable AI)',
  });
});

// Debug email endpoint
app.get('/api/debug-email', (req, res) => {
  res.json({
    email_user: process.env.EMAIL_USER,
    password_loaded: !!process.env.EMAIL_APP_PASSWORD,
    ai_key_loaded: !!ANTHROPIC_API_KEY,
    ai_model: AI_MODEL,
  });
});

// ─────────────────────────────────────────────
// Serve React frontend in production (Railway)
// In development, React runs on its own port via npm run dev
// In production (Railway), Express serves the built React files
// ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'client', 'build');
  app.use(express.static(buildPath));
  // Any route not matching /api/* → serve React index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
  console.log('📦 Serving React build from client/build');
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Travel Chatbot Server running on port ${PORT}`);
  console.log(`📧 Email notifications → ${process.env.EMAIL_USER}`);
  if (ANTHROPIC_API_KEY) {
    console.log(`🤖 AI Mode: HYBRID — Google Sheet first, Claude AI (${AI_MODEL}) as fallback`);
  } else {
    console.log(`⚠️  AI Mode: DISABLED — Add ANTHROPIC_API_KEY to .env to enable Claude AI`);
  }
  console.log('');
});
