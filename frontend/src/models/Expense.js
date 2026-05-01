const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    title: String,
    amount: Number,
    category: String,
    type: {
        type: String,
        enum: ['income', 'expense'],
        default: 'expense'
    },
    date: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
});

const Expense = mongoose.model("Expense", expenseSchema);

module.exports = Expense;