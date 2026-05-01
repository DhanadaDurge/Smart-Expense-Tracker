const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");

// Render Pages
router.get("/", (req, res) => res.render("pages/front", { currentPage: "front" }));
router.get("/home", (req, res) => res.render("pages/home", { currentPage: "home" }));
router.get("/about", (req, res) => res.render("pages/about", { currentPage: "about" }));
router.get("/faq", (req, res) => res.render("pages/faq", { currentPage: "faq" }));
router.get("/features", (req, res) => res.render("pages/features", { currentPage: "features" }));

router.get("/dashboard", expenseController.renderDashboard);
router.get("/upload_data", expenseController.renderUploadData);

// Actions
router.post("/add_expense", expenseController.addExpense);

module.exports = router;
