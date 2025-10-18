
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
const MongoStore = require('connect-mongo');
const cors = require("cors");
// const fetch = require('node-fetch');
const Course = require('./js/Course');
const paymentRoutes = require('./routes/payment');


require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.set('trust proxy', 1); // ✅ Required for secure cookies on Vercel/HTTPS

app.use(
  cors({
    origin: [
      "https://www.mathesis-coaching.com/dashboard", // 👈 Replace with your real frontend domain
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

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
  res.sendFile(path.join(__dirname, "login.html"));
  res.sendFile(path.join(__dirname, "admin-dashboard.html"));
  res.sendFile(path.join(__dirname, "privacy-policy.html"));
});



// Session middleware
app.use(session({
  secret: 'mySecretKey123', // change this to a secure key
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // ⚙️ your MongoDB connection string
      collectionName: 'sessions', // optional
    }),
  //  cookie: {
  //     secure: true, // ✅ required on Vercel (HTTPS)
  //     sameSite: "none", // ✅ allow cross-site cookies (important)
  //     httpOnly: true, // ✅ helps prevent XSS attacks
  //     maxAge: 1000 * 60 * 60 * 24, // 1 day
  //   },
}));
app.use("/api", paymentRoutes);
app.use("/api", Course);
// -----------Database Setup-----------

