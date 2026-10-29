import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness, Building2,
  CalendarDays, Check, ChevronDown, CircleHelp, ClipboardCheck, Clock3,
  Code2, DollarSign, Download, Eye, EyeOff, FileBarChart2, Gauge, LayoutDashboard,
  LogOut, Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Target,
  Trash2, TrendingUp, Users, WalletCards, X
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar
} from "recharts";
import api from "./api";
import "./App.css";

const departments = ["Sales", "Technical", "Finance", "Operations", "Human Resources"];
const emptyEmployee = { name: "", email: "", jobTitle: "", employeeCode: "", department: "Sales", password: "" };
const emptyGoal = { title: "", description: "", employee: "", target: "", achieved: "0", unit: "tasks", weight: "1", dueDate: "" };
const emptyReview = { employee: "", period: "", rating: "4", strengths: "", improvements: "" };

function getError(error) {
  return error.response?.data?.message || "Something went wrong. Please try again.";
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PP";
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Status({ children }) {
  const value = String(children || "").toLowerCase().replaceAll(" ", "-");
  return <span className={`status status-${value}`}>{children}</span>;
}

function Progress({ value }) {
  const progress = Math.max(0, Math.min(Number(value) || 0, 100));
  return <div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div>;
}

function Field({ label, children, wide = false }) {
  return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}</span>{children}</label>;
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal">
      <div className="modal-heading"><div><h2>{title}</h2><p>Enter the details below.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      {children}
    </section>
  </div>;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("peoplepulse_token", data.token);
      onLogin(data.user);
    } catch (requestError) {
      setError(getError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-page">
    <div className="login-decoration decoration-one" />
    <div className="login-decoration decoration-two" />
    <section className="login-card">
      <div className="brand-mark"><Activity size={24} /></div>
      <p className="eyebrow">PEOPLE OPERATIONS PLATFORM</p>
      <h1>PeoplePulse</h1>
      <p className="login-subtitle">Better goals. Clearer progress. Stronger teams.</p>
      <form onSubmit={submit} className="login-form">
        <Field label="Work email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="username" /></Field>
        <Field label="Password"><div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="primary-button full-button" disabled={loading}>{loading ? "Signing in..." : "Sign in to workspace"} <span>→</span></button>
      </form>
      <div className="login-footer"><ShieldCheck size={15} /> Secure access for your organization</div>
    </section>
    <p className="login-bottom">PEOPLEPULSE <span>•</span> EMPLOYEE PERFORMANCE MANAGEMENT</p>
  </main>;
}

function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [dashboard, setDashboard] = useState({ stats: {}, departments: [] });
  const [employees, setEmployees] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [goalForm, setGoalForm] = useState(emptyGoal);
  const [reviewForm, setReviewForm] = useState(emptyReview);
  const [hrForm, setHrForm] = useState({ name: "", email: "", password: "", department: "Sales" });
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === "ADMIN_HR";
  const isHr = user?.role === "ADMIN_HR" || user?.role === "DEPARTMENT_HR";
  const isEmployee = user?.role === "EMPLOYEE";

  const notify = useCallback((message, type = "success") => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 3500);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("peoplepulse_token");
    setUser(null);
    setPage("Dashboard");
    setDashboard({ stats: {}, departments: [] });
    setEmployees([]);
    setGoals([]);
    setReviews([]);
    setUsers([]);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, employeeData, goalData, reviewData] = await Promise.all([
        api.get("/dashboard"),
        api.get("/employees"),
        api.get("/goals"),
        api.get("/reviews")
      ]);
      setDashboard(dash.data);
      setEmployees(employeeData.data.employees || []);
      setGoals(goalData.data.goals || []);
      setReviews(reviewData.data.reviews || []);
      if (user?.role === "ADMIN_HR") {
        const accountData = await api.get("/users");
        setUsers(accountData.data.users || []);
      }
    } catch (error) {
      if (error.response?.status === 401) logout();
      else notify(getError(error), "error");
    } finally {
      setLoading(false);
    }
  }, [user, logout, notify]);

  useEffect(() => {
    let active = true;
    async function restore() {
      const token = localStorage.getItem("peoplepulse_token");
      if (!token) {
        setBooting(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        if (active) setUser(data.user);
      } catch {
        localStorage.removeItem("peoplepulse_token");
      } finally {
        if (active) setBooting(false);
      }
    }
    restore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  const visibleEmployees = useMemo(() => employees.filter((employee) => {
    const text = `${employee.name} ${employee.email} ${employee.jobTitle} ${employee.employeeCode} ${employee.department}`.toLowerCase();
    return text.includes(search.toLowerCase());
  }), [employees, search]);

  const visibleGoals = useMemo(() => goals.filter((goal) => {
    const text = `${goal.title} ${goal.employee?.name || ""} ${goal.department} ${goal.status}`.toLowerCase();
    return text.includes(search.toLowerCase());
  }), [goals, search]);

  const titleMap = {
    Dashboard: ["Dashboard", "Here's what's happening across your team."],
    Employees: ["Employees", "Manage people, roles, and department assignments."],
    Goals: ["Goals & performance", "Set measurable goals and monitor progress."],
    Reviews: ["Performance reviews", "Record feedback and support employee growth."],
    Accounts: ["HR accounts", "Manage department HR access and account status."],
    Departments: ["Department intelligence", "Compare progress, reviews, and overdue goals across departments."],
    PulseAI: ["PulseAI insights", "Data-based prompts to help HR investigate performance blockers."],
    Recognition: ["Recognition & milestones", "Celebrate measurable progress and skill development."],
    Reports: ["Performance reports", "Review filtered employee, goal, rating, and recognition data."],
    Audit: ["Audit history", "Review administrative activity and access changes."]
  };

  function navigate(nextPage) {
    setPage(nextPage);
    setSearch("");
    setMobileMenu(false);
  }

  function startEmployee(employee = null) {
    setEditingEmployee(employee);
    setEmployeeForm(employee ? {
      name: employee.name || "", email: employee.email || "", jobTitle: employee.jobTitle || "",
      employeeCode: employee.employeeCode || "", department: employee.department || user.department || "Sales",
      password: "", status: employee.status || "Active"
    } : { ...emptyEmployee, department: user.department || "Sales" });
    setModal("employee");
  }

  function startGoal(goal = null) {
    setEditingGoal(goal);
    setGoalForm(goal ? {
      title: goal.title || "", description: goal.description || "", employee: goal.employee?._id || "",
      target: String(goal.target ?? ""), achieved: String(goal.achieved ?? 0), unit: goal.unit || "tasks",
      weight: String(goal.weight || 1), dueDate: goal.dueDate ? new Date(goal.dueDate).toISOString().slice(0, 10) : ""
    } : { ...emptyGoal });
    setModal("goal");
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee._id}`, {
          name: employeeForm.name, jobTitle: employeeForm.jobTitle, status: employeeForm.status
        });
      } else {
        const payload = { ...employeeForm };
        if (!payload.password) delete payload.password;
        await api.post("/employees", payload);
      }
      setModal("");
      await loadAll();
      notify(editingEmployee ? "Employee updated." : "Employee added.");
    } catch (error) {
      notify(getError(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee) {
    if (!window.confirm(`Delete ${employee.name} and their linked goals and reviews?`)) return;
    try {
      await api.delete(`/employees/${employee._id}`);
      await loadAll();
      notify("Employee deleted.");
    } catch (error) {
      notify(getError(error), "error");
    }
  }

  async function saveGoal(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...goalForm,
        target: Number(goalForm.target),
        achieved: Number(goalForm.achieved),
        weight: Number(goalForm.weight)
      };
      if (editingGoal) await api.put(`/goals/${editingGoal._id}`, payload);
      else await api.post("/goals", payload);
      setModal("");
      await loadAll();
      notify(editingGoal ? "Goal updated and recalculated." : "Goal created.");
    } catch (error) {
      notify(getError(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function updateAchievement(goal, achieved) {
    try {
      await api.put(`/goals/${goal._id}`, { achieved: Number(achieved) });
      await loadAll();
      notify("Achievement saved. Performance recalculated.");
    } catch (error) {
      notify(getError(error), "error");
    }
  }

  async function deleteGoal(goal) {
    if (!window.confirm(`Delete the goal "${goal.title}"?`)) return;
    try {
      await api.delete(`/goals/${goal._id}`);
      await loadAll();
      notify("Goal deleted.");
    } catch (error) {
      notify(getError(error), "error");
    }
  }

  async function saveReview(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/reviews", { ...reviewForm, rating: Number(reviewForm.rating) });
      setModal("");
      setReviewForm(emptyReview);
      await loadAll();
      notify("Performance review saved.");
    } catch (error) {
      notify(getError(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function createHr(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/users/hr", hrForm);
      setModal("");
      setHrForm({ name: "", email: "", password: "", department: "Sales" });
      await loadAll();
      notify("Department HR account created.");
    } catch (error) {
      notify(getError(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAccount(account) {
    try {
      await api.patch(`/users/${account._id}/status`, { isActive: !account.isActive });
      await loadAll();
      notify(`Account ${account.isActive ? "deactivated" : "activated"}.`);
    } catch (error) {
      notify(getError(error), "error");
    }
  }

  function exportEmployees() {
    const rows = visibleEmployees.map((employee) => ({
      employeeCode: employee.employeeCode, name: employee.name, email: employee.email,
      jobTitle: employee.jobTitle, department: employee.department, status: employee.status
    }));
    const header = ["Employee Code", "Name", "Email", "Job Title", "Department", "Status"];
    const csv = [header, ...rows.map((row) => Object.values(row))].map((row) =>
      row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")
    ).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "peoplepulse-employees.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify("Employee report exported.");
  }

  if (booting) return <div className="app-loading"><div className="loading-orbit" /><span>Loading PeoplePulse</span></div>;
  if (!user) return <Login onLogin={setUser} />;

  const stats = dashboard.stats || {};
  const chartData = [
    { month: "Jan", score: 62 }, { month: "Feb", score: 68 }, { month: "Mar", score: 65 },
    { month: "Apr", score: 73 }, { month: "May", score: 78 }, { month: "Jun", score: 76 },
    { month: "Jul", score: 83 }, { month: "Aug", score: 87 }
  ];
  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN_HR", "DEPARTMENT_HR", "EMPLOYEE"] },
    { name: "Employees", icon: Users, roles: ["ADMIN_HR", "DEPARTMENT_HR", "EMPLOYEE"] },
    { name: "Goals", icon: Target, roles: ["ADMIN_HR", "DEPARTMENT_HR", "EMPLOYEE"] },
    { name: "Reviews", icon: ClipboardCheck, roles: ["ADMIN_HR", "DEPARTMENT_HR", "EMPLOYEE"] },
    { name: "Departments", icon: Building2, roles: ["ADMIN_HR", "DEPARTMENT_HR", "EMPLOYEE"] },
    { name: "PulseAI", icon: Activity, roles: ["ADMIN_HR", "DEPARTMENT_HR"] },
    { name: "Recognition", icon: TrendingUp, roles: ["ADMIN_HR", "DEPARTMENT_HR", "EMPLOYEE"] },
    { name: "Reports", icon: FileBarChart2, roles: ["ADMIN_HR", "DEPARTMENT_HR"] },
    { name: "Audit", icon: ShieldCheck, roles: ["ADMIN_HR"] },
    { name: "Accounts", icon: ShieldCheck, roles: ["ADMIN_HR"] }
  ].filter((item) => item.roles.includes(user.role));

  const pageMeta = titleMap[page] || titleMap.Dashboard;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><div className="brand-mark small"><Activity size={21} /></div><div><strong>PeoplePulse</strong><span>PEOPLE OPERATIONS</span></div><button className="mobile-close icon-button" onClick={() => setMobileMenu(false)}><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="main-nav">
        {navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${page === name ? "active" : ""}`} onClick={() => navigate(name)}><Icon size={18} strokeWidth={1.8} /><span>{name}</span>{name === "Goals" && goals.length > 0 && <span className="nav-count">{goals.length}</span>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Need a hand?</strong><p>Make the most of your workspace.</p><button onClick={() => notify("Ask your project administrator for help.")}>Get support <span>↗</span></button></div>
        <div className="sidebar-user"><div className="avatar avatar-purple">{initials(user.name)}</div><div className="user-meta"><strong>{user.name}</strong><span>{user.role === "ADMIN_HR" ? "Admin HR" : user.role === "DEPARTMENT_HR" ? `${user.department} HR` : "Employee"}</span></div><button className="icon-button logout-button" onClick={logout} aria-label="Sign out"><LogOut size={17} /></button></div>
      </div>
    </aside>

    <main className="main-panel">
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu"><Menu size={20} /></button>
        <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{page}</strong></div>
        <div className="topbar-actions">
          <div className="topbar-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search anything..." /></div>
          <button className="icon-button notification-button" onClick={() => notify(`${stats.overdueGoals || 0} goals currently overdue.`, "info")} aria-label="Notifications"><Bell size={18} /><i /></button>
          <div className="topbar-divider" />
          <div className="topbar-profile"><div className="avatar avatar-blue">{initials(user.name)}</div><div><strong>{user.name}</strong><span>{user.department || "Organization"}</span></div><ChevronDown size={15} /></div>
        </div>
      </header>

      <div className="content-area">
        <div className="page-heading"><div><p className="eyebrow">{user.role === "ADMIN_HR" ? "ORGANIZATION OVERVIEW" : user.role === "DEPARTMENT_HR" ? `${user.department.toUpperCase()} DEPARTMENT` : "MY WORKSPACE"}</p><h1>{pageMeta[0]}</h1><p>{pageMeta[1]}</p></div><div className="heading-actions">{page === "Employees" && isHr && <button className="secondary-button" onClick={exportEmployees}><Download size={16} /> Export CSV</button>}{page === "Employees" && isHr && <button className="primary-button" onClick={() => startEmployee()}><Plus size={17} /> Add employee</button>}{page === "Goals" && isHr && <button className="primary-button" onClick={() => startGoal()}><Plus size={17} /> Create goal</button>}{page === "Reviews" && isHr && <button className="primary-button" onClick={() => { setReviewForm({ ...emptyReview, employee: employees[0]?._id || "", period: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }) }); setModal("review"); }}><Plus size={17} /> Write review</button>}{page === "Accounts" && isAdmin && <button className="primary-button" onClick={() => setModal("hr")}><Plus size={17} /> Add HR account</button>}</div></div>

        {page === "Dashboard" && <DashboardView user={user} stats={stats} departmentsData={dashboard.departments || []} employees={employees} goals={goals} reviews={reviews} chartData={chartData} loading={loading} onNavigate={navigate} onCreateGoal={() => startGoal()} />}
        {page === "Employees" && <EmployeesView employees={visibleEmployees} isHr={isHr} isEmployee={isEmployee} onEdit={startEmployee} onDelete={deleteEmployee} />}
        {page === "Goals" && <GoalsView goals={visibleGoals} employees={employees} isHr={isHr} isEmployee={isEmployee} onEdit={startGoal} onDelete={deleteGoal} onUpdateAchievement={updateAchievement} />}
        {page === "Reviews" && <ReviewsView reviews={reviews} isHr={isHr} />}
        {["Departments", "PulseAI", "Recognition", "Reports", "Audit"].includes(page) && <IntelligenceView page={page} isHr={isHr} isAdmin={isAdmin} employees={employees} notify={notify} />}
        {page === "Accounts" && isAdmin && <AccountsView users={users} onToggle={toggleAccount} />}
      </div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} PeoplePulse</span><span><span className="online-dot" /> All systems operational</span><span>Employee performance, made clearer.</span></footer>
    </main>

    {notice && <div className={`toast toast-${notice.type}`}><span className="toast-icon">{notice.type === "error" ? <X size={17} /> : <Check size={17} />}</span>{notice.message}<button onClick={() => setNotice(null)}><X size={15} /></button></div>}

    {modal === "employee" && <Modal title={editingEmployee ? "Edit employee" : "Add employee"} onClose={() => setModal("")}><form className="modal-form" onSubmit={saveEmployee}>
      <div className="form-grid"><Field label="Full name"><input value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} required /></Field><Field label="Work email"><input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} required disabled={!!editingEmployee} /></Field><Field label="Job title"><input value={employeeForm.jobTitle} onChange={(e) => setEmployeeForm({ ...employeeForm, jobTitle: e.target.value })} required /></Field><Field label="Employee code"><input value={employeeForm.employeeCode} onChange={(e) => setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })} required disabled={!!editingEmployee} /></Field>
      {isAdmin && !editingEmployee && <Field label="Department"><select value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}>{departments.map((item) => <option key={item}>{item}</option>)}</select></Field>}
      {!editingEmployee && <Field label="Initial password (optional)"><input type="password" minLength="10" value={employeeForm.password} onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })} placeholder="10 characters minimum" /></Field>}
      {editingEmployee && <Field label="Status"><select value={employeeForm.status} onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}><option>Active</option><option>On Leave</option><option>Inactive</option></select></Field>}</div>
      {!editingEmployee && <p className="form-hint">Set an initial password if this employee should be able to log in.</p>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal("")}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving..." : editingEmployee ? "Save changes" : "Add employee"}</button></div>
    </form></Modal>}

    {modal === "goal" && <Modal title={editingGoal ? "Edit goal" : "Create a goal"} onClose={() => setModal("")}><form className="modal-form" onSubmit={saveGoal}>
      <div className="form-grid"><Field label="Goal title" wide><input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="e.g. Resolve customer tickets" required /></Field><Field label="Assign to" wide><select value={goalForm.employee} onChange={(e) => setGoalForm({ ...goalForm, employee: e.target.value })} required><option value="">Select employee</option>{employees.filter((employee) => employee.status !== "Inactive").map((employee) => <option key={employee._id} value={employee._id}>{employee.name} · {employee.employeeCode}</option>)}</select></Field><Field label="Target"><input type="number" min="0.01" step="any" value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })} required /></Field><Field label="Already achieved"><input type="number" min="0" step="any" value={goalForm.achieved} onChange={(e) => setGoalForm({ ...goalForm, achieved: e.target.value })} required /></Field><Field label="Unit"><input value={goalForm.unit} onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })} placeholder="tasks, rupees, tickets" required /></Field><Field label="Weight (1–100)"><input type="number" min="1" max="100" value={goalForm.weight} onChange={(e) => setGoalForm({ ...goalForm, weight: e.target.value })} required /></Field><Field label="Due date"><input type="date" value={goalForm.dueDate} onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })} required /></Field><Field label="Description" wide><textarea rows="3" value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} placeholder="What does success look like?" /></Field></div>
      {Number(goalForm.target) > 0 && <div className="calculation-preview"><div><span>Live achievement preview</span><strong>{(Number(goalForm.achieved || 0) / Number(goalForm.target) * 100).toFixed(1)}%</strong></div><Progress value={Number(goalForm.achieved || 0) / Number(goalForm.target) * 100} /></div>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal("")}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving..." : editingGoal ? "Save changes" : "Create goal"}</button></div>
    </form></Modal>}

    {modal === "review" && <Modal title="Write performance review" onClose={() => setModal("")}><form className="modal-form" onSubmit={saveReview}><div className="form-grid"><Field label="Employee" wide><select value={reviewForm.employee} onChange={(e) => setReviewForm({ ...reviewForm, employee: e.target.value })} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} · {employee.employeeCode}</option>)}</select></Field><Field label="Review period"><input value={reviewForm.period} onChange={(e) => setReviewForm({ ...reviewForm, period: e.target.value })} placeholder="October 2026" required /></Field><Field label="Rating"><select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></Field><Field label="Strengths" wide><textarea rows="3" value={reviewForm.strengths} onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })} /></Field><Field label="Areas to improve" wide><textarea rows="3" value={reviewForm.improvements} onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })} /></Field></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal("")}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save review"}</button></div></form></Modal>}

    {modal === "hr" && <Modal title="Create HR account" onClose={() => setModal("")}><form className="modal-form" onSubmit={createHr}><div className="form-grid"><Field label="Full name"><input value={hrForm.name} onChange={(e) => setHrForm({ ...hrForm, name: e.target.value })} required /></Field><Field label="Work email"><input type="email" value={hrForm.email} onChange={(e) => setHrForm({ ...hrForm, email: e.target.value })} required /></Field><Field label="Department"><select value={hrForm.department} onChange={(e) => setHrForm({ ...hrForm, department: e.target.value })}>{departments.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Temporary password"><input type="password" minLength="10" value={hrForm.password} onChange={(e) => setHrForm({ ...hrForm, password: e.target.value })} required /></Field></div><p className="form-hint">This account will only manage its assigned department.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal("")}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Creating..." : "Create account"}</button></div></form></Modal>}
  </div>;
}

