import { registerPlugin } from '@capacitor/core';

export interface WatchPluginInterface {
    updateApplicationContext(options: {
        uid: string;
        token: string;
        refreshToken?: string;
        apiKey?: string;
    }): Promise<{ success: boolean }>;
    addListener(eventName: 'onWatchMessage', listenerFunc: (data: any) => void): Promise<any>;
}

const WatchPlugin = registerPlugin<WatchPluginInterface>('WatchPlugin');

export default WatchPlugin;
