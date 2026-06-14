#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(SignalFeedbackPlugin, "SignalFeedbackPlugin",
   CAP_PLUGIN_METHOD(startHold, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(tickHold, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(endHold, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(playSignal, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(testTap, CAPPluginReturnPromise);
)
