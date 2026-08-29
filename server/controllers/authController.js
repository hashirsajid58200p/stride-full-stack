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

    // 1. Verify the ID token sent from frontend
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    let role = decodedToken.role || "client";

    // 2. Authoritative check: If role is not admin in token, check custom claims & database
    if (role !== "admin") {
      try {
        const userRecord = await admin.auth().getUser(uid);
        if (userRecord.customClaims && userRecord.customClaims.role === "admin") {
          role = "admin";
        } else {
          // Check Realtime Database for existing admin accounts
          try {
            const db = admin.database();
            const snapshot = await db.ref(`users/${uid}/role`).once("value");
            if (snapshot.exists() && snapshot.val() === "admin") {
              role = "admin";
              await admin.auth().setCustomUserClaims(uid, { role: "admin" });
              console.log(`[Auth Verify] Auto-minted admin custom claim for UID: ${uid}`);
            }
          } catch (rtdbErr) {
            // RTDB check is optional fallback
          }

          // Check ADMIN_EMAILS environment variable if configured
          if (role !== "admin" && process.env.ADMIN_EMAILS && email) {
            const adminList = process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase());
            if (adminList.includes(email.toLowerCase())) {
              role = "admin";
              await admin.auth().setCustomUserClaims(uid, { role: "admin" });
              console.log(`[Auth Verify] Auto-minted admin custom claim for email: ${email}`);
            }
          }
        }
      } catch (checkErr) {
        console.warn("[Auth Verify] Role check warning:", checkErr.message);
      }
    }

    res.status(200).json({
      message: "Authentication successful",
      user: { uid, email, role },
    });
  } catch (error) {
    return sendError(res, 401, "Invalid or expired authentication token", error);
  }
};
