const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Verify email transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email verification FAILED:', error.message);
    console.error('   EMAIL_USER    :', process.env.EMAIL_USER);
    console.error('   PASSWORD len  :', process.env.EMAIL_APP_PASSWORD?.length || 0);
    console.error('   PASSWORD prev :', process.env.EMAIL_APP_PASSWORD
      ? `${process.env.EMAIL_APP_PASSWORD.substring(0, 4)}****`
      : 'NOT LOADED');
  } else {
    console.log('✅ Email transporter verified — ready to send emails');
  }
});

// In-memory session store: sessionId → { questions: [], timer: null }
const sessionStore = new Map();
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes of inactivity

function scheduleSessionFlush(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) return;

  if (session.timer) clearTimeout(session.timer);

  session.timer = setTimeout(() => {
    flushSessionEmail(sessionId);
  }, SESSION_TIMEOUT_MS);
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
      <td style="padding:8px;border:1px solid #ddd;color:${q.sentiment === 'high_priority' ? 'red' : q.sentiment === 'medium_priority' ? 'orange' : 'green'}">${q.sentiment.toUpperCase()}</td>
      <td style="padding:8px;border:1px solid #ddd">${q.timestamp}</td>
    </tr>`).join('');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `❓ ${questions.length} Unanswered Question(s) from a Conversation`,
    html: `
      <h2>Unanswered Questions Summary</h2>
      <p>The following <strong>${questions.length}</strong> question(s) were not answered during a chat session:</p>
      <table style="border-collapse:collapse;width:100%">
        <thead>
          <tr style="background:#4a90d9;color:white">
            <th style="padding:10px;border:1px solid #ddd">#</th>
            <th style="padding:10px;border:1px solid #ddd">Question</th>
            <th style="padding:10px;border:1px solid #ddd">Intent</th>
            <th style="padding:10px;border:1px solid #ddd">Priority</th>
            <th style="padding:10px;border:1px solid #ddd">Time</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <br>
      <p><em>Please add these questions and their answers to the Google Sheet to improve the chatbot!</em></p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Summary email sent — ${questions.length} unanswered question(s)`);
  } catch (error) {
    console.error('Error sending unanswered summary email:', error);
  }
}

// Utility: Calculate similarity score
function calculateSimilarity(question, dbQuestion) {
  const q1 = question.toLowerCase().split(' ');
  const q2 = dbQuestion.toLowerCase().split(' ');
  const intersection = q1.filter(word => q2.includes(word));
  return intersection.length / Math.max(q1.length, q2.length);
}

// Utility: Detect intent
function detectIntent(question) {
  const bookingKeywords = ['book', 'booking', 'reserve', 'reservation', 'price', 'cost', 'package'];
  const flightKeywords = ['flight', 'airline', 'fly', 'ticket'];
  const hotelKeywords = ['hotel', 'accommodation', 'stay', 'resort'];
  const visaKeywords = ['visa', 'passport', 'documents', 'embassy'];

  const lowerQ = question.toLowerCase();

  if (bookingKeywords.some(kw => lowerQ.includes(kw))) return 'booking';
  if (flightKeywords.some(kw => lowerQ.includes(kw))) return 'flight';
  if (hotelKeywords.some(kw => lowerQ.includes(kw))) return 'hotel';
  if (visaKeywords.some(kw => lowerQ.includes(kw))) return 'visa';

  return 'general';
}

// Utility: Detect sentiment/urgency
function detectSentiment(question) {
  const excitedWords = ['urgent', 'asap', 'immediately', 'soon', 'ready', 'excited', '!'];
  const lowerQ = question.toLowerCase();

  const excitementScore = excitedWords.filter(word => lowerQ.includes(word)).length;

  if (excitementScore >= 2) return 'high_priority';
  if (excitementScore === 1) return 'medium_priority';
  return 'normal';
}

// Get QnA from Google Sheets
async function getQnADatabase() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'QnA_Database!A2:E',
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error fetching QnA:', error);
    return [];
  }
}

// Save unanswered question
async function saveUnansweredQuestion(question, intent) {
  const timestamp = new Date().toISOString();
  const values = [[timestamp, question, '', intent]];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Unanswered_Questions!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
  } catch (error) {
    console.error('Error saving unanswered question:', error);
  }
}

// Save lead capture
async function saveLeadCapture(name, email, query, sentiment) {
  const timestamp = new Date().toISOString();
  const values = [[timestamp, name, email, query, sentiment, sentiment === 'high_priority' ? 'YES' : 'NO']];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Lead_Capture!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
  } catch (error) {
    console.error('Error saving lead capture:', error);
  }
}

// Send email notification (for leads)
async function sendEmailNotification(name, email, query, sentiment) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `🌍 New ${sentiment === 'high_priority' ? 'URGENT' : ''} Travel Lead - ${name}`,
    html: `
      <h2>New Booking Intent Detected!</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Query:</strong> ${query}</p>
      <p><strong>Priority:</strong> <span style="color: ${sentiment === 'high_priority' ? 'red' : 'green'}">${sentiment.toUpperCase()}</span></p>
      <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      <hr>
      <p><em>Respond quickly to convert this lead!</em></p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Lead email sent to:', process.env.EMAIL_USER);
  } catch (error) {
    console.error('Error sending lead email:', error);
  }
}

