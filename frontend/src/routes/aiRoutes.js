const express = require('express');
const router = express.Router();
// 1. Connect strictly to Database Models
const Expense = require('../models/Expense');
const UploadedFile = require('../models/UploadedFile');
const User = require('../models/User');
// 2. Connect to local AI logic module
const { parseExpenseSMS, parseCSVSheet } = require('../services/aiService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage: storage });

router.post("/parse_sms", async (req, res) => {
    const { text } = req.body;
    try {
        const aiData = await parseExpenseSMS(text);
        const { title, amount, category } = aiData;
        
        if(!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Could not detect expense amount." });
        }

        // USER RESOLUTION (WEBHOOK & SESSION)
        let targetUserId = null;
        if (req.body.phone) {
            const userAccount = await User.findOne({ phone: req.body.phone });
            if (userAccount) {
                targetUserId = userAccount._id;
            } else {
                return res.status(404).json({ success: false, message: "No registered user found with that phone number." });
            }
        } else if (req.session && req.session.user) {
             targetUserId = req.session.user.id;
        }

        // 3-WAY GLOBAL DUPLICATE DETECTION
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        
        // Way 1: Exact Match (Amount + Title + Day)
        let dupQuery1 = {
            amount: amount,
            title: title || "Miscellaneous",
            date: { $gte: startOfDay, $lte: endOfDay }
        };
        
        // Way 2: Semantic Match (Amount + Category + Day)
        let dupQuery2 = {
            amount: amount,
            category: category || "Other",
            date: { $gte: startOfDay, $lte: endOfDay }
        };

        // Way 3: Immediate Match (Amount + Title within last 10 mins)
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        let dupQuery3 = {
            amount: amount,
            title: title || "Miscellaneous",
            date: { $gte: tenMinsAgo }
        };

        if (targetUserId) {
            dupQuery1.user = targetUserId;
            dupQuery2.user = targetUserId;
            dupQuery3.user = targetUserId;
        }
        
        const duplicate = await Expense.findOne({
            $or: [dupQuery1, dupQuery2, dupQuery3]
        });

        if (duplicate) {
             console.log("Global duplicate detected for SMS:", title, amount);
             return res.json({ success: true, message: "Duplicate expense ignored (detected across sources).", duplicate: true, expense: duplicate });
        }

        // CONNECT TO DATABASE: Save new Expense
        const newExpense = new Expense({
            title: title || "Miscellaneous",
            amount,
            category: category || "Other",
            type: 'expense',
            user: targetUserId
        });
        await newExpense.save(); // Successfully saved to MongoDB Database
        res.json({ success: true, expense: newExpense, isNew: true });

    } catch (err) {
        console.error("AI SMS Route Error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error, Invalid API Key, or AI timeout", 
            error: err.message 
        });
    }
});

