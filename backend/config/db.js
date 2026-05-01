const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/smart-expense-tracker";
        await mongoose.connect(mongoURI);
        console.log("MongoDB connected ✅");
    } catch (err) {
        console.error("MongoDB error ❌");
        console.error(err);
        process.exit(1);
    }
};

module.exports = connectDB;