function DashboardView({ user, stats, departmentsData, employees, goals, reviews, chartData, loading, onNavigate, onCreateGoal }) {
  const isAdmin = user.role === "ADMIN_HR";
  const isHr = user.role !== "EMPLOYEE";
  const cards = [
    { label: "Total employees", value: stats.employees ?? 0, detail: isAdmin ? `${stats.activeHrAccounts || 0} active HR accounts` : user.department || "Your profile", icon: Users, tone: "blue", change: "People" },
    { label: "Goals tracked", value: stats.goals ?? 0, detail: `${stats.achievedGoals || 0} completed`, icon: Target, tone: "green", change: "Targets" },
    { label: "Avg. achievement", value: `${stats.achievement ?? 0}%`, detail: `${stats.overdueGoals || 0} overdue goals`, icon: Gauge, tone: "purple", change: "Progress" },
    { label: "Reviews completed", value: stats.reviews ?? 0, detail: "Saved review records", icon: ClipboardCheck, tone: "orange", change: "Reviews" }
  ];

  return <div className="dashboard-content">
    <section className="welcome-banner"><div className="welcome-copy"><span className="welcome-pill"><span className="online-dot" /> PERFORMANCE OVERVIEW</span><h2>Good to see you, {user.name.split(" ")[0]}.</h2><p>{isAdmin ? "Your people, departments, and goals at a glance." : isHr ? `Here's the latest progress from your ${user.department} team.` : "Here is a snapshot of your current goals and performance."}</p><button onClick={() => onNavigate("Goals")}>View performance <span>→</span></button></div><div className="banner-graphic"><div className="graphic-circle circle-large" /><div className="graphic-circle circle-small" /><div className="graphic-card"><TrendingUp size={19} /><span>Achievement score</span><strong>{stats.achievement ?? 0}%</strong><div className="graphic-bars"><i /><i /><i /><i /><i /><i /><i /></div></div></div></section>

    <section className="stats-grid">{cards.map(({ label, value, detail, icon: Icon, tone, change }) => <article className="stat-card" key={label}><div className="stat-top"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><span className="stat-period">{change}</span></div><p className="stat-label">{label}</p><div className="stat-bottom"><strong>{value}</strong><span>{detail}</span></div></article>)}</section>

    <section className="dashboard-grid">
      <article className="panel performance-panel"><div className="panel-heading"><div><h3>Performance overview</h3><p>Illustrative trend preview</p></div><button className="text-button" onClick={() => onNavigate("Goals")}>View goals <span>→</span></button></div><div className="chart-legend"><span><i /> Achievement index</span><span className="chart-period">Jan – Aug</span></div><div className="area-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#35c9a2" stopOpacity={0.25} /><stop offset="95%" stopColor="#35c9a2" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#263247" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="month" tick={{ fill: "#8794aa", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fill: "#8794aa", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#121d2f", border: "1px solid #2b3a50", borderRadius: 10, color: "#f3f6fc" }} /><Area type="monotone" dataKey="score" name="Index" stroke="#35c9a2" strokeWidth={2.5} fill="url(#scoreFill)" activeDot={{ r: 5, fill: "#35c9a2" }} /></AreaChart></ResponsiveContainer></div></article>

      <article className="panel goal-summary-panel"><div className="panel-heading"><div><h3>Goal status</h3><p>Current tracked goals</p></div><button className="icon-button" onClick={() => onNavigate("Goals")}><MoreHorizontal size={18} /></button></div><div className="goal-ring-wrap"><div className="goal-ring" style={{ "--ring-progress": `${stats.goals ? (stats.achievedGoals / stats.goals) * 100 : 0}%` }}><div><strong>{stats.goals ? Math.round((stats.achievedGoals / stats.goals) * 100) : 0}%</strong><span>completed</span></div></div></div><div className="goal-status-list"><div><span><i className="legend-dot green-dot" /> Achieved</span><strong>{stats.achievedGoals || 0}</strong></div><div><span><i className="legend-dot orange-dot" /> In progress / not started</span><strong>{Math.max((stats.goals || 0) - (stats.achievedGoals || 0), 0)}</strong></div><div><span><i className="legend-dot red-dot" /> Overdue</span><strong>{stats.overdueGoals || 0}</strong></div></div></article>
    </section>

    {isAdmin && <section className="panel department-panel"><div className="panel-heading"><div><h3>Department performance</h3><p>Actual goal data grouped by department</p></div><Building2 size={19} className="muted-icon" /></div><div className="department-table-wrap"><table><thead><tr><th>Department</th><th>Employees</th><th>Goals</th><th>Achievement</th></tr></thead><tbody>{departmentsData.map((department) => <tr key={department.department}><td><div className="department-name"><span className={`department-symbol ${department.department.toLowerCase().replaceAll(" ", "-")}`}>{department.department === "Sales" ? <TrendingUp size={15} /> : department.department === "Technical" ? <Code2 size={15} /> : department.department === "Finance" ? <WalletCards size={15} /> : <BriefcaseBusiness size={15} />}</span><strong>{department.department}</strong></div></td><td>{department.employees}</td><td>{department.goals}</td><td><div className="table-progress"><Progress value={department.achievement} /><span>{department.achievement}%</span></div></td></tr>)}</tbody></table></div></section>}

    <section className="dashboard-grid bottom-grid"><article className="panel recent-goals-panel"><div className="panel-heading"><div><h3>Recent goals</h3><p>Latest goals across your workspace</p></div><button className="text-button" onClick={() => onNavigate("Goals")}>See all <span>→</span></button></div>{goals.length === 0 ? <EmptyState icon={Target} title="No goals yet" detail="Create the first measurable goal to start tracking progress." action={isHr ? "Create a goal" : null} onAction={onCreateGoal} /> : <div className="recent-list">{goals.slice(0, 4).map((goal) => <div className="recent-goal" key={goal._id}><div className="goal-type-icon"><Target size={17} /></div><div className="recent-goal-info"><strong>{goal.title}</strong><span>{goal.employee?.name || "Employee"} · Due {formatDate(goal.dueDate)}</span><Progress value={goal.progress} /></div><div className="recent-goal-score"><strong>{Number(goal.achievement || 0).toFixed(0)}%</strong><Status>{goal.isOverdue ? "Overdue" : goal.status}</Status></div></div>)}</div>}</article><article className="panel activity-panel"><div className="panel-heading"><div><h3>Recent reviews</h3><p>Latest performance feedback</p></div><button className="text-button" onClick={() => onNavigate("Reviews")}>View all <span>→</span></button></div>{reviews.length === 0 ? <EmptyState icon={ClipboardCheck} title="No reviews yet" detail="Performance reviews will appear here after they are saved." /> : <div className="review-mini-list">{reviews.slice(0, 4).map((review) => <div className="review-mini" key={review._id}><div className="avatar avatar-green">{initials(review.employee?.name)}</div><div className="review-mini-info"><strong>{review.employee?.name || "Employee"}</strong><span>{review.period} · {review.reviewer?.name || "HR"}</span></div><span className="rating-chip">★ {review.rating}/5</span></div>)}</div>}</article></section>
    {loading && <div className="loading-line"><span /> Updating workspace data...</div>}
  </div>;
}

