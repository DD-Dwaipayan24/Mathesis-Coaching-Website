const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["student", "admin"], default: "student" },
  hasPaid: { type: Boolean, default: false },
  purchasedCourses: { type: [String], default: [] }, // Array of course IDs
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  deviceId: { type: String, default: null }, // store device identifier
});

module.exports = mongoose.model("User", userSchema);