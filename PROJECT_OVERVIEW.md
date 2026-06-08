# ?? Travel Chatbot - Project Documentation

## Complete File Structure

```
ChatBot-Travel/
??? ?? server.js                    # Backend API server (Node.js/Express)
??? ?? package.json                 # Backend dependencies
??? ?? .env                         # Environment configuration (DO NOT COMMIT)
??? ?? .env.example                 # Template for environment variables
??? ?? .gitignore                   # Git ignore rules
??? ?? credentials.json             # Google Service Account key (DO NOT COMMIT)
??? ?? credentials.json.template    # Template for credentials file
?
??? ?? README.md                    # Main documentation & overview
??? ?? QUICKSTART.md                # Quick setup guide (START HERE!)
??? ?? GOOGLE_SHEETS_SETUP.md       # Detailed Google Sheets setup
??? ?? TESTING.md                   # Testing guide & test cases
??? ?? DEPLOYMENT.md                # Production deployment guide
??? ?? PROJECT_OVERVIEW.md          # This file
?
??? ?? client/                      # React frontend
    ??? ?? package.json             # Frontend dependencies
    ??? ?? public/
    ?   ??? index.html              # HTML template
    ??? ?? src/
        ??? App.js                  # Main chatbot component
        ??? App.css                 # Chatbot styling
        ??? index.js                # React entry point
        ??? index.css               # Global styles
```

---

## ?? Documentation Guide

### ?? New to this project? Start here:

1. **[QUICKSTART.md](QUICKSTART.md)** - Complete setup in 10 minutes
2. **[GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)** - Create your database
3. **[TESTING.md](TESTING.md)** - Test everything works
4. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to production (when ready)

### ?? Reference Documentation:

- **[README.md](README.md)** - Features, architecture, API docs
- **PROJECT_OVERVIEW.md** (this file) - File structure & navigation

---

## ?? What Does Each File Do?

### Backend Files

#### `server.js` (375 lines)
**Purpose:** Main backend server  
**What it does:**
- Handles API requests from frontend
- Connects to Google Sheets to fetch Q&A
- Matches user questions to answers
- Detects booking intents
- Sends email notifications
- Saves unanswered questions & leads
- Tracks feedback

**Key Functions:**
```javascript
getQnADatabase()              // Fetch Q&A from Google Sheets
calculateSimilarity()         // Match questions
detectIntent()                // Find booking/flight/hotel intent
detectSentiment()             // Detect urgency (ASAP, urgent, etc.)
saveUnansweredQuestion()      // Log unknown questions
saveLeadCapture()             // Save contact form submissions
sendEmailNotification()       // Email leads to you
```

**API Endpoints:**
- `POST /api/chat` - Get chatbot response
- `GET /api/suggestions` - Get popular questions
- `POST /api/capture-lead` - Submit contact form
- `POST /api/feedback` - Save thumbs up/down
- `GET /api/health` - Check if server is running

---

#### `package.json`
**Purpose:** Backend dependencies  
**Key Packages:**
- `express` - Web server framework
- `googleapis` - Google Sheets integration
- `nodemailer` - Email sending
- `cors` - Cross-origin requests
- `dotenv` - Environment variables

---

#### `.env` ?? NEVER COMMIT THIS
**Purpose:** Configuration secrets  
**Contains:**
```
SPREADSHEET_ID=...       # Google Sheet ID
EMAIL_USER=...           # Gmail address
EMAIL_APP_PASSWORD=...   # Gmail app password
PORT=3001                # Server port
```

---

#### `credentials.json` ?? NEVER COMMIT THIS
**Purpose:** Google Service Account key  
**What it does:** Allows server to read/write Google Sheets  
**How to get:** Download from Google Cloud Console

---

### Frontend Files

#### `client/src/App.js` (160 lines)
**Purpose:** Main chatbot UI component  
**What it does:**
- Displays chat interface
- Sends user messages to backend
- Shows bot responses
- Displays suggested questions
- Shows lead capture form
- Handles feedback buttons