function EmptyState({ icon: Icon, title, detail, action, onAction }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><strong>{title}</strong><p>{detail}</p>{action && <button className="secondary-button" onClick={onAction}><Plus size={15} /> {action}</button>}</div>;
}

function EmployeesView({ employees, isHr, isEmployee, onEdit, onDelete }) {
  return <section className="panel data-panel"><div className="panel-heading"><div><h3>{isEmployee ? "My employee profile" : "Employee directory"}</h3><p>{employees.length} {employees.length === 1 ? "record" : "records"} found</p></div><div className="panel-tools"><span className="soft-chip"><Users size={14} /> {employees.length} people</span></div></div><div className="data-table-wrap"><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Department</th><th>Job title</th><th>Status</th>{isHr && <th>Actions</th>}</tr></thead><tbody>{employees.map((employee) => <tr key={employee._id}><td><div className="employee-cell"><div className="avatar avatar-blue">{initials(employee.name)}</div><div><strong>{employee.name}</strong><span>{employee.email}</span></div></div></td><td><span className="code-text">{employee.employeeCode}</span></td><td><span className="department-pill">{employee.department}</span></td><td>{employee.jobTitle}</td><td><Status>{employee.status || "Active"}</Status></td>{isHr && <td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(employee)} aria-label={`Edit ${employee.name}`}><Settings2 size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(employee)} aria-label={`Delete ${employee.name}`}><Trash2 size={16} /></button></div></td>}</tr>)}</tbody></table>{employees.length === 0 && <EmptyState icon={Users} title="No employees found" detail="Add an employee or adjust your search." />}</div></section>;
}

