const mongoose = require("mongoose");
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actorName: { type: String, required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, default: "" },
  department: { type: String, default: null },
  details: { type: String, default: "" }
}, { timestamps: true });
auditLogSchema.index({ createdAt: -1 });
module.exports = mongoose.model("AuditLog", auditLogSchema);
