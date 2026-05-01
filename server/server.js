const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
const { Resend } = require("resend");
const http = require("http");
const { Server } = require("socket.io");

// CRITICAL FIX: Initialize environment variables BEFORE importing routes
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const currencyRoutes = require("./routes/currencyRoutes");
const chatRoutes = require("./routes/chatRoutes");
const aiRoutes = require("./routes/aiRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/products", productRoutes);

// Helper to save messages to Supabase
const saveMessageToDb = async (userId, text, sender, userName = null) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        user_id: userId,
        text: text,
        sender: sender,
        user_name: userName,
        created_at: new Date()
      })
    });
  } catch (err) {
    console.error("Error saving message to DB:", err.message);
  }
};

// Socket.io Logic for Admin-User Chat
io.on("connection", (socket) => {
  console.log("New WebSocket connection:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
  });

  // When a user sends a message
  socket.on("send-to-admin", async (data) => {
    // Save to DB
    await saveMessageToDb(data.userId, data.message, "user", data.userName);
    // Broadcast to admins
    socket.broadcast.emit("new-customer-message", data);
  });

  // When an admin replies
  socket.on("send-to-user", async (data) => {
    // Save to DB
    await saveMessageToDb(data.userId, data.message, "admin");
    // Send to specific user
    io.to(data.userId).emit("admin-message", {
      text: data.message,
      sender: "admin",
      timestamp: new Date()
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Other routes...
app.post("/api/newsletter/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    const { data, error } = await resend.contacts.create({ email, unsubscribed: false });
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ success: true, message: "Successfully subscribed!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to subscribe." });
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: "Required fields missing" });
  try {
    const { data, error } = await resend.emails.send({
      from: "Stride Support <onboarding@resend.dev>",
      to: ["hs58200d@gmail.com"],
      subject: `New Contact Form Submission from ${name}`,
      html: `<h2>New Message</h2><p><strong>Name:</strong> ${name}</p><p><strong>Message:</strong> ${message}</p>`,
    });
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ success: true, message: "Message sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send message." });
  }
});

app.get("/api/config", (req, res) => {
  res.setHeader("Cache-Control", "public, s-maxage=86400");
  res.json({
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    },
    supabase: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
    },
    stripe: { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY },
  });
});

app.post("/api/images/delete", async (req, res) => {
  const { public_id } = req.body;
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    res.status(200).json({ message: "Deleted", result });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

app.get("/", (req, res) => { res.send("Stride Server Running..."); });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server & WebSocket running on http://localhost:${PORT}`);
});
