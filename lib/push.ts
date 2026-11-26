"use client";
import { getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { User } from "firebase/auth";
import "./firebase";
import { api } from "./flow";

export const pushSupported = async () =>
  typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && (await isSupported().catch(() => false));

// Asks permission if needed, then registers this device for class alerts.
export async function enablePush(user: User) {
  if (!(await pushSupported())) throw new Error("This browser cannot show alerts. On iPhone, add the app to the Home Screen first.");
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Alerts are blocked. Allow notifications in your browser settings.");
  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(getApp()), { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) throw new Error("Could not register this device for alerts.");
  await api("/api/push/register", user, { token });
}