function GoalsView({ goals, employees, isHr, isEmployee, onEdit, onDelete, onUpdateAchievement }) {
  const [filter, setFilter] = useState("All");
  const filtered = goals.filter((goal) => filter === "All" || (filter === "Overdue" ? goal.isOverdue : goal.status === filter));
  return <div className="goals-page"><section className="goal-insight-row"><article className="insight-card"><div className="insight-icon green"><Target size={19} /></div><span>Total goals</span><strong>{goals.length}</strong><small>Currently tracked</small></article><article className="insight-card"><div className="insight-icon blue"><Gauge size={19} /></div><span>Average achievement</span><strong>{goals.length ? (goals.reduce((sum, goal) => sum + Number(goal.achievement || 0), 0) / goals.length).toFixed(1) : "0.0"}%</strong><small>Across visible goals</small></article><article className="insight-card"><div className="insight-icon orange"><Clock3 size={19} /></div><span>Overdue goals</span><strong>{goals.filter((goal) => goal.isOverdue).length}</strong><small>Need attention</small></article></section>
    <section className="panel data-panel"><div className="panel-heading"><div><h3>Goal tracker</h3><p>Monitor target, actual achievement, and deadlines.</p></div><div className="filter-pills">{["All", "Not Started", "In Progress", "Achieved", "Overdue"].map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="data-table-wrap"><table className="goals-table"><thead><tr><th>Goal</th><th>Employee</th><th>Achievement</th><th>Progress</th><th>Deadline</th><th>Status</th>{isHr && <th>Actions</th>}</tr></thead><tbody>{filtered.map((goal) => <tr key={goal._id}><td><div className="goal-title-cell"><strong>{goal.title}</strong><span>{goal.target} {goal.unit} target · weight {goal.weight}</span></div></td><td><div className="mini-person"><div className="avatar avatar-green">{initials(goal.employee?.name)}</div><span>{goal.employee?.name || "Employee"}</span></div></td><td>{isHr ? <div className="achievement-edit"><input type="number" min="0" step="any" aria-label={`Achieved amount for ${goal.title}`} defaultValue={goal.achieved} key={`${goal._id}-${goal.achieved}`} onBlur={(event) => { const value = Number(event.target.value); if (value !== Number(goal.achieved) && value >= 0) onUpdateAchievement(goal, value); }} onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()} /><span>/ {goal.target} {goal.unit}</span></div> : <strong>{goal.achieved} / {goal.target} {goal.unit}</strong>}</td><td><div className="goal-progress-cell"><Progress value={goal.progress} /><strong>{Number(goal.achievement || 0).toFixed(1)}%</strong></div></td><td><span className={goal.isOverdue ? "overdue-date" : "date-text"}>{formatDate(goal.dueDate)}</span></td><td><Status>{goal.isOverdue ? "Overdue" : goal.status}</Status></td>{isHr && <td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(goal)} aria-label="Edit goal"><Settings2 size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(goal)} aria-label="Delete goal"><Trash2 size={16} /></button></div></td>}</tr>)}</tbody></table>{filtered.length === 0 && <EmptyState icon={Target} title="No goals in this view" detail="Create a goal or choose another filter." />}</div><div className="table-footnote"><ShieldCheck size={15} /> Achievement updates are saved to the database and recalculated by the server.</div></section>
    {isEmployee && <p className="info-note"><Eye size={16} /> You can view your goals and achievement percentages. Contact your HR manager if a target needs correction.</p>}
  </div>;
}

