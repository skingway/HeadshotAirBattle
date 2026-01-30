/**
 * Firebase Configuration Checker
 * Run: node check-firebase-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Firebase Configuration...\n');

// Check google-services.json for Android
const androidConfigPath = path.join(__dirname, 'android', 'app', 'google-services.json');
const androidExists = fs.existsSync(androidConfigPath);

console.log('📱 Android Configuration:');
if (androidExists) {
  console.log('  ✅ google-services.json found at:', androidConfigPath);

  try {
    const content = fs.readFileSync(androidConfigPath, 'utf8');
    const config = JSON.parse(content);

    console.log('  ✅ JSON format is valid');
    console.log('  📝 Project ID:', config.project_info?.project_id || 'N/A');

    if (config.client && config.client[0]) {
      const packageName = config.client[0].client_info?.android_client_info?.package_name;
      console.log('  📝 Package Name:', packageName || 'N/A');

      if (packageName === 'com.headshotairbattle') {
        console.log('  ✅ Package name matches!');
      } else {
        console.log('  ⚠️  Package name mismatch! Expected: com.headshotairbattle');
      }
    }
  } catch (error) {
    console.log('  ❌ Failed to parse google-services.json:', error.message);
  }
} else {
  console.log('  ❌ google-services.json NOT found');
  console.log('  📍 Expected location:', androidConfigPath);
  console.log('  📖 See FIREBASE_SETUP_GUIDE.md for instructions');
}

console.log('\n' + '='.repeat(60));

// Check if Firebase plugin is enabled
const appBuildGradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');
if (fs.existsSync(appBuildGradlePath)) {
  const buildGradleContent = fs.readFileSync(appBuildGradlePath, 'utf8');

  console.log('\n🔌 Firebase Gradle Plugin:');
  if (buildGradleContent.includes("apply plugin: 'com.google.gms.google-services'") &&
      !buildGradleContent.includes("// TODO: Enable this")) {
    console.log('  ✅ Firebase plugin is ENABLED');
  } else {
    console.log('  ⚠️  Firebase plugin is COMMENTED OUT');
    console.log('  📝 You need to enable it after adding google-services.json');
  }
}

console.log('\n' + '='.repeat(60));

// Summary
console.log('\n📊 Summary:');
if (androidExists) {
  console.log('  ✅ Ready to build Android app with Firebase');
  console.log('  📝 Next step: Enable Firebase plugin in android/app/build.gradle');
  console.log('  📝 Then run: cd android && ./gradlew clean');
} else {
  console.log('  ⚠️  Firebase not configured yet');
  console.log('  📖 Follow instructions in FIREBASE_SETUP_GUIDE.md');
}

console.log('\n');
