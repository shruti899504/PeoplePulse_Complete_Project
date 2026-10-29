const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  department: {
    type: String,
    required: true,
    enum: ["Sales", "Technical", "Finance", "Operations", "Human Resources"]
  },
  target: { type: Number, required: true, min: 0.01 },
  achieved: { type: Number, required: true, min: 0, default: 0 },
  unit: { type: String, required: true, trim: true, maxlength: 40, default: "tasks" },
  weight: { type: Number, min: 1, max: 100, default: 1 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ["Not Started", "In Progress", "Achieved"], default: "Not Started" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

goalSchema.index({ employee: 1, dueDate: 1 });

module.exports = mongoose.model("Goal", goalSchema);
