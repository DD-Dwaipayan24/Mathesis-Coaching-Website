require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./js/Course');

async function seedCourses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Optional: clear old data first
    await Course.deleteMany({});

    await Course.insertMany([
      {
        courseId: 'PDE and Complex Analysis',
        title: 'PDE and Complex Analysis',
        folderId: '11928597', // replace with real Vimeo folder ID
        description: 'Complete course on PDE and Complex Analysis.',
      },
      {
        courseId: 'Vector Calculus Differential Equations and Transforms',
        title: 'Vector Calculus, Differential Equations and Transforms',
        folderId: '11936559', // replace with real Vimeo folder ID
        description: 'Complete course on Vector Calculus, Differential Equations and Transforms.',
      }
    ]);

    console.log('🎉 Courses added successfully!');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
    process.exit(1);
  }
}

seedCourses();
