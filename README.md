# 💰 Smart Expense Tracker - Expense Management System

A full-stack web application for tracking and managing daily expenses with support for both manual and bulk (CSV) entries.

---

## 🎯 Objective

Automatically:

* Track and manage expenses
* Support both manual and CSV-based bulk uploads
* Categorize expenses efficiently
* Store structured data in MongoDB
* Provide a clean UI using EJS

No heavy ML models. No complex setup required.

---

## 🚀 MVP Features

### 1️⃣ Manual Expense Entry

Approach:

* User enters expense details via form
* Data is validated and stored in MongoDB

Fields:

* Amount
* Category
* Description
* Date

Why MVP-level:

* Simple and fast
* No external dependencies
* Immediate usability

---

### 2️⃣ CSV Upload (Bulk Expense Import)

Approach:

* Upload CSV file through UI
* Parse file using `csv-parser`
* Insert multiple records into MongoDB

Example CSV Format:

```csv id="u7ns5v"
amount,category,description,date
200,Food,Lunch,2026-05-01
500,Travel,Bus Ticket,2026-05-01
```

Process:

* File upload (Multer)
* Parsing CSV → JSON
* Bulk insert into database

Why MVP-level:

* No manual entry required
* Fast bulk processing
* Real-world usage

---

### 3️⃣ Category Classification (Rule-based)

Categories:

* Food
* Travel
* Bills
* Shopping
* Others

Process:

* User selects category
* Stored with expense

Why MVP-level:

* No training required
* Easy implementation

---

### 4️⃣ Data Storage (MongoDB)

* Uses Mongoose schema
* Structured expense model
* Efficient CRUD operations

---

### 5️⃣ Server-Side Rendering (EJS)

* Dynamic pages using EJS
* Backend serves UI directly
* No separate frontend server

---

### 6️⃣ Basic Analytics (Rule-based)

* Total expense calculation
* Category-wise breakdown
* Simple summaries

---

## 🛠️ Setup & Installation

### Prerequisites

* Node.js (v16 or higher)
* npm (v8 or higher)
* MongoDB (Local or Atlas)

---

### 1. Clone the Repository

```bash id="9f8jru"
git clone https://github.com/yourusername/smart-expense-tracker.git
cd smart-expense-tracker
```

---

### 2. Install Dependencies

```bash id="6u7wrx"
cd backend
npm install
```

---

### 3. Configure Environment Variables

Create `.env` inside `backend/`:

```env id="ym0p3q"
PORT=3000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_secret_key
```

---

### 4. Run the Server

Development Mode:

```bash id="t9r2az"
nodemon index.js
```

Production Mode:

```bash id="w6yx7n"
node index.js
```

---

### 5. Verify Installation

* Open browser: http://localhost:3000
* Add a manual expense
* Upload a CSV file
* Verify data in database

---

## 📦 API Endpoints

### Expenses

| Method | Endpoint      | Description      |
| ------ | ------------- | ---------------- |
| POST   | /expenses     | Create expense   |
| GET    | /expenses     | Get all expenses |
| PUT    | /expenses/:id | Update expense   |
| DELETE | /expenses/:id | Delete expense   |

---

### CSV Upload

| Method | Endpoint    | Description                 |
| ------ | ----------- | --------------------------- |
| POST   | /upload-csv | Upload and process CSV file |

---

## 📁 Project Structure

```bash id="2mzq2l"
Smart-Expense-Tracker/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── src/
│   ├── utils/
│   ├── views/
│   ├── public/
│   ├── index.js
│   └── package.json
│
├── frontend/                # Optional / experimental
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🧪 Testing

### Test Manual Entry

* Open UI
* Add expense
* Verify database

---

### Test CSV Upload

```bash id="2yoq1t"
Upload CSV file via UI
```

---

## 🔧 Tech Stack

| Layer       | Technology         |
| ----------- | ------------------ |
| Backend     | Express.js         |
| Database    | MongoDB + Mongoose |
| Frontend    | EJS                |
| File Upload | Multer             |
| CSV Parsing | csv-parser         |
| Auth        | Sessions / JWT     |

---

## ⚠️ Troubleshooting

### Issue: MongoDB connection error

* Check `MONGO_URI`
* Ensure database is running

---

### Issue: CSV not uploading

* Check file format
* Ensure correct headers

---

### Issue: Port already in use

```bash id="o3d9o6"
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 🚀 Deployment

- Backend → Render  
- Frontend → Vercel

---

## 🧠 Key Concept

👉 One Server → One Port → Full Application
(Server-Side Rendering using EJS)

---

## 📄 License

ISC

---

## 👨‍💻 Author

**Dhanada Durge**
