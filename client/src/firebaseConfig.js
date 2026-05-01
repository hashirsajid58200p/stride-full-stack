import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { createClient } from "@supabase/supabase-js";

// Vite uses import.meta.env to access .env variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Legacy Bridges (Ensures your ported logic works)
window.auth = auth;
window.db = db;
window.googleProvider = googleProvider;
window.supabase = supabase;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signInWithPopup = signInWithPopup;
window.onAuthStateChanged = onAuthStateChanged;
window.stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Dispatch events
window.dispatchEvent(new Event("firebaseInitialized"));
window.dispatchEvent(new Event("supabaseInitialized"));

export { auth, db, supabase, googleProvider };
