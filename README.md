# GenMeet PWA (first version)

Next.js 14 + Firebase (Auth, Firestore) + Vercel. Installable on Android (Chrome menu, Install app).

## Setup
1. Firebase project "genmeet" already exists: in the console, enable Google sign-in (Authentication) and create a Firestore database.
2. The web config is already in `.env.local`. Create a service account key (Project settings, Service accounts, Generate new private key). Easiest: paste the whole downloaded JSON file as one variable, `FIREBASE_SERVICE_ACCOUNT`. Alternatively use the three FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY variables.
3. Deploy `firestore.rules` (Firebase console, Firestore, Rules).
4. Google Cloud (same project): enable the Google Meet REST API and add the `meetings.space.created` scope on the OAuth consent screen. Production use needs Google verification.
5. Add your Vercel domain to Firebase Auth, Settings, Authorized domains.
6. Lecturers add students in the app (Roster tab, people icon). Manual option in Firestore: `rosters/<CLASSCODE>/students/<ID>` with `name` and `uid: null`. Document ids cannot contain `/`, so write IDs with dashes (2024/BIO/0142 becomes 2024-BIO-0142). The app converts what students type.
7. Put lecturer Gmail addresses in `LECTURER_EMAILS`.
8. `npm install`, `npm run dev`. On Vercel, add the same variables.

## Not built yet
Splash screen is included. ID and password sign-in, reminders and push, attendance, in-chat meeting cards.
