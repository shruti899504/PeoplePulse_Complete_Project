const express = require("express");
const Review = require("../models/Review");
const Employee = require("../models/Employee");
const { requireAuth, allowRoles } = require("../middleware/auth");
const { canManageDepartment } = require("../utils/scope");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "DEPARTMENT_HR") filter.department = req.user.department;
    if (req.user.role === "EMPLOYEE") {
      const employee = await Employee.findOne({ user: req.user.id }).select("_id");
      filter.employee = employee?._id || null;
    }

    const reviews = await Review.find(filter)
      .populate("employee", "name employeeCode department jobTitle")
      .populate("reviewer", "name")
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch {
    res.status(500).json({ message: "Could not load reviews." });
  }
});

router.post("/", allowRoles("ADMIN_HR", "DEPARTMENT_HR"), async (req, res) => {
  try {
    const employeeId = String(req.body.employee || "");
    const period = String(req.body.period || "").trim();
    const rating = Number(req.body.rating);
    const strengths = String(req.body.strengths || "").trim();
    const improvements = String(req.body.improvements || "").trim();

    if (!employeeId || !period || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Select an employee, review period, and rating from 1 to 5." });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    if (!canManageDepartment(req.user, employee.department)) return res.status(403).json({ message: "You cannot review this employee." });

    const review = await Review.create({
      employee: employee._id,
      department: employee.department,
      period,
      rating,
      strengths,
      improvements,
      reviewer: req.user.id
    });

    res.status(201).json({ message: "Review saved.", review });
  } catch {
    res.status(500).json({ message: "Could not save the review." });
  }
});

module.exports = router;
