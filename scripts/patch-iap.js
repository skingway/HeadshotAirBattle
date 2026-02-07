/**
 * Patches react-native-iap v13 for RN 0.83+ compatibility
 * Fixes 'currentActivity' unresolved reference in RNIapModule.kt
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-iap',
  'android',
  'src',
  'play',
  'java',
  'com',
  'dooboolab',
  'rniap',
  'RNIapModule.kt',
);

if (!fs.existsSync(filePath)) {
  console.log('[patch-iap] RNIapModule.kt not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');
let patched = false;

// Fix 1: currentActivity -> reactContext.currentActivity
if (content.includes('val activity = currentActivity')) {
  content = content.replace(
    'val activity = currentActivity',
    'val activity = reactContext.currentActivity',
  );
  patched = true;
}

// Fix 2: Cast activity to Activity for launchBillingFlow
if (
  content.includes(
    'billingClient.launchBillingFlow(activity, flowParams)',
  ) &&
  !content.includes('activity as android.app.Activity')
) {
  content = content.replace(
    'billingClient.launchBillingFlow(activity, flowParams)',
    'billingClient.launchBillingFlow(activity as android.app.Activity, flowParams)',
  );
  patched = true;
}

if (patched) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[patch-iap] Successfully patched RNIapModule.kt for RN 0.83+');
} else {
  console.log('[patch-iap] No patches needed');
}
