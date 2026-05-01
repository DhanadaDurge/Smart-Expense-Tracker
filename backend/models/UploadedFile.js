const mongoose = require("mongoose");

const uploadedFileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    month: {
        type: String,
        required: true // e.g. "March 2026"
    },
    filePath: {
        type: String,
        required: false
    }
});

module.exports = mongoose.model("UploadedFile", uploadedFileSchema);
