const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const Stripe = require("stripe");
const stripe = Stripe("sk_test_your_secret_key_here"); // Replace with your secret key
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const axios = require('axios');

require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

// ✅ Also serve images folder
app.use("/images", express.static(path.join(__dirname, "images")));

//css folder
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/scss", express.static(path.join(__dirname, "scss")));

//js folder
app.use("/js", express.static(path.join(__dirname, "js")));

//fonts folder
app.use("/fonts", express.static(path.join(__dirname, "fonts")));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(express.static(path.join(__dirname)));  // Serve static files from root directory

// Serve HTML files

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
  res.sendFile(path.join(__dirname, "about.html"));
  res.sendFile(path.join(__dirname, "course.html"));
  res.sendFile(path.join(__dirname, "course-2.html"));
  res.sendFile(path.join(__dirname, "registration.html"));
  res.sendFile(path.join(__dirname, "instructor.html"));
  res.sendFile(path.join(__dirname, "contact.html"));
  res.sendFile(path.join(__dirname, "payment.html"));
  res.sendFile(path.join(__dirname, "reset-password.html"));
  res.sendFile(path.join(__dirname, "payment_success.html"));
  res.sendFile(path.join(__dirname, "payment_cancel.html"));
  res.sendFile(path.join(__dirname, "forgot-password.html"));
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// Session middleware
app.use(session({
  secret: 'mySecretKey123', // change this to a secure key
  resave: false,
  saveUninitialized: false
}));

// -----------Database Setup-----------

// MongoDB connection
mongoose.connect(
  process.env.MONGO_URI,
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

//--------------Schemas Setup---------------

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["student", "admin"], default: "student" },
  hasPaid: { type: Boolean, default: false },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

// // Hash password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// Compare password
// userSchema.methods.comparePassword = async function (candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
// };

const User = mongoose.model("User", userSchema);

//Video Schema
const videoSchema = new mongoose.Schema({
  title: String,
  url: String
});
const Video = mongoose.model('Video', videoSchema);

//Query Schema
const querySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Query = mongoose.model("Query", querySchema);


// Routes
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send('User already exists');
        }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.redirect('/index.html'); // go to login page after register
  } catch (err) {
    res.send('❌ Error: ' + err.message);
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.send('❌ User not found. Please register.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send('❌ Invalid password.');

    // ✅ Store role in session
    req.session.user = { id: user._id, name: user.name, role: user.role };

    // Redirect based on role
    if (user.role === 'admin') {
      res.redirect('/admin-dashboard');
    } else {
      res.redirect('/dashboard');
    }
  } catch (err) {
    res.send('❌ Error: ' + err.message);
  }
});

// Videos route (Admin Only)
app.post('/add-video', requireAdmin, async (req, res) => {
  try {
    const { title, url } = req.body;
    const newVideo = new Video({ title, url });
    await newVideo.save();
    res.send("✅ Video added successfully! <a href='/admin-dashboard'>Back</a>");
  } catch (err) {
    res.send("❌ Error: " + err.message);
  }
});

// Fetch Videos (Students)
app.get("/videos", requireLogin, async (req, res) => {
  try {
    const videos = await Video.find({});
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('❌ Access Denied: Admins only');
  }
  next();
}

// Dashboard route
//Student Dashboard
app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user.hasPaid) {
      return res.redirect("/payment.html"); // 🚀 redirect to payment page
    }
    res.sendFile(path.join(__dirname, "dashboard.html"));
  } catch (err) {
    res.status(500).send("❌ Error loading dashboard");
  }
});

//Admin Dashboard
app.get('/admin-dashboard', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Error logging out');
    res.redirect('/login.html');
  });
});

//Payment Route
app.post('/create-order', async (req, res) => {
    const { orderId, orderAmount, customerName, customerEmail, customerPhone } = req.body;

    const cleanName = customerName.replace(/\s+/g, '').toLowerCase(); // remove spaces
    const first4 = cleanName.substring(0, 4);
    const last4 = customerPhone.slice(-4);
    const customerId = `${first4}${last4}`;

    const data = {
        order_id: orderId,
        order_amount: orderAmount.toString(),
        order_currency: "INR",
        customer_details: {
            customer_id: customerId, // using generated ID
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone
        },
        order_meta: {
            return_url: "http://localhost:3000/payment-success",
            order_expiry_minutes: 60
        }
    };

    const url = process.env.CASHFREE_SANDBOX === 'true' 
        ? 'https://sandbox.cashfree.com/pg/orders' 
        : 'https://api.cashfree.com/pg/orders';

    try {
        console.log('Creating Cashfree order with data:', data);
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': process.env.CASHFREE_APP_ID,
                'x-client-secret': process.env.CASHFREE_SECRET_KEY,
                'x-api-version': '2022-09-01'
            }
        });

        // const paymentLink = `https://sandbox.cashfree.com/pg/orders/${response.data.cf_order_id}`;
        // console.log('Payment link:', paymentLink);
        //console.log('✅ Cashfree order created:', response.data);
        res.json(response.data); // ✅ returns order token & payment link
    } catch (err) {
        console.error('Error calling Cashfree API:', err.message);

        // Check if err.response exists
        if (err.response) {
            console.error('Cashfree response data:', err.response.data);
            res.status(err.response.status).json(err.response.data);
        } else {
            res.status(500).json({ message: 'Unable to connect to Cashfree API' });
        }
    }
});

// ---------- SUCCESS & FAILURE ROUTES ----------
app.get('/payment-success', (req, res) => {
  res.send('<h1>Payment Successful ✅</h1>');
});

app.get('/payment-failed', (req, res) => {
  res.send('<h1>Payment Failed ❌</h1>');
});


//Contact Form Route

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    // Save to MongoDB
    const newQuery = new Query({ name, email, message });
    await newQuery.save();

    res.json({ success: true, message: "✅ Query saved successfully!" });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ success: false, message: "❌ Failed to save query" });
  }
});

// Forgot Password
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "No account with that email" });

    // Generate reset token
    const token = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Email setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "mathesis.coaching@gmail.com",
        pass: process.env.EMAIL_PASSCODE, // Google App Password
      },
    });

    const resetLink = `http://localhost:5000/reset-password/${token}`;

    await transporter.sendMail({
      to: user.email,
      from: "mathesis.coaching@gmail.com",
      subject: "Password Reset",
      text: `Click this link to reset your password: ${resetLink}`,
    });

    res.json({ message: "✅ Reset link sent to email" });
  } catch (err) {
    res.status(500).json({ message: "Error: " + err.message });
  }
});

// Reset Password
app.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = req.body.password; // Will be hashed by pre("save")
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "✅ Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Error: " + err.message });
  }
});




// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
