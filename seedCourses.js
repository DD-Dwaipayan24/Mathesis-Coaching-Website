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
        courseId: 'Linear Algebra',
        title: 'Linear Algebra',
        folderId: '123456789',
      },
      {
        courseId: 'Real Analysis',
        title: 'Real Analysis',
        folderId: '1122334455',
      },
      {
        courseId: 'Vector Calculus',
        title: 'Vector Calculus',
        folderId: '9988776655',
      },
    ]);

    console.log('🎉 Courses added successfully!');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
    process.exit(1);
  }
}

seedCourses();
