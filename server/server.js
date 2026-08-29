const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
const { Resend } = require("resend");
const http = require("http");
const { Server } = require("socket.io");

// Initialize environment variables BEFORE importing routes/configs
dotenv.config();

const firebaseAdmin = require("./config/firebaseAdmin");
const supabaseAdmin = require("./config/supabaseAdmin");
const { requireAuth } = require("./middleware/auth");
const { globalApiLimiter, submissionLimiter } = require("./middleware/rateLimiters");

const resend = new Resend(process.env.RESEND_API_KEY);

const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const currencyRoutes = require("./routes/currencyRoutes");
const chatRoutes = require("./routes/chatRoutes");
const aiRoutes = require("./routes/aiRoutes");
const productRoutes = require("./routes/productRoutes");
const adminRoutes = require("./routes/adminRoutes");
const paymentController = require("./controllers/paymentController");

const app = express();
const server = http.createServer(app);

// Strict CORS allowlist
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://localhost:5000,https://stride-full-stack.vercel.app"
)
  .split(",")
  .map((o) => o.trim());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Blocked by CORS policy"));
    }
  },
  credentials: true,
};

// 1. Socket.io with authenticated handshake and restricted CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io Auth Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required for live support"));
  }
  try {
    if (!firebaseAdmin || !firebaseAdmin.apps || firebaseAdmin.apps.length === 0) {
      throw new Error("Firebase Admin SDK not initialized");
    }
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    socket.user = decoded;
    next();
  } catch (err) {
    console.warn("[Socket Auth Failed]:", err.message);
    next(new Error("Invalid authentication token"));
  }
});

// Helper to save messages to Supabase securely via supabaseAdmin
const saveMessageToDb = async (userId, text, sender, userName = null) => {
  try {
    await supabaseAdmin.from("chat_messages").insert([
      {
        user_id: userId,
        text: text,
        sender: sender,
        user_name: userName,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error("[Chat DB Save Error]:", err.message);
  }
};

// Socket.io Handlers with Verified User Context & Room Isolation
io.on("connection", (socket) => {
  console.log(`[WebSocket] Authenticated socket connected: ${socket.id} (UID: ${socket.user?.uid})`);

  socket.on("join-room", (roomId) => {
    const isAdmin = socket.user?.role === "admin";
    // Users can only join their own room; Admins can join any room
    if (isAdmin || roomId === socket.user?.uid) {
      socket.join(roomId);
    } else {
      console.warn(`[Socket Security] Unauthorized room join attempt by ${socket.user?.uid} for room ${roomId}`);
    }
  });

  // When an authenticated user sends a message
  socket.on("send-to-admin", async (data) => {
    const senderUid = socket.user?.uid;
    const senderName = socket.user?.name || data?.userName || "Customer";
    const cleanMessage = String(data?.message || "").slice(0, 1000);

    if (!cleanMessage) return;

    await saveMessageToDb(senderUid, cleanMessage, "user", senderName);

    socket.broadcast.emit("new-customer-message", {
      userId: senderUid,
      userName: senderName,
      message: cleanMessage,
      timestamp: new Date().toISOString(),
    });
  });

  // When an admin replies
  socket.on("send-to-user", async (data) => {
    if (socket.user?.role !== "admin") {
      console.warn(`[Socket Security] Non-admin ${socket.user?.uid} attempted to send admin reply`);
      return;
    }

    const targetUserId = data?.userId;
    const cleanMessage = String(data?.message || "").slice(0, 1000);

    if (!targetUserId || !cleanMessage) return;

    await saveMessageToDb(targetUserId, cleanMessage, "admin");

    io.to(targetUserId).emit("admin-message", {
      text: cleanMessage,
      sender: "admin",
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    console.log("[WebSocket] Disconnected:", socket.id);
  });
});

// 2. Stripe webhook requires raw body for signature verification
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleStripeWebhook
);

// 3. Global middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use("/api", globalApiLimiter);

// Configure Cloudinary globally
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 4. Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);

// HTML escaping helper for email / contact form
const escapeHtml = (str) => {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Rate-limited Newsletter Subscription
app.post("/api/newsletter/subscribe", submissionLimiter, async (req, res) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: "Valid email address is required" });
  }

  try {
    const { error } = await resend.contacts.create({ email: email.toLowerCase().trim(), unsubscribed: false });
    if (error) return res.status(500).json({ error: "Failed to subscribe email" });
    res.status(200).json({ success: true, message: "Successfully subscribed!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to subscribe." });
  }
});

// Rate-limited & HTML Sanitized Contact Form
app.post("/api/contact", submissionLimiter, async (req, res) => {
  const { name, email, phone, message } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required" });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address format" });
  }

  const safeName = escapeHtml(String(name).trim().slice(0, 100));
  const safeEmail = escapeHtml(String(email).trim().slice(0, 120));
  const safePhone = escapeHtml(String(phone || "").trim().slice(0, 30));
  const safeMessage = escapeHtml(String(message).trim().slice(0, 2000));

  try {
    const { error } = await resend.emails.send({
      from: "Stride Support <onboarding@resend.dev>",
      to: ["hs58200d@gmail.com"],
      subject: `New Contact Submission from ${safeName}`,
      html: `
        <h2>New Stride Contact Submission</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone || "N/A"}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="background:#f4f4f5;padding:12px;border-left:4px solid #ff6b00;">${safeMessage}</blockquote>
      `,
    });

    if (error) {
      console.error("[Resend Contact Error]:", error);
      return res.status(500).json({ error: "Failed to deliver contact message" });
    }

    res.status(200).json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("[Contact API Error]:", err.message);
    res.status(500).json({ error: "Failed to process contact submission" });
  }
});

// Configuration endpoint (Public tokens only)
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

// Server Health Check
app.get("/api/health", async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("products").select("id").limit(1);
    if (error) throw error;
    res.status(200).json({ status: "active", message: "Stride Platform Health OK" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Database check failed" });
  }
});

// Authenticated Cloudinary Image Deletion
app.post("/api/images/delete", requireAuth, async (req, res) => {
  const { public_id } = req.body;
  if (!public_id) {
    return res.status(400).json({ error: "public_id is required" });
  }

  const isAdmin = req.user && req.user.role === "admin";
  const isOwnAvatar =
    req.user &&
    (public_id.startsWith(`stride/avatars/${req.user.uid}`) ||
      public_id.startsWith(`avatars/${req.user.uid}`));

  if (!isAdmin && !isOwnAvatar) {
    return res.status(403).json({ error: "Unauthorized to delete this media asset" });
  }

  try {
    const result = await cloudinary.uploader.destroy(public_id);
    res.status(200).json({ message: "Deleted", result });
  } catch (error) {
    console.error("[Cloudinary Delete Error]:", error.message);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

app.get("/", (req, res) => {
  res.send("Stride Server Running...");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server & WebSocket running on http://localhost:${PORT}`);
});
