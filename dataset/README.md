# Travel Chatbot QnA Dataset

## File: `QnA_Database.csv`

**~150 ready-to-use entries** covering all intents detected by `server.js`.

---

## Column Structure

| Column | Header | Description |
|--------|--------|-------------|
| A | Question | The user's question |
| B | Answer | The chatbot's reply |
| C | Category | Intent category |
| D | Keywords | Comma-separated trigger keywords |
| E | Popular_Count | Auto-incremented by server (start at 0) |

---

## Categories Covered

| Category | Count (approx.) |
|----------|----------------|
| `general` | ~65 |
| `booking` | ~35 |
| `flight` | ~15 |
| `hotel` | ~12 |
| `visa` | ~22 |

---

## How to Import into Google Sheets

1. Open your Google Sheet: [SPREADSHEET_ID from .env]
2. Click the sheet tab named **`QnA_Database`** (create it if it doesn't exist)
3. Go to **File ? Import**
4. Upload `QnA_Database.csv`
5. Choose:
   - Import location: **Replace current sheet**
   - Separator: **Comma**
   - ? Convert text to numbers and dates
6. Click **Import data**
7. **Row 1** will be the header row (`Question, Answer, Category, Keywords, Popular_Count`)
8. Data starts from **Row 2** — matches the server's range `QnA_Database!A2:E`

---

## Required Google Sheet Tabs

Your `server.js` uses these sheet names — make sure all exist:

| Sheet Name | Used For |
|------------|----------|
| `QnA_Database` | This dataset |
| `Unanswered_Questions` | Auto-logged by `/api/chat` |
| `Lead_Capture` | Auto-logged by `/api/capture-lead` |
| `Feedback` | Auto-logged by `/api/feedback` |

### Headers for other sheets

**Unanswered_Questions** (A1:D1):
```
Timestamp | Question | (empty) | Intent
```

**Lead_Capture** (A1:F1):
```
Timestamp | Name | Email | Query | Sentiment | Urgent
```

**Feedback** (A1:C1):
```
Timestamp | Question | Rating
```
