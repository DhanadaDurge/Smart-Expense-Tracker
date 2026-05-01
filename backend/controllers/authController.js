const User = require("../models/User");
const bcrypt = require("bcrypt");

exports.signup = async (req, res) => {
    const { fname, email, phone, password, confirmPassword } = req.body;

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
        
        req.session.user = {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email
        };

        res.redirect("/home");
    } catch (err) {
        console.error(err);
        res.send("Error in signup");
    }
};

exports.login = async (req, res) => {
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
        console.error(err);
        res.status(500).json({ success: false, message: "Login error occurred" });
    }
};
