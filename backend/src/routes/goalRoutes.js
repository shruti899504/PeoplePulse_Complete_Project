const express = require("express");
const Goal = require("../models/Goal");
const Employee = require("../models/Employee");
const { requireAuth, allowRoles } = require("../middleware/auth");
const { canManageDepartment } = require("../utils/scope");

const router = express.Router();
router.use(requireAuth);

function goalStatus(achieved, target, dueDate) {
  if (achieved >= target) return "Achieved";
  if (achieved > 0) return "In Progress";
  return "Not Started";
}

router.get("/", async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "DEPARTMENT_HR") filter.department = req.user.department;
    if (req.user.role === "EMPLOYEE") {
      const employee = await Employee.findOne({ user: req.user.id }).select("_id");
      filter.employee = employee?._id || null;
    }

    const goals = await Goal.find(filter)
      .populate("employee", "name employeeCode department jobTitle")
      .populate("createdBy", "name")
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({ goals: goals.map((goal) => {
      const item = goal.toObject();
      item.achievement = Math.round((item.achieved / item.target) * 10000) / 100;
      item.progress = Math.min(item.achievement, 100);
      item.isOverdue = item.status !== "Achieved" && new Date(item.dueDate) < new Date();
      return item;
    }) });
  } catch {
    res.status(500).json({ message: "Could not load goals." });
  }
});

router.post("/", allowRoles("ADMIN_HR", "DEPARTMENT_HR"), async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const employeeId = String(req.body.employee || "");
    const target = Number(req.body.target);
    const achieved = Number(req.body.achieved || 0);
    const unit = String(req.body.unit || "tasks").trim();
    const weight = Number(req.body.weight || 1);
    const dueDate = new Date(req.body.dueDate);

    if (!title || !employeeId || !req.body.dueDate || !unit) {
      return res.status(400).json({ message: "Title, employee, unit, and due date are required." });
    }
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(achieved) || achieved < 0) {
      return res.status(400).json({ message: "Target must be above zero and achievement cannot be negative." });
    }
    if (!Number.isFinite(weight) || weight < 1 || weight > 100 || Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ message: "Check the goal weight and due date." });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    if (!canManageDepartment(req.user, employee.department)) return res.status(403).json({ message: "You cannot assign goals in this department." });

    const status = goalStatus(achieved, target, dueDate);
    const goal = await Goal.create({
      title, description, employee: employee._id, department: employee.department,
      target, achieved, unit, weight, dueDate, status,
      createdBy: req.user.id, updatedBy: req.user.id
    });

    res.status(201).json({ message: "Goal created.", goal });
  } catch {
    res.status(500).json({ message: "Could not create the goal." });
  }
});

router.put("/:id", allowRoles("ADMIN_HR", "DEPARTMENT_HR"), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: "Goal not found." });
    if (!canManageDepartment(req.user, goal.department)) return res.status(403).json({ message: "You cannot edit this goal." });

    const target = req.body.target === undefined ? goal.target : Number(req.body.target);
    const achieved = req.body.achieved === undefined ? goal.achieved : Number(req.body.achieved);
    const weight = req.body.weight === undefined ? goal.weight : Number(req.body.weight);
    const dueDate = req.body.dueDate === undefined ? goal.dueDate : new Date(req.body.dueDate);
    const title = req.body.title === undefined ? goal.title : String(req.body.title).trim();
    const description = req.body.description === undefined ? goal.description : String(req.body.description).trim();
    const unit = req.body.unit === undefined ? goal.unit : String(req.body.unit).trim();

    if (!title || !unit || !Number.isFinite(target) || target <= 0 || !Number.isFinite(achieved) || achieved < 0) {
      return res.status(400).json({ message: "Check the title, unit, target, and achievement values." });
    }
    if (!Number.isFinite(weight) || weight < 1 || weight > 100 || Number.isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({ message: "Check the goal weight and due date." });
    }

    goal.title = title;
    goal.description = description;
    goal.target = target;
    goal.achieved = achieved;
    goal.unit = unit;
    goal.weight = weight;
    goal.dueDate = dueDate;
    goal.status = goalStatus(achieved, target, dueDate);
    goal.updatedBy = req.user.id;
    await goal.save();

    res.json({ message: "Goal updated.", goal });
  } catch {
    res.status(500).json({ message: "Could not update the goal." });
  }
});

router.delete("/:id", allowRoles("ADMIN_HR", "DEPARTMENT_HR"), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: "Goal not found." });
    if (!canManageDepartment(req.user, goal.department)) return res.status(403).json({ message: "You cannot delete this goal." });
    await goal.deleteOne();
    res.json({ message: "Goal deleted." });
  } catch {
    res.status(500).json({ message: "Could not delete the goal." });
  }
});

module.exports = router;
