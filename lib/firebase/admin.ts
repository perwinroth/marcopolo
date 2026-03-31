import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (projectId && clientEmail && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
            });
            console.log("Firebase Admin initialized successfully.");
        } else {
            console.warn(
                "Firebase Admin configuration missing. Please ensure " +
                "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are set in .env.local"
            );
            // Fallback for development if credentials are not fully set
            admin.initializeApp({
                projectId: projectId || "marcopolo-fallback",
                databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://marcopolo-fallback-default-rtdb.firebaseio.com",
            });
        }
    } catch (error) {
        console.error("Firebase Admin initialization error", error);
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.database();