function ReviewsView({ reviews, isHr }) {
  return <section className="panel data-panel"><div className="panel-heading"><div><h3>Performance review history</h3><p>Feedback and ratings recorded for each review period.</p></div><span className="soft-chip"><ClipboardCheck size={14} /> {reviews.length} reviews</span></div><div className="review-cards">{reviews.map((review) => <article className="review-card" key={review._id}><div className="review-card-top"><div className="employee-cell"><div className="avatar avatar-purple">{initials(review.employee?.name)}</div><div><strong>{review.employee?.name || "Employee"}</strong><span>{review.employee?.jobTitle || review.department}</span></div></div><div className="review-rating"><span>★</span> {review.rating}.0 <small>/ 5</small></div></div><div className="review-period"><CalendarDays size={15} /> {review.period} <span>·</span> Reviewed by {review.reviewer?.name || "HR"}</div><div className="review-copy-grid"><div><span>Strengths</span><p>{review.strengths || "No strengths notes were added."}</p></div><div><span>Areas to improve</span><p>{review.improvements || "No improvement notes were added."}</p></div></div></article>)}</div>{reviews.length === 0 && <EmptyState icon={ClipboardCheck} title="No reviews yet" detail={isHr ? "Create a review after discussing an employee's progress." : "Your HR manager's feedback will appear here."} />}</section>;
}

