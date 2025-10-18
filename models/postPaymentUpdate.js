const mongoose = require('mongoose');


// Schemas (match your actual schema)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  hasPaid: Boolean,
  purchasedCourses: [String],
  deviceId: String
});

const paymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  courseId: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
  gatewayOrderId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Payment = mongoose.model('Payment', paymentSchema);

/**
 * Update user after successful payment
 * @param {String} orderId - payment orderId
 */
async function updateUserAfterPayment(orderId) {
  try {
    // Find the payment
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      console.error('Payment not found!');
      return;
    }

    if (payment.paymentStatus !== 'SUCCESS') {
      console.error('Payment not successful!');
      return;
    }

    // Update user
    const user = await User.findOne({ email: payment.customerEmail });
    if (!user) {
      console.error('User not found!');
      return;
    }

    // Add courseId to purchasedCourses if not already added
    if (!user.purchasedCourses.includes(payment.courseId)) {
      user.purchasedCourses.push(payment.courseId);
    }

    user.hasPaid = true;

    await user.save();

    console.log(`User ${user.email} updated successfully after payment.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  }
}

// Example usage: node postPaymentUpdate.js <orderId>
const orderId = process.argv[2];
if (!orderId) {
  console.error('Please provide orderId as argument.');
  process.exit(1);
}

updateUserAfterPayment(orderId);
