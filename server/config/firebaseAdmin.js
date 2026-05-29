const admin = require("firebase-admin");

let serviceAccount;

// ==========================================
// FIREBASE ADMIN AUTH TOGGLE
// ==========================================

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // DEPLOYMENT VARIANT:
  // Uses the JSON string stored in Vercel/Render environment variables
  try {
    let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    // Handle cases where the env var has leading/trailing quotes from pasting
    if (serviceAccountStr.startsWith('"') && serviceAccountStr.endsWith('"')) {
      serviceAccountStr = serviceAccountStr.slice(1, -1);
    }
    
    serviceAccount = JSON.parse(serviceAccountStr);
    
    // Handle the notorious Vercel newline character escaping in the private key
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  } catch (err) {
    console.error("Firebase Service Account Parse Error:", err);
  }
} else {
  // LOCAL MACHINE VARIANT:
  // Uses your local physical file (which is hidden from GitHub via .gitignore)
  try {
    serviceAccount = require("../serviceAccountKey.json");
  } catch (err) {
    console.warn(
      "Local serviceAccountKey.json not found. If this is production, ensure FIREBASE_SERVICE_ACCOUNT env var is set.",
    );
  }
}

// Initialize the SDK only if credentials were found
if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin SDK Initialized Successfully");
} else {
  console.error(
    "CRITICAL ERROR: Firebase Admin SDK failed to initialize. No credentials found.",
  );
}

module.exports = admin;
