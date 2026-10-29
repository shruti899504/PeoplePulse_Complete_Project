require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/User");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const employeeRoutes = require("./src/routes/employeeRoutes");
const goalRoutes = require("./src/routes/goalRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const intelligenceRoutes = require("./src/routes/intelligenceRoutes");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(",").map((value) => value.trim()) : true }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({ message: "PeoplePulse API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/intelligence", intelligenceRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

async function createInitialAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  if (ADMIN_PASSWORD.length < 10) throw new Error("ADMIN_PASSWORD must contain at least 10 characters.");

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) return;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({
    name: ADMIN_NAME.trim(),
    email,
    passwordHash,
    role: "ADMIN_HR",
    department: null
  });
  console.log(`Initial Admin HR account created for ${email}`);
}

const port = process.env.PORT || 5001;

async function start() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing from backend/.env");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    throw new Error("JWT_SECRET must contain at least 24 characters.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await createInitialAdmin();
  console.log("MongoDB connected");
  app.listen(port, () => console.log(`PeoplePulse API running on http://localhost:${port}`));
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
