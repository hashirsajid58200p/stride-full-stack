const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
const { Resend } = require("resend");

// CRITICAL FIX: Initialize environment variables BEFORE importing routes
dotenv.config();

// ADDED: Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// Now we can safely import routes that depend on process.env
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// ==========================================
// Middleware & CORS Configuration
// ==========================================

// DEPLOYMENT VARIANT: (Uncomment this line when pushing to GitHub/Vercel)
app.use(cors({ origin: process.env.CLIENT_URL }));

// LOCAL MACHINE VARIANT: (Comment this line out when deploying)
// app.use(cors());

app.use(express.json()); // Parses incoming JSON requests

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);

// ==========================================
// NEW: Newsletter Subscription Route
// ==========================================
app.post("/api/newsletter/subscribe", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Adds contact to your Resend "Contacts" list automatically
    // CRITICAL FIX: Destructure error to catch silent API failures
    const { data, error } = await resend.contacts.create({
      email: email,
      unsubscribed: false,
    });

    if (error) {
      console.error("Resend API Error (Newsletter):", error);
      return res.status(500).json({ error: error.message });
    }

    res
      .status(200)
      .json({ success: true, message: "Successfully subscribed!" });
  } catch (err) {
    console.error("Server Error:", err);
    res
      .status(500)
      .json({ error: "Failed to subscribe. Please try again later." });
  }
});

// ==========================================
// NEW: Contact Form Route
// ==========================================
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ error: "Name, email, and message are required." });
  }

  try {
    // Send an email to yourself (the admin) with the user's message
    // CRITICAL FIX: Destructure error to catch silent API failures
    const { data, error } = await resend.emails.send({
      from: "Stride Support <onboarding@resend.dev>", // Resend's default testing address
      to: ["hs58200d@gmail.com"], // Updated to your actual verified Resend email
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #ff6b00;">New Message from Stride Contact Form</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <p style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            ${message.replace(/\n/g, "<br/>")}
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error (Contact Form):", error);
      return res.status(500).json({ error: error.message });
    }

    res
      .status(200)
      .json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("Server Error:", err);
    res
      .status(500)
      .json({ error: "Failed to send message. Please try again later." });
  }
});

// --- Serve Firebase Frontend Config ---
app.get("/api/config/firebase", (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  });
});

// --- Serve Supabase Frontend Config ---
app.get("/api/config/supabase", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,
  });
});

// --- Serve Stripe Frontend Config ---
app.get("/api/config/stripe", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

// Cloudinary Image Delete Route
app.post("/api/images/delete", async (req, res) => {
  const { public_id } = req.body;

  if (!public_id) {
    return res.status(400).json({ error: "No public_id provided" });
  }

  try {
    const result = await cloudinary.uploader.destroy(public_id);
    res.status(200).json({ message: "Image successfully deleted", result });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Failed to delete image from Cloudinary" });
  }
});

// Root route for testing
app.get("/", (req, res) => {
  res.send("Stride Server is running...");
});

// ==========================================
// Vercel / Local Server Toggle
// ==========================================

// DEPLOYMENT VARIANT: (Required for Vercel Serverless Functions)
module.exports = app;

// LOCAL MACHINE VARIANT: (Comment this block out when deploying)
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
