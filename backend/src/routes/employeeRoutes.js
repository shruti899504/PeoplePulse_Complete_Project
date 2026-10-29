const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Goal = require("../models/Goal");
const Review = require("../models/Review");
const { requireAuth, allowRoles } = require("../middleware/auth");
const { canManageDepartment } = require("../utils/scope");

const router = express.Router();
const departments = ["Sales", "Technical", "Finance", "Operations", "Human Resources"];

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    if (req.user.role === "EMPLOYEE") {
      const own = await Employee.findOne({ user: req.user.id }).lean();
      return res.json({ employees: own ? [own] : [] });
    }
    const filter = req.user.role === "ADMIN_HR" ? {} : { department: req.user.department };
    const employees = await Employee.find(filter).populate("manager", "name email").sort({ createdAt: -1 });
    res.json({ employees });
  } catch {
    res.status(500).json({ message: "Could not load employees." });
  }
});

router.post("/", allowRoles("ADMIN_HR", "DEPARTMENT_HR"), async (req, res) => {
  let user;
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const jobTitle = String(req.body.jobTitle || "").trim();
    const department = req.user.role === "ADMIN_HR"
      ? String(req.body.department || "")
      : req.user.department;
    const employeeCode = String(req.body.employeeCode || "").trim().toUpperCase();
    const password = String(req.body.password || "");

    if (!name || !email || !jobTitle || !department || !employeeCode) {
      return res.status(400).json({ message: "Name, email, job title, employee code, and department are required." });
    }
    if (!departments.includes(department)) return res.status(400).json({ message: "Select a valid department." });
    if (!canManageDepartment(req.user, department)) return res.status(403).json({ message: "You cannot add employees to this department." });
    if (await Employee.findOne({ $or: [{ email }, { employeeCode }] })) {
      return res.status(409).json({ message: "An employee with this email or code already exists." });
    }

    if (password) {
      if (password.length < 10) return res.status(400).json({ message: "Employee password must contain at least 10 characters." });
      if (await User.findOne({ email })) return res.status(409).json({ message: "An account with this email already exists." });
      const passwordHash = await bcrypt.hash(password, 12);
      user = await User.create({ name, email, passwordHash, role: "EMPLOYEE", department });
    }

    const employee = await Employee.create({
      name, email, jobTitle, department, employeeCode,
      user: user?._id || null,
      manager: req.user.role === "DEPARTMENT_HR" ? req.user.id : null
    });

    res.status(201).json({ message: "Employee added successfully.", employee });
  } catch (error) {
    if (user?._id) await User.findByIdAndDelete(user._id).catch(() => {});
    res.status(500).json({ message: "Could not add the employee." });
  }
});

router.put("/:id", allowRoles("ADMIN_HR", "DEPARTMENT_HR"), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    if (!canManageDepartment(req.user, employee.department)) return res.status(403).json({ message: "You cannot edit this employee." });

    const name = String(req.body.name ?? employee.name).trim();
    const jobTitle = String(req.body.jobTitle ?? employee.jobTitle).trim();
    const status = String(req.body.status ?? employee.status);
    if (!name || !jobTitle || !["Active", "On Leave", "Inactive"].includes(status)) {
      return res.status(400).json({ message: "Check the employee details." });
    }

    employee.name = name;
    employee.jobTitle = jobTitle;
    employee.status = status;
    await employee.save();

    if (employee.user) await User.findByIdAndUpdate(employee.user, { name, isActive: status === "Active" });
    res.json({ message: "Employee updated.", employee });
  } catch {
    res.status(500).json({ message: "Could not update the employee." });
  }
});

router.delete("/:id", allowRoles("ADMIN_HR", "DEPARTMENT_HR"), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    if (!canManageDepartment(req.user, employee.department)) return res.status(403).json({ message: "You cannot delete this employee." });

    await Promise.all([
      Goal.deleteMany({ employee: employee._id }),
      Review.deleteMany({ employee: employee._id }),
      employee.user ? User.findByIdAndDelete(employee.user) : Promise.resolve()
    ]);
    await employee.deleteOne();
    res.json({ message: "Employee and linked records deleted." });
  } catch {
    res.status(500).json({ message: "Could not delete the employee." });
  }
});

module.exports = router;
