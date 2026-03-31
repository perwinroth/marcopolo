import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'co.polomar.app',
    appName: 'Marco Polo',
    webDir: 'out',
    server: {
        iosScheme: 'https',
        androidScheme: 'https',
        allowNavigation: [
            "*.firebaseapp.com",
            "*.googleapis.com",
            "*.google.com",
            "*.gstatic.com"
        ]
    },
    plugins: {
        FirebaseAuthentication: {
            // CRITICAL: skipNativeAuth must be true
            // The native plugin handles reCAPTCHA + SMS only.
            // The JS Firebase SDK handles the actual sign-in.
            // If false, both native AND JS try to authenticate with the same
            // credential, causing the second call to hang.
            skipNativeAuth: true,
            providers: ["phone"]
        }
    }
};

export default config;
