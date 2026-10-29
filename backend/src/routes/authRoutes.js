const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const employee = user.role === "EMPLOYEE"
      ? await Employee.findOne({ user: user._id })
      : null;

    if (user.role === "EMPLOYEE" && !employee) {
      return res.status(403).json({ message: "Your employee profile is not linked to this account." });
    }

    const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "8h" });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: employee?._id || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to log in right now." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const employee = req.user.role === "EMPLOYEE"
    ? await Employee.findOne({ user: req.user.id }).select("_id name employeeCode department jobTitle")
    : null;
  res.json({ user: { ...req.user, employeeId: employee?._id || null } });
});

module.exports = router;
