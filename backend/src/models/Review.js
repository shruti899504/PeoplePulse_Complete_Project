const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  department: { type: String, required: true },
  period: { type: String, required: true, trim: true, maxlength: 40 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  strengths: { type: String, trim: true, maxlength: 1000, default: "" },
  improvements: { type: String, trim: true, maxlength: 1000, default: "" },
  selfAssessment: { type: String, trim: true, maxlength: 1500, default: "" },
  skillRatings: [{ skill: { type: String, trim: true, maxlength: 80 }, rating: { type: Number, min: 1, max: 5 } }],
  reviewType: { type: String, enum: ["Manager Review", "Self Assessment", "360 Review"], default: "Manager Review" },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);