**Key Features:**
```javascript
sendMessage()             // Send user question to API
fetchSuggestions()        // Get popular questions
detectBookingIntent()     // Check if lead form needed
handleFeedback()          // Save thumbs up/down
submitLeadForm()          // Submit contact info
```

---

#### `client/src/App.css` (300 lines)
**Purpose:** Chatbot styling  
**What it includes:**
- Purple gradient theme
- Message bubbles (user/bot)
- Typing animation (3 dots)
- Suggestion chips
- Lead capture form
- Responsive design (mobile-friendly)

**Colors:**
- Primary gradient: `#667eea` ? `#764ba2`
- User messages: Purple gradient
- Bot messages: White
- Background: Light gray `#f5f5f5`

---

#### `client/public/index.html`
**Purpose:** HTML template  
**What it does:** Minimal HTML shell for React app

---

## ??? Google Sheets Structure

Your Google Sheet has **4 tabs:**

### 1. QnA_Database
**Purpose:** Store questions & answers  
**Columns:**
- A: Question
- B: Answer
- C: Category (Flight/Hotel/Visa/etc.)
- D: Keywords (comma-separated)
- E: Popular_Count (auto-increments)

**Example:**
| Question | Answer | Category | Keywords | Count |
|----------|--------|----------|----------|-------|
| What hotels do you recommend? | We have great partnerships... | Hotel | hotel,accommodation | 62 |

---

### 2. Unanswered_Questions
**Purpose:** Auto-save questions bot can't answer  
**Columns:**
- A: Timestamp
- B: Question
- C: User_Context
- D: Detected_Intent

**Auto-populated by:** `saveUnansweredQuestion()` function

---

### 3. Lead_Capture
**Purpose:** Save contact form submissions  
**Columns:**
- A: Timestamp
- B: Name
- C: Email
- D: Query
- E: Sentiment (normal/medium_priority/high_priority)
- F: Priority (YES/NO)

**Auto-populated by:** `saveLeadCapture()` function  
**Triggers email to:** tapchauhan2001@gmail.com

---

### 4. Feedback
**Purpose:** Track thumbs up/down  
**Columns:**
- A: Timestamp
- B: Question
- C: Feedback (Thumbs Up / Thumbs Down)

**Auto-populated by:** `/api/feedback` endpoint

---

## ?? How It All Works Together

### User Flow:

```
1. User opens http://localhost:3000
   ?
2. Frontend (App.js) loads
   ?
3. Fetches suggestions from /api/suggestions
   ?
4. User types question ? Clicks Send
   ?
5. POST /api/chat with question
   ?
6. server.js:
   - Fetches QnA from Google Sheets
   - Finds best match
   - Returns answer
   ?
7. If match found:
   - Increments Popular_Count
   - Shows answer + feedback buttons
   ?
8. If no match:
   - Saves to Unanswered_Questions
   - Shows generic response
   ?
9. If booking intent detected:
   - Shows lead capture form
   ?
10. User fills form ? Submit
    ?
11. POST /api/capture-lead
    ?
12. server.js:
    - Saves to Lead_Capture sheet
    - Sends email to tapchauhan2001@gmail.com
    ?
13. User sees confirmation message
```

---

## ??? Technology Stack

### Backend:
- **Runtime:** Node.js
- **Framework:** Express.js
- **Google Integration:** googleapis npm package
- **Email:** Nodemailer
- **Environment:** dotenv

### Frontend:
- **Framework:** React 18
- **Styling:** Pure CSS (no frameworks)
- **HTTP Requests:** Fetch API
- **Build Tool:** Create React App

### Database:
- **Google Sheets** (no traditional database needed!)

### Email:
- **Gmail SMTP** via Nodemailer

---

## ?? Security Notes

