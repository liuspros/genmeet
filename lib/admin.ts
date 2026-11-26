import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialised on first use, so a build without server variables does not crash.
function app() {
  const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !key) {
    throw new Error("Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY.");
  }
  return getApps()[0] ?? initializeApp({
    credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }),
  });
}
export const getAdminAuth = () => getAuth(app());
export const getAdminDb = () => getFirestore(app());
