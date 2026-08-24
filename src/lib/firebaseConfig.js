// Firebase project configuration for Phone Authentication.
//
// SETUP:
// 1. Go to Firebase Console → Project Settings → General → Your apps → Web app.
// 2. Copy the config values below.
// 3. Enable Phone Authentication: Firebase Console → Authentication → Sign-in method → Phone → Enable.
// 4. Add your domain: Firebase Console → Authentication → Settings → Authorized domains.
// 5. For testing, add a test phone number in Firebase Console → Authentication → Sign-in method → Phone → Phone numbers for testing.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "kramashah-XXXXX.firebaseapp.com",
  projectId: "kramashah-XXXXX",
  storageBucket: "kramashah-XXXXX.appspot.com",
  messagingSenderId: "XXXXXXXXXXXXX",
  appId: "1:XXXXXXXXXXXXX:web:XXXXXXXXXXXXXXXXXXXX"
};

// Detect placeholder config.
export const firebaseNotConfigured = firebaseConfig.apiKey.includes("XXXX");

let auth = null;
if (!firebaseNotConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (e) {
    console.warn("Firebase init failed:", e?.message);
  }
}

export { auth, firebaseConfig };