function AccountsView({ users, onToggle }) {
  return <section className="panel data-panel"><div className="panel-heading"><div><h3>Access management</h3><p>Create department HR accounts and manage access.</p></div><span className="soft-chip"><ShieldCheck size={14} /> Admin only</span></div><div className="data-table-wrap"><table><thead><tr><th>Account</th><th>Role</th><th>Department</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>{users.map((account) => <tr key={account._id}><td><div className="employee-cell"><div className="avatar avatar-purple">{initials(account.name)}</div><div><strong>{account.name}</strong><span>{account.email}</span></div></div></td><td><span className="role-pill">{account.role.replaceAll("_", " ")}</span></td><td>{account.department || "All departments"}</td><td><Status>{account.isActive ? "Active" : "Inactive"}</Status></td><td>{formatDate(account.createdAt)}</td><td><button className={`secondary-button compact ${account.isActive ? "deactivate-button" : ""}`} onClick={() => onToggle(account)}>{account.isActive ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table>{users.length === 0 && <EmptyState icon={ShieldCheck} title="No accounts" detail="Create the first department HR account." />}</div></section>;
}


function IntelligenceView({ page, isHr, isAdmin, employees, notify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState("");
  const [title, setTitle] = useState("");
  const [badge, setBadge] = useState("Goal Finisher");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const endpoint = { Departments: "/intelligence/departments", PulseAI: "/intelligence/pulseai", Recognition: "/intelligence/recognition", Reports: "/intelligence/reports", Audit: "/intelligence/audit" }[page];
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await api.get(endpoint); setData(response.data); }
    catch (error) { notify(getError(error), "error"); }
    finally { setLoading(false); }
  }, [endpoint, notify]);
  useEffect(() => { load(); }, [load]);
  async function award(event) {
    event.preventDefault();
    setSaving(true);
    try { await api.post("/intelligence/recognition", { employee, title, badge, reason }); setTitle(""); setReason(""); setEmployee(""); notify("Recognition saved."); await load(); }
    catch (error) { notify(getError(error), "error"); }
    finally { setSaving(false); }
  }
  function exportReport() {
    const rows = data?.rows || [];
    if (!rows.length) return notify("There is no report data to export.", "info");
    const keys = Object.keys(rows[0]);
    const csv = [keys, ...rows.map(row => keys.map(key => row[key]))].map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "peoplepulse-performance-report.csv"; link.click(); URL.revokeObjectURL(url);
  }
  if (loading) return <section className="panel data-panel"><p>Loading {page}…</p></section>;
  if (page === "Departments") return <div className="feature-grid">{(data?.departments || []).map(item => <article className="panel insight-card" key={item.name}><span className="department-pill">{item.name}</span><strong>{item.averageAchievement}%</strong><span>Average goal achievement</span><div className="feature-metrics"><span>{item.employees} employees</span><span>{item.goals} goals</span><span>★ {item.averageRating}/5 average rating</span><span>{item.overdueGoals} overdue</span></div><Progress value={item.averageAchievement} /></article>)}</div>;
  if (page === "PulseAI") return <div className="feature-stack"><div className="panel feature-note"><strong>PulseAI uses current recorded data</strong><p>These are rule-based insights, not an external AI model. Review context with employees before making decisions.</p></div>{(data?.insights || []).map((item, index) => <article className="panel feature-insight" key={`${item.title}-${index}`}><div className={`insight-icon ${item.type === "attention" ? "orange" : item.type === "positive" ? "green" : "blue"}`}><Activity size={18} /></div><div><strong>{item.title}</strong><p>{item.detail}</p></div><span className="soft-chip">{item.count} items</span></article>)}</div>;
  if (page === "Recognition") return <div className="feature-stack">{isHr && <form className="panel recognition-form" onSubmit={award}><h3>Award recognition</h3><div className="form-grid"><Field label="Employee"><select value={employee} onChange={event => setEmployee(event.target.value)} required><option value="">Select employee</option>{employees.map(person => <option key={person._id} value={person._id}>{person.name} · {person.department}</option>)}</select></Field><Field label="Badge"><select value={badge} onChange={event => setBadge(event.target.value)}>{["Goal Finisher", "Consistent Progress", "Skill Builder", "Team Contributor", "Customer Champion"].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Recognition title"><input value={title} onChange={event => setTitle(event.target.value)} required maxLength="100" placeholder="e.g. Completed Q3 milestone" /></Field><Field label="Reason"><input value={reason} onChange={event => setReason(event.target.value)} required maxLength="500" placeholder="Describe the measurable achievement" /></Field></div><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Award recognition"}</button></form>}{(data?.recognitions || []).map(item => <article className="panel recognition-item" key={item._id}><div className="insight-icon purple"><TrendingUp size={18} /></div><div><strong>{item.title}</strong><p>{item.employee?.name} · {item.department}</p><span>{item.badge} — {item.reason}</span></div><small>{formatDate(item.createdAt)}</small></article>)}{!(data?.recognitions || []).length && <section className="panel data-panel"><p>No recognition records yet. HR can award the first badge above.</p></section>}</div>;
  if (page === "Reports") return <section className="panel data-panel"><div className="panel-heading"><div><h3>Performance export</h3><p>Generated {formatDate(data?.generatedAt)} · {data?.summary?.employees || 0} employees</p></div><button className="primary-button" onClick={exportReport}><Download size={16} /> Export CSV</button></div><div className="feature-grid compact-grid">{Object.entries(data?.summary || {}).map(([key, value]) => <article className="insight-card" key={key}><span>{key[0].toUpperCase() + key.slice(1)}</span><strong>{value}</strong></article>)}</div><div className="data-table-wrap"><table><thead><tr><th>Employee</th><th>Department</th><th>Goals</th><th>Achievement</th><th>Review rating</th><th>Recognition</th></tr></thead><tbody>{(data?.rows || []).map(row => <tr key={row.employeeCode}><td><strong>{row.name}</strong><div>{row.employeeCode}</div></td><td>{row.department}</td><td>{row.goalCount}</td><td>{row.averageGoalAchievement}%</td><td>{row.averageReviewRating || "—"}</td><td>{row.recognitionCount}</td></tr>)}</tbody></table></div></section>;
  return <section className="panel data-panel"><div className="panel-heading"><div><h3>Recent administrative activity</h3><p>Latest 250 recorded audit entries.</p></div></div><div className="data-table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{(data?.logs || []).map(log => <tr key={log._id}><td>{formatDate(log.createdAt)}</td><td>{log.actorName}</td><td>{log.action}</td><td>{log.entity}</td><td>{log.details}</td></tr>)}</tbody></table></div>{!(data?.logs || []).length && <p>No audit entries have been recorded yet.</p>}</section>;
}

export default App;