**Never commit these files:**
- ? Added to `.gitignore`:
  - `credentials.json`
  - `.env`
  - `node_modules/`

**Public files (safe to commit):**
- `server.js`
- `client/src/*`
- All `.md` documentation files
- `package.json` files

---

## ?? Data Flow Diagram

```
???????????????
?   Browser   ?
?  (User UI)  ?
???????????????
       ?
       ? HTTP Request
       ?
???????????????????
?   server.js     ?
?  (Express API)  ?
???????????????????
     ?        ?
     ?        ? SMTP
     ?        ?
     ?   ???????????
     ?   ?  Gmail  ?
     ?   ???????????
     ?
     ? Sheets API
     ?
????????????????????
?  Google Sheets   ?
?   - QnA_Database ?
?   - Unanswered   ?
?   - Lead_Capture ?
?   - Feedback     ?
????????????????????
```

---

## ?? Customization Points

### Easy Changes:

1. **Colors** ? `client/src/App.css` line 8
2. **Welcome message** ? `client/src/App.js` line 6
3. **Email recipient** ? `server.js` line 122
4. **Port** ? `.env` file
5. **Number of suggestions** ? `server.js` line 237

### Medium Changes:

1. **Add new intents** ? `server.js` function `detectIntent()`
2. **Change matching algorithm** ? `server.js` function `calculateSimilarity()`
3. **Add more Q&A categories** ? Just add to Google Sheet!

### Advanced Changes:

1. **Add AI/ML matching** ? Replace `calculateSimilarity()` with OpenAI API
2. **Add authentication** ? Use Passport.js
3. **Add analytics** ? Integrate Google Analytics
4. **Multi-language support** ? Use i18n library

---

## ?? Analytics & Monitoring

### What to Track:

1. **Popular Questions** (Column E in QnA_Database)
2. **Unanswered Questions** (Review weekly)
3. **Lead Conversion** (Lead_Capture sheet)
4. **Feedback Ratio** (Thumbs up vs down)

### Where to Find:

```
QnA_Database ? Sort by Popular_Count
Unanswered_Questions ? Add these as new Q&A
Lead_Capture ? Follow up with leads!
Feedback ? Improve answers with thumbs down
```

---

## ?? Common Issues

| Issue | File to Check | Solution |
|-------|---------------|----------|
| Backend won't start | `.env`, `credentials.json` | Verify all secrets set |
| No Google Sheets access | `credentials.json` | Share sheet with service account |
| Email not sending | `.env` | Check app password |
| Suggestions not showing | `QnA_Database` sheet | Add data to sheet |
| UI not updating | `client/package.json` | Check proxy setting |

---

## ?? Learning Resources

### Node.js / Express:
- [Express.js Docs](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### React:
- [React Docs](https://react.dev/)
- [Create React App](https://create-react-app.dev/)

### Google APIs:
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Service Accounts](https://cloud.google.com/iam/docs/service-accounts)

### Email:
- [Nodemailer Docs](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)

---

## ?? Next Steps

1. ? **Setup** ? Follow QUICKSTART.md
2. ? **Test** ? Use TESTING.md
3. ? **Customize** ? Add your Q&A to Google Sheet
4. ? **Deploy** ? Use DEPLOYMENT.md
5. ? **Monitor** ? Check sheets weekly, respond to leads
6. ? **Improve** ? Add unanswered questions to database

---

## ?? Support

**Questions?** Email: tapchauhan2001@gmail.com

**Found a bug?** Check TESTING.md for troubleshooting

**Want to contribute?** Suggest features via email

---

## ?? Version History

- **v1.0** (June 2026) - Initial implementation
  - Q&A from Google Sheets
  - Email notifications
  - Lead capture
  - Sentiment detection
  - Feedback system

---

## ?? Credits

Built for: **tapchauhan2001@gmail.com**  
Purpose: Travel business lead generation  
Stack: Node.js + React + Google Sheets + Gmail  

---

**Happy chatting! ??????**
