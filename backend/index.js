require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const _MongoStore = require("connect-mongo");
const MongoStore = _MongoStore.default || _MongoStore;
const connectDB = require("./config/db");

const app = express();

// Connect to Database
connectDB();

// Express Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSIONS
app.use(session({
    secret: "expense_tracker_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/smart-expense-tracker"
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// EJS CONFIG (Pointing to the frontend/src folder)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Using the views folder you moved into backend

// STATIC FILES (Pointing to frontend/public)
app.use(express.static(path.join(__dirname, "../frontend/public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// AUTH LOCALS
app.use((req, res, next) => {
    res.locals.user = req.session && req.session.user ? req.session.user : null;
    next();
});

// ROUTES
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");

app.use("/", authRoutes); 
app.use("/", expenseRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} ✅`);
});
