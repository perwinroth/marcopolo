#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro
CAP_PLUGIN(WatchPlugin, "WatchPlugin",
   CAP_PLUGIN_METHOD(updateApplicationContext, CAPPluginReturnPromise);
)
