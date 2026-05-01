require("dotenv").config();

const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("./models/User");
const Expense = require("./models/Expense");
const UploadedFile = require("./models/UploadedFile");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const nodemailer = require("nodemailer");
const MongoStore = require("connect-mongo");
const emailService = require("./services/emailService");

// ================= Multer Setup =================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage: storage });

// ================= Express Core Setup =================
app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

let port = 3000;

// 🔥 IMPORTANT (form handling)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: "expense_tracker_secret",
    resave: false,
    saveUninitialized: false,
    store: (MongoStore.default || MongoStore).create({
        mongoUrl: process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/smart-expense-tracker",
        collectionName: "sessions"
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// static files
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// set local user variable for all views
app.use((req, res, next) => {
    res.locals.user = req.session && req.session.user ? req.session.user : null;
    next();
});

// ================= ROUTES =================

app.get("/", (req, res) => {
    res.render("pages/front", { currentPage: "front" });
});

app.get("/home", (req, res) => {
    res.render("pages/home", { currentPage: "home" });
});

app.get("/about", (req, res) => {
    res.render("pages/about", { currentPage: "about" });
});

app.get("/faq", (req, res) => {
    res.render("pages/faq", { currentPage: "faq" });
});

app.get("/dashboard", async (req, res) => {
    try {
        const userFilter = req.session && req.session.user ? { user: req.session.user.id } : {};
        const query = { $or: [userFilter, { user: { $exists: false } }, { user: null }] };
        const expenses = await Expense.find(query).sort({ date: -1 });
        const uploadedFiles = await UploadedFile.find().sort({ uploadDate: -1 });
        res.render("pages/dashboard", { 
            currentPage: "dashboard", 
            expenses, 
            uploadedFiles,
            user: req.session.user || { name: 'Guest' }
        });
    } catch (err) {
        console.log(err);
        res.render("pages/dashboard", { currentPage: "dashboard", expenses: [], uploadedFiles: [], user: req.session.user || { name: 'Guest' } });
    }
});

app.get("/features", (req, res) => {
    res.render("pages/features", { currentPage: "features" });
});

app.get("/upload_data", async (req, res) => {
    try {
        const userFilter = req.session && req.session.user ? { user: req.session.user.id } : {};
        const query = { $or: [userFilter, { user: { $exists: false } }, { user: null }] };
        const expenses = await Expense.find(query).sort({ date: -1 });
        const uploadedFiles = await UploadedFile.find().sort({ uploadDate: -1 });
        res.render("pages/upload_data", { 
            currentPage: "upload_data", 
            expenses, 
            uploadedFiles,
            user: req.session.user || { name: 'Guest' }
        });
    } catch (err) {
        console.log(err);
        res.render("pages/upload_data", { currentPage: "upload_data", expenses: [], uploadedFiles: [], user: req.session.user || { name: 'Guest' } });
    }
});

app.post("/api/upload_metadata", async (req, res) => {
    const { fileName, month } = req.body;
    try {
        const newFile = new UploadedFile({
            fileName,
            month
        });
        await newFile.save();
        res.json({ success: true, message: "File metadata saved successfully", file: newFile });
    } catch (err) {
        console.log("Error saving file metadata:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/login", (req, res) => {
    res.render("pages/login", { currentPage: "login" });
});

app.get("/sign_up", (req, res) => {
    res.render("pages/sign_up", { currentPage: "sign_up" });
});

app.post("/add_expense", async (req, res) => {
    const { title, amount, category, type } = req.body;

    try {
        const parsedAmount = Number(amount);
        
        // Global 3-Way Duplicate Detection for Manual Entry
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

        const targetUserId = req.session && req.session.user ? req.session.user.id : null;

        const dupQuery = {
            $or: [
                { amount: parsedAmount, title: title, date: { $gte: startOfDay, $lte: endOfDay } },
                { amount: parsedAmount, category: category, date: { $gte: startOfDay, $lte: endOfDay } },
                { amount: parsedAmount, title: title, date: { $gte: tenMinsAgo } }
            ]
        };

        if (targetUserId) {
            dupQuery.user = targetUserId;
        }

        const dup = await Expense.findOne(dupQuery);

        if (dup) {
            console.log("Duplicate prevented for manual entry:", title);
            return res.redirect(req.get("referer") || "/dashboard");
        }

        const newExpense = new Expense({
            title,
            amount: parsedAmount,
            category,
            type: type === 'income' ? 'income' : 'expense',
            user: req.session && req.session.user ? req.session.user.id : null
        });

        await newExpense.save();

        console.log("Expense saved:", newExpense);

        res.redirect(req.get("referer") || "/dashboard");

    } catch (err) {
        console.log(err);
        res.send("Error saving expense");
    }
});

app.get("/test_db_expenses", async (req, res) => {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json({ expenses });
});

// Email setup removed - moved to src/services/emailService.js

app.post("/api/send_permission_email", async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    try {
        const userName = req.session && req.session.user ? req.session.user.name : "Valued User";
        const result = await emailService.sendPermissionEmail(email, userName);
        res.json({ 
            success: true, 
            message: "Permission email sent successfully", 
            previewUrl: result.previewUrl 
        });
    } catch (error) {
        console.error("Email Error:", error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to send email: ${error.message || "Unknown error"}`
        });
    }
});

// Mock approval route for the email link
app.get("/approve-sms", (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #060713; color: white; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="font-size: 50px; color: #10b981; margin-bottom: 20px;">✅</div>
            <h2 style="margin-bottom: 10px;">Authorization Successful!</h2>
            <p style="color: #94a3b8; margin-bottom: 30px; max-width: 300px;">Permission for SMS Interception has been granted to your account.</p>
            
            <button onclick="requestNotification()" style="background: #4f46e5; color: white; border: none; padding: 15px 30px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 16px;">
                Enable Mobile Sync
            </button>

            <script>
                function requestNotification() {
                    if (!("Notification" in window)) {
                        alert("This browser does not support desktop notification");
                        return;
                    }
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            alert("Mobile Sync Enabled Successfully!");
                        } else {
                            alert("Permission state: " + permission);
                        }
                    });
                }
            </script>
        </div>
    `);
});

// ================= ROUTES (MODULAR) =================
const aiRoutes = require('./routes/aiRoutes');
app.use('/api', aiRoutes);

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Wrong password" });
        }

        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        res.json({ success: true, redirect: "/home" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Login error occurred" });
    }
});

app.post("/signup", async (req, res) => {
    const { fname, email, phone, password, confirmPassword } = req.body;

    console.log("Body:", req.body); // DEBUG

    if (password !== confirmPassword) {
        return res.send("Passwords do not match");
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: fname,
            email,
            phone,
            password: hashedPassword
        });

        await newUser.save();

        console.log("User saved:", newUser);
        
        req.session.user = {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email
        };

        res.redirect("/home");
    } catch (err) {
        console.log(err);
        res.send("Error in signup");
    }
});
// ================= DATABASE =================

console.log("Trying to connect MongoDB...");

const mongoURI = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/smart-expense-tracker";
mongoose.connect(mongoURI)
.then(() => {
    console.log("MongoDB connected ✅");
})
.catch(err => {
    console.log("MongoDB error ❌");
    console.log(err);
});

// ================= SERVER =================

app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
});