#!/usr/bin/env node
/**
 * Script: set-admin-claim.js
 * Sets Firebase Custom User Claim { role: "admin" } on a specified UID.
 * 
 * Usage:
 *   node server/scripts/set-admin-claim.js <FIREBASE_UID>
 */

require("dotenv").config();
const admin = require("../config/firebaseAdmin");

async function setAdminClaim() {
  const targetUid = process.argv[2];

  if (!targetUid) {
    console.error("\n❌ Error: Firebase UID is required.\nUsage: node server/scripts/set-admin-claim.js <FIREBASE_UID>\n");
    process.exit(1);
  }

  try {
    if (!admin || !admin.apps || admin.apps.length === 0) {
      throw new Error("Firebase Admin SDK is not initialized. Check your environment variables / serviceAccountKey.json.");
    }

    // Verify user exists first
    const userRecord = await admin.auth().getUser(targetUid);
    console.log(`\nFound User: ${userRecord.email || "No email"} (UID: ${userRecord.uid})`);

    // Set custom claims
    await admin.auth().setCustomUserClaims(targetUid, { role: "admin" });

    console.log(`✅ Success! Custom claim { role: "admin" } has been assigned to UID: ${targetUid}`);
    console.log(`ℹ️ Note: The user will need to log out and log back in (or refresh their ID token) for the new claim to take effect.\n`);
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Failed to set admin custom claim:", error.message, "\n");
    process.exit(1);
  }
}

setAdminClaim();
