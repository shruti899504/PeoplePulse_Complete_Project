const express = require("express");
const Employee = require("../models/Employee");
const Goal = require("../models/Goal");
const Review = require("../models/Review");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const department = req.user.role === "DEPARTMENT_HR" ? req.user.department : null;
    const employee = req.user.role === "EMPLOYEE"
      ? await Employee.findOne({ user: req.user.id }).select("_id department")
      : null;

    let employeeFilter = {};
    let goalFilter = {};
    let reviewFilter = {};

    if (department) {
      employeeFilter.department = department;
      goalFilter.department = department;
      reviewFilter.department = department;
    }

    if (req.user.role === "EMPLOYEE") {
      employeeFilter._id = employee?._id || null;
      goalFilter.employee = employee?._id || null;
      reviewFilter.employee = employee?._id || null;
    }

    const [employeeCount, goals, reviewCount, userCount] = await Promise.all([
      Employee.countDocuments(employeeFilter),
      Goal.find(goalFilter).select("target achieved weight status dueDate"),
      Review.countDocuments(reviewFilter),
      req.user.role === "ADMIN_HR" ? User.countDocuments({ role: "DEPARTMENT_HR", isActive: true }) : Promise.resolve(0)
    ]);

    const totalGoals = goals.length;
    const achievedGoals = goals.filter((goal) => goal.status === "Achieved").length;
    const overdueGoals = goals.filter((goal) => goal.status !== "Achieved" && new Date(goal.dueDate) < new Date()).length;
    const overallAchievement = totalGoals
      ? goals.reduce((sum, goal) => sum + Math.min((goal.achieved / goal.target) * 100, 100), 0) / totalGoals
      : 0;
    const weightTotal = goals.reduce((sum, goal) => sum + goal.weight, 0);
    const weightedScore = weightTotal
      ? goals.reduce((sum, goal) => sum + Math.min((goal.achieved / goal.target) * 100, 100) * goal.weight, 0) / weightTotal
      : 0;

    const departmentRows = req.user.role === "ADMIN_HR"
      ? await Promise.all(["Sales", "Technical", "Finance", "Operations", "Human Resources"].map(async (name) => {
          const [count, departmentGoals] = await Promise.all([
            Employee.countDocuments({ department: name }),
            Goal.find({ department: name }).select("target achieved status")
          ]);
          const average = departmentGoals.length
            ? departmentGoals.reduce((sum, goal) => sum + Math.min(goal.achieved / goal.target * 100, 100), 0) / departmentGoals.length
            : 0;
          return { department: name, employees: count, goals: departmentGoals.length, achievement: Math.round(average) };
        }))
      : [];

    res.json({
      stats: {
        employees: employeeCount,
        goals: totalGoals,
        achievedGoals,
        overdueGoals,
        reviews: reviewCount,
        activeHrAccounts: userCount,
        achievement: Math.round(overallAchievement * 10) / 10,
        weightedScore: Math.round(weightedScore * 10) / 10
      },
      departments: departmentRows
    });
  } catch {
    res.status(500).json({ message: "Could not load dashboard data." });
  }
});

module.exports = router;
