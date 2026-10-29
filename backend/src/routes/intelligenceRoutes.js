const express = require("express");
const Employee = require("../models/Employee");
const Goal = require("../models/Goal");
const Review = require("../models/Review");
const Recognition = require("../models/Recognition");
const AuditLog = require("../models/AuditLog");
const { requireAuth, allowRoles } = require("../middleware/auth");
const { departmentFilter, canManageDepartment } = require("../utils/scope");
const router = express.Router();
router.use(requireAuth);

async function record(req, action, entity, entityId = "", details = "") {
  await AuditLog.create({ actor: req.user.id, actorName: req.user.name, action, entity, entityId, department: req.user.department, details });
}

router.get("/departments", async (req, res) => {
  try {
    let filter = departmentFilter(req.user);
    if (req.user.role === "EMPLOYEE") {
      const own = await Employee.findOne({ user: req.user.id }).lean();
      filter = own ? { department: own.department } : { department: "__none__" };
    }
    const employees = await Employee.find(filter).lean();
    const goals = await Goal.find(filter).lean();
    const reviews = await Review.find(filter).lean();
    const names = req.user.role === "DEPARTMENT_HR" ? [req.user.department] : req.user.role === "EMPLOYEE" ? [...new Set(employees.map(e => e.department))] : ["Sales", "Technical", "Finance", "Operations", "Human Resources"];
    const departments = names.map(name => {
      const people = employees.filter(e => e.department === name);
      const deptGoals = goals.filter(g => g.department === name);
      const deptReviews = reviews.filter(r => r.department === name);
      return { name, employees: people.length, goals: deptGoals.length, averageAchievement: deptGoals.length ? Math.round(deptGoals.reduce((s,g) => s + Math.min(100, (Number(g.achieved || 0) / Math.max(Number(g.target || 0), 1)) * 100), 0) / deptGoals.length) : 0, averageRating: deptReviews.length ? Number((deptReviews.reduce((s,r) => s + r.rating, 0) / deptReviews.length).toFixed(1)) : 0, overdueGoals: deptGoals.filter(g => new Date(g.dueDate) < new Date() && (Number(g.achieved || 0) < Number(g.target || 0))).length };
    });
    res.json({ departments });
  } catch { res.status(500).json({ message: "Unable to load department insights." }); }
});

router.get("/recognition", async (req, res) => {
  try {
    const filter = departmentFilter(req.user);
    if (req.user.role === "EMPLOYEE") {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) return res.json({ recognitions: [] });
      filter.employee = employee._id;
    }
    const recognitions = await Recognition.find(filter).populate("employee", "name employeeCode department jobTitle").populate("awardedBy", "name").sort({ createdAt: -1 }).limit(200);
    res.json({ recognitions });
  } catch { res.status(500).json({ message: "Unable to load recognition records." }); }
});

router.post("/recognition", allowRoles("ADMIN_HR", "DEPARTMENT_HR"), async (req, res) => {
  try {
    const { employee: employeeId, title, badge, reason } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee || !canManageDepartment(req.user, employee.department)) return res.status(403).json({ message: "You cannot award recognition in this department." });
    if (!title || !reason) return res.status(400).json({ message: "Title and reason are required." });
    const recognition = await Recognition.create({ employee: employee._id, department: employee.department, title, badge, reason, awardedBy: req.user.id });
    await record(req, "CREATED", "Recognition", recognition._id.toString(), `Recognition awarded to ${employee.name}`);
    res.status(201).json({ recognition });
  } catch { res.status(500).json({ message: "Unable to create recognition." }); }
});

router.get("/pulseai", async (req, res) => {
  try {
    let filter = departmentFilter(req.user);
    if (req.user.role === "EMPLOYEE") return res.status(403).json({ message: "PulseAI insights are available to HR roles only." });
    const [employees, goals, reviews] = await Promise.all([Employee.find(filter).lean(), Goal.find(filter).populate("employee", "name department").lean(), Review.find(filter).lean()]);
    const insights = [];
    const overdue = goals.filter(g => new Date(g.dueDate) < new Date() && Number(g.achieved || 0) < Number(g.target || 0));
    if (overdue.length) insights.push({ type: "attention", title: `${overdue.length} overdue goal${overdue.length === 1 ? "" : "s"}`, detail: "Review blockers with the owners and agree on a realistic next milestone.", count: overdue.length });
    const lowProgress = goals.filter(g => Number(g.target || 0) > 0 && Number(g.achieved || 0) / Number(g.target) < 0.5 && new Date(g.dueDate) - new Date() < 7 * 86400000 && new Date(g.dueDate) >= new Date());
    if (lowProgress.length) insights.push({ type: "warning", title: `${lowProgress.length} goals need a progress check`, detail: "These goals are below 50% with deadlines approaching. Ask owners whether scope or support needs to change.", count: lowProgress.length });
    const noReviewEmployees = employees.filter(e => !reviews.some(r => String(r.employee) === String(e._id)));
    if (noReviewEmployees.length) insights.push({ type: "review", title: `${noReviewEmployees.length} employees have no recorded review`, detail: "Schedule a review conversation and include self-assessment, manager feedback and skill ratings.", count: noReviewEmployees.length });
    if (!insights.length) insights.push({ type: "positive", title: "No urgent performance alerts found", detail: "Keep regular check-ins and record progress as goals change.", count: 0 });
    res.json({ label: "Rule-based insights from current PeoplePulse data", requiresHumanReview: true, insights });
  } catch { res.status(500).json({ message: "Unable to generate performance insights." }); }
});

router.get("/reports", async (req, res) => {
  try {
    let filter = departmentFilter(req.user);
    if (req.user.role === "EMPLOYEE") return res.status(403).json({ message: "Performance reports are available to HR roles only." });
    const [employees, goals, reviews, recognitions] = await Promise.all([Employee.find(filter).lean(), Goal.find(filter).lean(), Review.find(filter).lean(), Recognition.find(filter).lean()]);
    const rows = employees.map(e => {
      const eg = goals.filter(g => String(g.employee) === String(e._id));
      const er = reviews.filter(r => String(r.employee) === String(e._id));
      return { employeeCode: e.employeeCode, name: e.name, email: e.email, department: e.department, jobTitle: e.jobTitle, status: e.status, goalCount: eg.length, averageGoalAchievement: eg.length ? Number((eg.reduce((s,g) => s + Math.min(100, Number(g.target) ? Number(g.achieved || 0) / Number(g.target) * 100 : 0), 0) / eg.length).toFixed(1)) : 0, averageReviewRating: er.length ? Number((er.reduce((s,r) => s + Number(r.rating), 0) / er.length).toFixed(1)) : 0, recognitionCount: recognitions.filter(r => String(r.employee) === String(e._id)).length };
    });
    res.json({ generatedAt: new Date().toISOString(), summary: { employees: employees.length, goals: goals.length, reviews: reviews.length, recognitions: recognitions.length }, rows });
  } catch { res.status(500).json({ message: "Unable to generate report." }); }
});

router.get("/audit", allowRoles("ADMIN_HR"), async (req, res) => {
  try { const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(250); res.json({ logs }); }
  catch { res.status(500).json({ message: "Unable to load audit history." }); }
});

module.exports = router;
