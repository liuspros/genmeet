import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Rebuilds the private key from whatever mangled form it was pasted in
// (quotes, literal \n, spaces instead of line breaks, trailing commas).
function fixKey(raw: string) {
  const body = raw
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/["',\s]/g, "");
  return `-----BEGIN PRIVATE KEY-----\n${(body.match(/.{1,64}/g) || []).join("\n")}\n-----END PRIVATE KEY-----\n`;
}

// Initialised on first use, so a build without server variables does not crash.
function app() {
  if (getApps()[0]) return getApps()[0];
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    const j = JSON.parse(json);
    return initializeApp({ credential: cert({ projectId: j.project_id, clientEmail: j.client_email, privateKey: fixKey(j.private_key) }) });
  }
  const { FIREBASE_PROJECT_ID: id, FIREBASE_CLIENT_EMAIL: email, FIREBASE_PRIVATE_KEY: key } = process.env;
  if (!id || !email || !key) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT (or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId: id, clientEmail: email, privateKey: fixKey(key) }) });
}
export const getAdminAuth = () => getAuth(app());
export const getAdminDb = () => getFirestore(app());
export const getAdminMessaging = () => getMessaging(app());
