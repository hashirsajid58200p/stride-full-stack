const admin = require("../config/firebaseAdmin");

exports.verifyToken = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "No token provided" });
  }

  try {
    // Check if Firebase Admin was successfully initialized
    if (!admin || !admin.app || typeof admin.auth !== "function") {
      throw new Error("Firebase Admin SDK is not initialized. Please ensure the FIREBASE_SERVICE_ACCOUNT environment variable is set correctly in Vercel.");
    }

    // Verify the ID token sent from the frontend
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // If successful, we get the user's unique ID (UID) and email
    const { uid, email } = decodedToken;

    res.status(200).json({
      message: "Authentication successful",
      user: { uid, email },
    });
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    res.status(401).json({
      error: error.message || "Invalid or expired token",
      code: error.code,
      stack: error.stack,
      details: typeof error === "object" ? { ...error, message: error.message, stack: error.stack } : error
    });
  }
};
