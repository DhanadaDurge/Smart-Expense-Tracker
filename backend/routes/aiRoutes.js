const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const UploadedFile = require('../models/UploadedFile');
const User = require('../models/User');
const { parseExpenseSMS, parseCSVSheet } = require('../utils/aiService');
const emailService = require('../utils/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
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

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        
        let dupQuery1 = { amount, title: title || "Miscellaneous", date: { $gte: startOfDay, $lte: endOfDay } };
        let dupQuery2 = { amount, category: category || "Other", date: { $gte: startOfDay, $lte: endOfDay } };
        let dupQuery3 = { amount, title: title || "Miscellaneous", date: { $gte: tenMinsAgo } };

        if (targetUserId) {
            dupQuery1.user = targetUserId;
            dupQuery2.user = targetUserId;
            dupQuery3.user = targetUserId;
        }
        
        const duplicate = await Expense.findOne({ $or: [dupQuery1, dupQuery2, dupQuery3] });

        if (duplicate) {
             console.log("Global duplicate detected for SMS:", title, amount);
             return res.json({ success: true, message: "Duplicate expense ignored.", duplicate: true, expense: duplicate });
        }

        const newExpense = new Expense({
            title: title || "Miscellaneous",
            amount,
            category: category || "Other",
            type: 'expense',
            user: targetUserId
        });
        await newExpense.save();
        res.json({ success: true, expense: newExpense, isNew: true });

    } catch (err) {
        console.error("AI SMS Route Error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
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
        savedFile = new UploadedFile({ 
            fileName: file.originalname, 
            month: month || new Date().toLocaleString('default', { month: 'long' }) + " " + new Date().getFullYear(),
            filePath: file.filename 
        });
        await savedFile.save();
        console.log("File metadata saved:", savedFile.fileName);

        const csvData = fs.readFileSync(file.path, 'utf8');
        
        const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
        const aiArray = [];
        if (lines.length > 1) {
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
            for (let i = 1; i < lines.length; i++) {
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
        
        let addedCount = 0;
        let dupCount = 0;
        let targetUserId = req.session && req.session.user ? req.session.user.id : null;

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
                 if (isNaN(expenseDate.getTime())) expenseDate = new Date();
                 
                 let startOfDay = new Date(expenseDate);
                 startOfDay.setHours(0, 0, 0, 0);
                 let endOfDay = new Date(expenseDate);
                 endOfDay.setHours(23, 59, 59, 999);
                 
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
                 } else {
                     const newExp = new Expense({
                         title: title.length > 30 ? title.substring(0,30) : title,
                         amount, category, type, user: targetUserId, date: expenseDate
                     });
                     await newExp.save();
                     addedCount++;
                 }
            }
        }
        res.json({ success: true, addedCount, dupCount, file: savedFile });
    } catch(err) {
         console.error("Route Error:", err);
         if (savedFile) {
             return res.json({ success: true, message: "Uploaded but parsing failed.", file: savedFile, error: err.message });
         }
         res.status(500).json({ success: false, message: "Critical error", error: err.message });
    }
});

router.delete("/delete_file/:id", async (req, res) => {
    try {
        const fileId = req.params.id;
        const fileRecord = await UploadedFile.findById(fileId);
        
        if (!fileRecord) return res.status(404).json({ success: false, message: "File not found" });

        if (fileRecord.filePath) {
            const absolutePath = path.join(uploadDir, fileRecord.filePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }
        await UploadedFile.findByIdAndDelete(fileId);
        res.json({ success: true, message: "File deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error deleting file" });
    }
});

router.post("/upload_metadata", async (req, res) => {
    const { fileName, month } = req.body;
    try {
        const newFile = new UploadedFile({ fileName, month });
        await newFile.save();
        res.json({ success: true, message: "File metadata saved", file: newFile });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/send_permission_email", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    try {
        const userName = req.session && req.session.user ? req.session.user.name : "Valued User";
        const result = await emailService.sendPermissionEmail(email, userName);
        res.json({ success: true, message: "Permission email sent successfully", previewUrl: result.previewUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to send email", error: error.message });
    }
});

module.exports = router;
