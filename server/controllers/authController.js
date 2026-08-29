// server/controllers/authController.js
const admin = require("../config/firebaseAdmin");
const { sendError } = require("../utils/safeError");

exports.verifyToken = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "Authentication token is required" });
  }

  try {
    if (!admin || !admin.apps || admin.apps.length === 0) {
      const reason = admin && admin.initError ? ` Reason: ${admin.initError}` : "";
      throw new Error(`Firebase Admin SDK is not initialized.${reason}`);
    }

    // Verify the ID token sent from the frontend
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    res.status(200).json({
      message: "Authentication successful",
      user: { uid, email },
    });
  } catch (error) {
    return sendError(res, 401, "Invalid or expired authentication token", error);
  }
};
