require("dotenv").config(); 

const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');
const User = require("../models/User");
const sendPurchaseMail = require("../utils/sendMail");
const Razorpay = require("razorpay");
const axios = require('axios');
const crypto = require("crypto");

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log("Razorpay key id:", process.env.RAZORPAY_KEY_ID);

router.post('/create-order', async (req, res) => {
  try {
    const { orderId, orderAmount, customerName, customerEmail, customerPhone, courseId } = req.body;

    if (!orderAmount || !customerName || !customerEmail || !customerPhone)
      return res.status(400).json({ message: "Missing required fields" });


    const cleanName = customerName.replace(/\s+/g, '').toLowerCase(); // remove spaces
    const first4 = cleanName.substring(0, 4);
    const last4 = customerPhone.slice(-4);
    const customerId = `${first4}${last4}`;

    const options = {
      amount: orderAmount * 100, // amount in paisa
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        customer_id: customerId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        course_id: courseId,
      },
    };

    const order = await razorpay.orders.create(options);

    

    // Save initial record
   // Save to DB (initially pending)
    const payment = new Payment({
      orderId: order.id,
      amount: orderAmount,
      customerName,
      customerEmail,
      customerPhone,
      courseId: courseId.replace(/_/g, " "),
      paymentStatus: "PENDING",
    });

    await payment.save();

    res.json({
      success: true,
      orderId: order.id,
      key: process.env.RAZORPAY_KEY_ID,
      amount: orderAmount,
      currency: "INR",
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post('/verify-user', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not registered",
      });
    }

    // If user exists
    res.status(200).json({
      success: true,
      message: "User verified",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    // Signature verification
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      // ✅ Update payment status in DB
      const updatedPayment = await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },       // query
        { $set: { paymentStatus: "SUCCESS" } }, // update
        { new: true }                         // return updated doc
      );

      if (!updatedPayment) {
        console.error("No payment found with orderId:", razorpay_order_id);
        return res.status(404).json({ success: false, message: "Payment not found" });
      }

      const courseId = updatedPayment.courseId;
      const customerEmail = updatedPayment.customerEmail;

        // Update User collection
        const updatedUser = await User.findOneAndUpdate(
        { email: customerEmail },
        {
            $addToSet: { purchasedCourses: courseId }, // adds courseId if not already there
            $set: { hasPaid: true }
        },
        { new: true }
        );

        if (!updatedUser) {
        console.warn("User not found for email:", customerEmail);
        }

        await sendPurchaseMail(customerEmail, courseName, amount, orderId);

      return res.json({ success: true, message: "Payment verified and updated" });
    } else {
      // ❌ Invalid signature
      await Payment.updateOne(
        { orderId: razorpay_order_id },
        { $set: { paymentStatus: "FAILED" } }
      );
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/update-payment", async (req, res) => {
  const { orderId, paymentStatus } = req.body;

  if (!orderId || !paymentStatus) return res.status(400).send("Bad request");

  try {
    await Payment.updateOne({ orderId }, { $set: { paymentStatus } });
    res.status(200).send("Payment status updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
