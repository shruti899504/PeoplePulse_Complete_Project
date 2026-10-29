const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Employee = require("../models/Employee");
const { requireAuth, allowRoles } = require("../middleware/auth");

const router = express.Router();
const departments = ["Sales", "Technical", "Finance", "Operations", "Human Resources"];

router.use(requireAuth, allowRoles("ADMIN_HR"));

router.get("/", async (req, res) => {
  const users = await User.find()
    .select("name email role department isActive createdAt")
    .sort({ createdAt: -1 });
  res.json({ users });
});

router.post("/hr", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const department = String(req.body.department || "");

    if (!name || !email || !password || !department) {
      return res.status(400).json({ message: "Complete every field." });
    }
    if (password.length < 10) {
      return res.status(400).json({ message: "Password must contain at least 10 characters." });
    }
    if (!departments.includes(department)) {
      return res.status(400).json({ message: "Select a valid department." });
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name, email, passwordHash, role: "DEPARTMENT_HR", department
    });

    res.status(201).json({
      message: "Department HR account created.",
      user: {
        id: user._id, name: user.name, email: user.email,
        role: user.role, department: user.department, isActive: user.isActive
      }
    });
  } catch {
    res.status(500).json({ message: "Could not create the HR account." });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot change your own account status." });
    }
    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({ message: "Choose a valid account status." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true, runValidators: true }
    ).select("name email role department isActive");

    if (!user) return res.status(404).json({ message: "Account not found." });
    res.json({ message: "Account status updated.", user });
  } catch {
    res.status(500).json({ message: "Could not update the account." });
  }
});

module.exports = router;
