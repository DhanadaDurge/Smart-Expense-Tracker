const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Render Pages
router.get("/login", (req, res) => res.render("pages/login", { currentPage: "login" }));
router.get("/sign_up", (req, res) => res.render("pages/sign_up", { currentPage: "sign_up" }));

// Auth Actions
router.post("/signup", authController.signup);
router.post("/login", authController.login);

module.exports = router;
