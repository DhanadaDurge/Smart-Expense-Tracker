const Expense = require("../models/Expense");
const UploadedFile = require("../models/UploadedFile");

exports.renderDashboard = async (req, res) => {
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
        console.error(err);
        res.render("pages/dashboard", { currentPage: "dashboard", expenses: [], uploadedFiles: [], user: { name: 'Guest' } });
    }
};

exports.renderUploadData = async (req, res) => {
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
        console.error(err);
        res.render("pages/upload_data", { currentPage: "upload_data", expenses: [], uploadedFiles: [], user: { name: 'Guest' } });
    }
};

exports.addExpense = async (req, res) => {
    const { title, amount, category, type } = req.body;
    try {
        const parsedAmount = Number(amount);
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

        if (targetUserId) dupQuery.user = targetUserId;

        const dup = await Expense.findOne(dupQuery);
        if (dup) return res.redirect(req.get("referer") || "/dashboard");

        const newExpense = new Expense({
            title,
            amount: parsedAmount,
            category,
            type: type === 'income' ? 'income' : 'expense',
            user: targetUserId
        });

        await newExpense.save();
        res.redirect(req.get("referer") || "/dashboard");
    } catch (err) {
        console.error(err);
        res.send("Error saving expense");
    }
};
