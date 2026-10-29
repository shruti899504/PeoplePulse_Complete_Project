const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  jobTitle: { type: String, required: true, trim: true, maxlength: 100 },
  department: {
    type: String,
    required: true,
    enum: ["Sales", "Technical", "Finance", "Operations", "Human Resources"]
  },
  employeeCode: { type: String, required: true, uppercase: true, trim: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  status: { type: String, enum: ["Active", "On Leave", "Inactive"], default: "Active" },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

employeeSchema.index({ email: 1, department: 1 }, { unique: true });

module.exports = mongoose.model("Employee", employeeSchema);