// Update popular count
async function incrementPopularCount(rowIndex) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `QnA_Database!E${rowIndex}`,
    });

    const currentCount = parseInt(response.data.values?.[0]?.[0] || 0);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `QnA_Database!E${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[currentCount + 1]] },
    });
  } catch (error) {
    console.error('Error updating popular count:', error);
  }
}

// API Endpoints

// Get chat response
app.post('/api/chat', async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const qnaData = await getQnADatabase();
    let bestMatch = null;
    let bestScore = 0;
    let bestRowIndex = -1;

    // Find best matching answer
    qnaData.forEach((row, index) => {
      const [dbQuestion, answer, category, keywords] = row;
      const score = calculateSimilarity(question, dbQuestion);

      const keywordArray = keywords?.toLowerCase().split(',') || [];
      const keywordMatch = keywordArray.some(kw => question.toLowerCase().includes(kw.trim()));

      const finalScore = keywordMatch ? score + 0.3 : score;

      if (finalScore > bestScore && finalScore > 0.3) {
        bestScore = finalScore;
        bestMatch = { question: dbQuestion, answer, category };
        bestRowIndex = index + 2;
      }
    });

    if (bestMatch) {
      await incrementPopularCount(bestRowIndex);

      return res.json({
        answer: bestMatch.answer,
        matched: true,
        category: bestMatch.category,
        confidence: bestScore,
      });
    } else {
      const intent = detectIntent(question);
      const sentiment = detectSentiment(question);
      await saveUnansweredQuestion(question, intent);

      const sid = sessionId || 'default';
      if (!sessionStore.has(sid)) {
        sessionStore.set(sid, { questions: [], timer: null });
      }
      sessionStore.get(sid).questions.push({
        question,
        intent,
        sentiment,
        timestamp: new Date().toLocaleString(),
      });
      scheduleSessionFlush(sid);

      return res.json({
        answer: "I don't have a specific answer to that question yet, but I've saved it for our team to review. Can I help you with something else about flights, hotels, or visas?",
        matched: false,
        intent,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get suggested questions
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
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Capture lead
app.post('/api/capture-lead', async (req, res) => {
  try {
    const { name, email, query } = req.body;

    if (!name || !email || !query) {
      return res.status(400).json({ error: 'Name, email, and query are required' });
    }

    const sentiment = detectSentiment(query);

    await saveLeadCapture(name, email, query, sentiment);
    await sendEmailNotification(name, email, query, sentiment);

    res.json({ success: true, message: 'Lead captured successfully!' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { question, helpful } = req.body;

    const timestamp = new Date().toISOString();
    const values = [[timestamp, question, helpful ? 'Thumbs Up' : 'Thumbs Down']];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Feedback!A:C',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint — check loaded credentials
app.get('/api/debug-email', (req, res) => {
  res.json({
    email_user: process.env.EMAIL_USER,
    password_loaded: !!process.env.EMAIL_APP_PASSWORD,
    password_length: process.env.EMAIL_APP_PASSWORD?.length || 0,
    password_preview: process.env.EMAIL_APP_PASSWORD
      ? `${process.env.EMAIL_APP_PASSWORD.substring(0, 4)}****`
      : 'NOT LOADED',
  });
});

// End session — immediately flush buffered unanswered questions as a single email
app.post('/api/end-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      await flushSessionEmail(sessionId);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Travel Chatbot API is running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Travel Chatbot Server running on port ${PORT}`);
  console.log(`📧 Email notifications will be sent to: ${process.env.EMAIL_USER}`);
});
