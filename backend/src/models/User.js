const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["ADMIN_HR", "DEPARTMENT_HR", "EMPLOYEE"], required: true },
  department: {
    type: String,
    enum: ["Sales", "Technical", "Finance", "Operations", "Human Resources"],
    default: null
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