// MongoDB connection
mongoose.connect(
  process.env.MONGO_URI
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
  purchasedCourses: { type: [String], default: [] }, // Array of course IDs
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  deviceId: { type: String, default: null }, // store device identifier
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

const User = require("./models/User");
app.use("/api", User);

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
    req.session.user = { id: user._id, name: user.name, email: user.email, role: user.role, purchasedCourses: user.purchasedCourses, hasPaid: user.hasPaid, deviceId: user.deviceId };
    // res.json({ message: 'Login successful', user: { email: user.email } });
    const deviceId = req.body.deviceId;

    req.session.save(async err => {
     if (err) return res.status(500).json({ success: false });
    
    // Check device restriction
    if (user.deviceId && user.deviceId !== deviceId) {
      return res.json({
        message: 'Login restricted. You are already logged in from another device. Please email support to reset your device.',
      });
    }

    // Save the device if it's the first login
    if (!user.deviceId) {
      user.deviceId = deviceId;
      await user.save();
    }

    // Redirect based on role
    res.json({
      message: 'Login successful',
      role: user.role,
      redirectTo: user.role === 'admin' ? '/admin-dashboard' : '/dashboard'
    });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Videos route (Admin Only)
// app.post('/add-video', requireAdmin, async (req, res) => {
//   try {
//     const { title, url } = req.body;
//     const newVideo = new Video({ title, url });
//     await newVideo.save();
//     res.send("✅ Video added successfully! <a href='/admin-dashboard'>Back</a>");
//   } catch (err) {
//     res.send("❌ Error: " + err.message);
//   }
// });

// Fetch Videos (Students)
// app.get("/videos", requireLogin, async (req, res) => {
//   try {
//     const videos = await Video.find({});
//     res.json(videos);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch videos" });
//   }
// });

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/index.html');
  }
  next();
}

// function requireAdmin(req, res, next) {
//   if (!req.session.user || req.session.user.role !== 'admin') {
//     return res.status(403).send('❌ Access Denied: Admins only');
//   }
//   next();
// }

// --- Check Course Access ---
app.get('/check-access/:courseId', async (req, res) => {
  // console.log(window.location.hostname);
  try {
    const userSession = req.session.user;
    
  if (!userSession){
    console.log('❌ No session found');
    return res.status(403).json({ hasPaid: false, message: 'Not logged in' });
  }
  //console.log('🧠 Current session data:', req.session.user);

  const user = await User.findOne({ email: userSession.email });
  if (!user) {
    console.log('❌ User not found');
    return res.status(403).json({ hasPaid: false, message: 'User not found' });
  }
  // console.log('👤 User data:', req.params);
  const courseId = decodeURIComponent(req.params.courseId); // e.g., "PDE" or "Complex Analysis"
  
   // Check if this course is in the purchasedCourses array
  const hasPaid = user.hasPaid && user.purchasedCourses[0].includes(courseId);
  
  return res.json({ hasPaid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ hasPaid: false, message: 'Server error' });
  }
});

app.get('/my-courses', async (req, res) => {
  try {
    const userSession = req.session.user;
    //This portion checked
    if (!userSession) {
      console.log('❌ No session found');
      return res.status(403).json({ success: false, message: 'Not logged in' });
    }

    const user = await User.findOne({ _id: userSession.id });
    console.log('👤 User purchased courses:', user.purchasedCourses[0]);
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check payment status
    if (!user.hasPaid) {
      console.log('💰 User has not paid');
      return res.status(403).json({ success: false, message: 'Payment required' });
    }

    console.log('🛒 Fetching courses for user:', Course);
    // 🎓 Fetch all courses from DB
    const allCourses = await Course.find();
    console.log('📚 All available courses:', allCourses);
    
    // 🎓 Return only purchased courses
    const purchasedCourses = allCourses.filter(course =>
      user.purchasedCourses[0]
    );
    console.log('✅ Purchased courses:', purchasedCourses);

    if (purchasedCourses.length === 0) {
      return res.json({ success: false, message: 'No purchased courses found' });
    }

    res.json({ success: true, courses: purchasedCourses });

  } catch (err) {
    console.error('🔥 Error fetching user courses:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


app.get('/vimeo-videos/:folderId', async (req, res) => {
  try {
    const folderId = req.params.folderId; // e.g., folder for "Linear Algebra"
    // Fetch videos from that Vimeo folder
    const vimeoRes = await fetch(`https://api.vimeo.com/albums/11928597/videos`, {
      headers: {
        Authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
      },
    });
    // console.log('🎥 Fetching Vimeo videos from folder:', vimeoRes.status);

    const data = await vimeoRes.json();
    // console.log('🎞️ Vimeo API response:', data);
    if (!vimeoRes.ok) {
      return res.status(vimeoRes.status).json({ success: false, message: data.error });
    }
    // Extract minimal info for frontend
    const videos = data.data.map(v => ({
      id: v.uri.split('/').pop(),
      title: v.name,
      embedUrl: `https://player.vimeo.com/video/${v.uri.split('/').pop()}?fl=pl&fe=sh`
    }));
    res.json({ success: true, videos });
  } catch (err) {
    console.error('Error fetching Vimeo videos:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



// --- Request Access ---
// app.post('/request-access/:courseId', async (req, res) => {
//   // In production, admin will approve manually
//   res.json({ message: `Request for ${req.params.courseId} sent to admin.` });
// });

// // --- Admin Unlock Course ---
// app.post('/admin/unlock-course', async (req, res) => {
//   const { email, courseId } = req.body;
//   const user = await User.findOne({ email });
//   if (!user) return res.status(404).json({ message: 'User not found' });

//   if (!user.purchasedCourses.includes(courseId)) {
//     user.purchasedCourses.push(courseId);
//     await user.save();
//   }
//   res.json({ message: `Course ${courseId} unlocked for ${email}` });
// });


// --- Add Purchased Course (simulate payment success) ---
app.post('/add-course', async (req, res) => {
  const { email, courseId } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (!user.purchasedCourses.includes(courseId)) {
    user.purchasedCourses.push(courseId);
    await user.save();
  }
  res.json({ message: 'Course added successfully' });
});

// Dashboard route
//Student Dashboard
app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user.hasPaid) {
      return res.redirect("/course.html"); // 🚀 redirect to payment page
    }
    res.sendFile(path.join(__dirname, "dashboard.html"));
  } catch (err) {
    res.status(500).send("❌ Error loading dashboard");
  }
});

//Admin Dashboard
// app.get('/admin-dashboard', requireAdmin, (req, res) => {
//   res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
// });

// // Logout route
// app.get('/logout', (req, res) => {
//   req.session.destroy(err => {
//     if (err) return res.send('Error logging out');
//     res.redirect('/login.html');
//   });
// });

//Payment Route
// app.post('/create-order', async (req, res) => {
//     const { orderId, orderAmount, customerName, customerEmail, customerPhone } = req.body;

//     const cleanName = customerName.replace(/\s+/g, '').toLowerCase(); // remove spaces
//     const first4 = cleanName.substring(0, 4);
//     const last4 = customerPhone.slice(-4);
//     const customerId = `${first4}${last4}`;

//     const data = {
//         order_id: orderId,
//         order_amount: orderAmount.toString(),
//         order_currency: "INR",
//         customer_details: {
//             customer_id: customerId, // using generated ID
//             customer_name: customerName,
//             customer_email: customerEmail,
//             customer_phone: customerPhone
//         },
//         order_meta: {
//             return_url: "http://localhost:3000/payment-success",
//             order_expiry_minutes: 60
//         }
//     };

//     const url = process.env.CASHFREE_SANDBOX === 'true' 
//         ? 'https://sandbox.cashfree.com/pg/orders' 
//         : 'https://api.cashfree.com/pg/orders';

//     // console.log('Cashfree API URL:', url);
//     try {
//         console.log('Creating Cashfree order with data:', data);
//         const response = await axios.post(url, data, {
//             headers: {
//                 'Content-Type': 'application/json',
//                 'x-client-id': process.env.CASHFREE_APP_ID,
//                 'x-client-secret': process.env.CASHFREE_SECRET_KEY,
//                 'x-api-version': '2022-09-01'
//             }
//         });

//         const paymentLink = `https://sandbox.cashfree.com/pg/orders/${response.data.cf_order_id}`;
//         // console.log('✅ Cashfree order created:', response.data);
//         res.json(response.data); // ✅ returns order token & payment link
//     } catch (err) {
//         console.error('Error calling Cashfree API:', err.message);

//         // Check if err.response exists
//         if (err.response) {
//             console.error('Cashfree response data:', err.response.data);
//             res.status(err.response.status).json(err.response.data);
//         } else {
//             res.status(500).json({ message: 'Unable to connect to Cashfree API' });
//         }
//     }
// });




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

app.use("/", paymentRoutes);


// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