router.post("/parse_csv", upload.single('file'), async (req, res) => {
    const { month } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    let savedFile;
    try {
        // 1. ALWAYS save the file metadata first
        savedFile = new UploadedFile({ 
            fileName: file.originalname, 
            month: month || new Date().toLocaleString('default', { month: 'long' }) + " " + new Date().getFullYear(),
            filePath: file.filename // Store just the filename for serving via static route
        });
        await savedFile.save();
        console.log("File metadata saved to MongoDB:", savedFile.fileName);

        // 2. Parse CSV deterministically to avoid Gemini API 404 error
        const csvData = fs.readFileSync(file.path, 'utf8');
        console.log("Raw CSV length:", csvData.length);
        
        // Simple CSV Parser
        const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
        const aiArray = [];
        if (lines.length > 1) {
            // Find which column is which
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
            console.log("Found CSV headers:", headers);
            
            for (let i = 1; i < lines.length; i++) {
                // simple split by comma (ignoring quotes for simplicity, or we can use a basic regex if needed)
                // Let's use a regex to split by comma except inside quotes
                const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
                const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());
                
                if (cleanParts.length >= 2) {
                    let obj = {};
                    headers.forEach((h, idx) => {
                        if (idx < cleanParts.length) obj[h] = cleanParts[idx];
                    });
                    
                    let title = obj.title || obj.name || obj.description || obj.merchant || obj.details || cleanParts[1] || "CSV Expense";
                    let amount = obj.amount || obj.cost || obj.value || obj.price || obj.debit || cleanParts[2] || "0";
                    let category = obj.category || obj.type || obj.group || cleanParts[3] || "Other";
                    let date = obj.date || obj.time || cleanParts[0] || null;
                    
                    aiArray.push({ title, amount, category, date });
                }
            }
        }
        
        console.log(`Parsed ${aiArray.length} items from CSV.`);
        
        let addedCount = 0;
        let dupCount = 0;
        let targetUserId = req.session && req.session.user ? req.session.user.id : null;

        // Smart heuristic: if the CSV contains negative numbers, then negatives are expenses and positives are income.
        // If it only contains positive numbers, assume they are all expenses.
        const hasNegative = aiArray.some(item => {
            let a = parseFloat(String(item.amount).replace(/[^0-9.-]+/g,""));
            return !isNaN(a) && a < 0;
        });

        for (let item of aiArray) {
            let rawAmount = parseFloat(String(item.amount).replace(/[^0-9.-]+/g,""));
            let category = item.category || "Other";
            let title = item.title || "CSV Expense";

            if(!isNaN(rawAmount) && rawAmount !== 0) {
                 let type = 'expense';
                 if (hasNegative) {
                     type = rawAmount < 0 ? 'expense' : 'income';
                 }
                 
                 let amount = Math.abs(rawAmount);

                 let expenseDate = item.date ? new Date(item.date) : new Date();
                 if (isNaN(expenseDate.getTime())) {
                     expenseDate = new Date(); // Fallback if invalid date
                 }
                 
                 let startOfDay = new Date(expenseDate);
                 startOfDay.setHours(0, 0, 0, 0);
                 let endOfDay = new Date(expenseDate);
                 endOfDay.setHours(23, 59, 59, 999);
                 
                 // 3-Way Global Check for CSV
                 let dupQuery1 = { amount, title: title.substring(0,30), date: { $gte: startOfDay, $lte: endOfDay } };
                 let dupQuery2 = { amount, category, date: { $gte: startOfDay, $lte: endOfDay } };
                 let dupQuery3 = { amount, title: title.substring(0,30), date: { $gte: new Date(Date.now() - 10 * 60 * 1000) } };
                 
                 if(targetUserId) {
                     dupQuery1.user = targetUserId;
                     dupQuery2.user = targetUserId;
                     dupQuery3.user = targetUserId;
                 }

                 const duplicate = await Expense.findOne({ $or: [dupQuery1, dupQuery2, dupQuery3] });
                 if(duplicate) {
                     dupCount++;
                     console.log(`Duplicate found for ${title} - ${amount}`);
                 } else {
                     const newExp = new Expense({
                         title: title.length > 30 ? title.substring(0,30) : title,
                         amount, category, type, user: targetUserId, date: expenseDate
                     });
                     await newExp.save();
                     addedCount++;
                     console.log(`Added new ${type}: ${title} - ${amount}`);
                 }
            } else {
                console.log(`Skipped row (invalid amount):`, item);
            }
        }

        res.json({ success: true, addedCount, dupCount, file: savedFile });

    } catch(err) {
         console.error("Route Error:", err);
         
         // If we saved the file but parsing failed, still return success for the file upload
         if (savedFile) {
             return res.json({ 
                 success: true, 
                 message: "File uploaded successfully, but AI parsing failed.", 
                 file: savedFile,
                 error: err.message 
             });
         }

         res.status(500).json({ 
             success: false, 
             message: "Critical error during upload", 
             error: err.message 
         });
    }
});

// Delete an uploaded file record and its physical file
router.delete("/delete_file/:id", async (req, res) => {
    try {
        const fileId = req.params.id;
        const fileRecord = await UploadedFile.findById(fileId);
        
        if (!fileRecord) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        // Delete physical file if it exists
        if (fileRecord.filePath) {
            const absolutePath = path.join(__dirname, "../../uploads", fileRecord.filePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        // Delete from database
        await UploadedFile.findByIdAndDelete(fileId);
        
        res.json({ success: true, message: "File deleted successfully" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ success: false, message: "Error deleting file" });
    }
});

module.exports = router;
