# ?? Google Sheets Setup Instructions

## Create Your Travel Chatbot Database

Follow these steps to set up your Google Sheet database:

---

## Step 1: Create New Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **"+ Blank"** to create a new spreadsheet
3. Rename it to: **"Travel Chatbot Database"**

---

## Step 2: Create 4 Sheets

At the bottom of your spreadsheet, you'll see "Sheet1". Create 4 sheets with these exact names:

1. **QnA_Database**
2. **Unanswered_Questions**
3. **Lead_Capture**
4. **Feedback**

To create a new sheet:
- Click the **"+"** button at the bottom left
- Right-click the sheet tab and select "Rename"

---

## Step 3: Set Up QnA_Database Sheet

### Headers (Row 1):
```
A1: Question
B1: Answer
C1: Category
D1: Keywords
E1: Popular_Count
```

### Sample Test Data (Copy these rows):

**Row 2:**
```
A2: What documents do I need for a US visa?
B2: You need a valid passport, DS-160 form, visa fee receipt, photo, and appointment confirmation.
C2: Visa
D2: visa,documents,US,passport
E2: 45
```

**Row 3:**
```
A3: How can I book a flight to Dubai?
B3: You can book flights through our partner airlines. Please share your travel dates and I'll help you get the best deals!
C3: Flight
D3: flight,book,Dubai,booking
E3: 78
```

**Row 4:**
```
A4: What hotels do you recommend in Bali?
B4: We have great partnerships with hotels in Bali! From luxury resorts to budget stays. When are you planning to visit?
C4: Hotel
D4: hotel,Bali,accommodation,resort
E4: 62
```

**Row 5:**
```
A5: Do I need travel insurance?
B5: Yes, travel insurance is highly recommended to cover medical emergencies, trip cancellations, and lost baggage.
C5: Insurance
D5: insurance,travel,coverage
E5: 34
```

**Row 6:**
```
A6: What are the best times to visit Europe?
B6: April-June and September-October offer pleasant weather and fewer crowds. Summer is peak season.
C6: General
D6: Europe,weather,best time,season
E6: 91
```

**Row 7:**
```
A7: How much does a Schengen visa cost?
B7: The Schengen visa fee is approximately €80 for adults and €40 for children aged 6-12.
C7: Visa
D7: Schengen,visa,cost,fee,price
E7: 56
```

**Row 8:**
```
A8: Can you help me plan a honeymoon?
B8: Absolutely! We specialize in romantic getaways. What's your budget and preferred destination?
C8: Package
D8: honeymoon,romantic,package,plan
E8: 29
```

**Row 9:**
```
A9: What is the best travel credit card?
B9: Travel credit cards with no foreign transaction fees and good rewards programs are recommended. Popular options include Chase Sapphire and Capital One Venture.
C9: Finance
D9: credit card,payment,travel card
E9: 18
```

**Row 10:**
```
A10: How early should I book international flights?
B10: For the best prices, book international flights 2-3 months in advance. For peak seasons, book 4-6 months ahead.
C10: Flight
D10: booking,international,flights,when
E10: 67
```

**Row 11:**
```
A11: Do I need vaccinations for Thailand?
B11: Routine vaccinations are recommended. Hepatitis A, Typhoid, and Japanese Encephalitis are suggested depending on your travel plans. Consult a travel doctor.
C11: Health
D11: vaccination,Thailand,health,medical
E11: 41
```

---

## Step 4: Set Up Unanswered_Questions Sheet

### Headers (Row 1):
```
A1: Timestamp
B1: Question
C1: User_Context
D1: Detected_Intent
```

**Leave rows 2+ empty** - These will be auto-populated by the chatbot.

---

## Step 5: Set Up Lead_Capture Sheet

### Headers (Row 1):
```
A1: Timestamp
B1: Name
C1: Email
D1: Query
E1: Sentiment
F1: Priority
```

**Leave rows 2+ empty** - These will be auto-populated when users submit their contact info.

---

## Step 6: Set Up Feedback Sheet

### Headers (Row 1):
```
A1: Timestamp
B1: Question
C1: Feedback
```

**Leave rows 2+ empty** - These will be auto-populated when users click thumbs up/down.

---

## Step 7: Get Your Spreadsheet ID

1. Look at the URL of your Google Sheet
2. It will look like: `https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j/edit#gid=0`
	https://docs.google.com/spreadsheets/d/15lwQBRnFTwZF-8av3OWbX3dfFEqYumZk_450SyqHyDE/edit?gid=0#gid=0
	
3. Copy the part between `/d/` and `/edit`
4. Example: `1a2b3c4d5e6f7g8h9i0j`
		The ID of this file is 15lwQBRnFTwZF-8av3OWbX3dfFEqYumZk_450SyqHyDE.
5. This is your **SPREADSHEET_ID** - save it for the `.env` file

---

## Step 8: Share with Service Account

After you set up Google Cloud and get your service account email:

1. Click the **"Share"** button (top right of Google Sheet)
2. Paste your service account email (looks like: `travel-chatbot-service@your-project.iam.gserviceaccount.com`)
				2. Paste your service account email (travel-chatbot1-service@travel-chatbot1.iam.gserviceaccount.com)
3. Set permission to **"Editor"**
4. Uncheck "Notify people"
5. Click **"Share"**

---

## ? Verification Checklist

- [ ] 4 sheets created with exact names
- [ ] QnA_Database has at least 10 sample questions
- [ ] All header rows are in place
- [ ] Spreadsheet ID copied
- [ ] Sheet shared with service account email

---

## ?? Adding More Questions Later

To add more travel questions:

1. Go to **QnA_Database** sheet
2. Add a new row with:
   - **Question**: The user's question
   - **Answer**: Your response (can include follow-up questions)
   - **Category**: Flight/Hotel/Visa/General/Insurance/Package/etc.
   - **Keywords**: Comma-separated words that might appear in questions
   - **Popular_Count**: Start with `0` (will auto-increment when users ask)

**Example:**
```
Question: Can you help with group bookings?
Answer: Yes! We offer special rates for group bookings of 10+ people. Please share your destination, dates, and group size.
Category: Booking
Keywords: group,booking,discount,multiple,people
Popular_Count: 0
```

---

## ?? Tips for Better Q&A

1. **Use natural language** in questions (how users actually ask)
2. **Add variations** of popular questions
3. **Include keywords** that users might search for
4. **Keep answers concise** but helpful
5. **Add call-to-action** in answers (e.g., "Share your travel dates")
6. **Update regularly** based on Unanswered_Questions sheet

---

**Your Google Sheet is now ready! ??**

Continue with Step 2 in the main README to set up Google Cloud.
