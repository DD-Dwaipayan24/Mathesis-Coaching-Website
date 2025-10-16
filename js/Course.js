// models/Course.js
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseId: { type: String, required: true, unique: true }, // used for reference
  title: { type: String, required: true },
  description: { type: String },
  folderId: { type: String, required: true }, // Vimeo folder ID
  price: { type: Number, default: 0 },
});

module.exports = mongoose.model('Course', courseSchema);
