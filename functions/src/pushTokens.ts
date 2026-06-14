const appBundleId = "co.polomar.app";
const watchBundleId = "co.polomar.app.watchkitapp";

export function normalizePushBundleId(bundleId: string): string {
    return bundleId === appBundleId || bundleId === watchBundleId
        ? bundleId
        : watchBundleId;
}

export function getUserPushTokenField(bundleId: string): "fcmToken" | "watchToken" {
    return normalizePushBundleId(bundleId) === appBundleId ? "fcmToken" : "watchToken";
}

export { appBundleId, watchBundleId };
