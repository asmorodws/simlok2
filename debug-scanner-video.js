// Test untuk debugging mobile scanner video visibility
console.log('🔍 Testing scanner video visibility...\n');

// Simulate scanner initialization debugging
const debugScanner = () => {
  console.log('📱 Mobile Scanner Video Debug Steps:');
  console.log('1. Check if scanner element exists');
  console.log('2. Look for video elements after initialization');
  console.log('3. Verify CSS rules don\'t hide video');
  console.log('4. Check if camera permissions are granted');
  console.log('5. Ensure video constraints are correct\n');

  // Video constraints for back camera
  const videoConstraints = {
    facingMode: "environment", // Force back camera
    width: { ideal: 1280 },
    height: { ideal: 720 }
  };
  
  console.log('📹 Video Constraints:');
  console.log(JSON.stringify(videoConstraints, null, 2));

  // CSS rules that should ENSURE video visibility
  console.log('\n✅ CSS Rules to Force Video Visibility:');
  console.log('video { display: block !important; }');
  console.log('video { visibility: visible !important; }');
  console.log('video { opacity: 1 !important; }');
  console.log('video { width: 100% !important; }');
  console.log('video { min-height: 250px !important; }');
  console.log('video { position: relative !important; }');
  console.log('video { z-index: 1 !important; }');

  // Things that should be hidden
  console.log('\n🚫 Elements that should be hidden:');
  console.log('- select (camera dropdown)');
  console.log('- .html5-qrcode-camera-selection');
  console.log('- button[title*="torch"]');
  console.log('- button[title*="camera"]');
  console.log('- input[type="range"] (zoom)');
  console.log('- .html5-qrcode-torch-button');

  // Debug steps for user
  console.log('\n🛠️ If video still not showing:');
  console.log('1. Check browser console for camera permission errors');
  console.log('2. Verify camera is not being used by another app');
  console.log('3. Check if HTTPS is enabled (required for camera)');
  console.log('4. Test on different device/browser');
  console.log('5. Inspect element to see if video tag exists');

  // Scanner timing
  console.log('\n⏱️ Scanner Initialization Timing:');
  console.log('- Wait 1000ms for element to be ready');
  console.log('- Initialize scanner with back camera constraints');
  console.log('- Wait 2000ms before cleaning up UI');
  console.log('- Only run cleanup once (not repeatedly)');

  console.log('\n🎯 Expected Result:');
  console.log('- Black video background with camera feed');
  console.log('- QR detection overlay (canvas)');
  console.log('- No camera selection dropdown');
  console.log('- No torch/flash buttons');
  console.log('- Stop Scanning button below video');
};

debugScanner();

// Browser compatibility check
console.log('\n🌐 Browser Compatibility:');
console.log('- getUserMedia API: Required');
console.log('- Camera permissions: Must be granted');
console.log('- HTTPS: Required for camera access');
console.log('- Modern browser: Chrome 60+, Firefox 55+, Safari 11+');

console.log('\n✅ Scanner debugging completed!');
console.log('If video still not showing, check browser console for errors.');
