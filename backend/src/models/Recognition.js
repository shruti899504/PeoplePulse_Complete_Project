const mongoose = require("mongoose");
const recognitionSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  department: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  badge: { type: String, enum: ["Goal Finisher", "Consistent Progress", "Skill Builder", "Team Contributor", "Customer Champion"], default: "Goal Finisher" },
  reason: { type: String, trim: true, maxlength: 500, required: true },
  awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
module.exports = mongoose.model("Recognition", recognitionSchema);
