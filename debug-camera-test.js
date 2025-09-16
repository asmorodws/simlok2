// Quick camera test script
console.log('🧪 Testing camera access...');

async function testCamera() {
  try {
    console.log('📱 Testing environment camera (back camera)...');
    const envStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment" }
    });
    console.log('✅ Environment camera available:', envStream.getVideoTracks()[0].getSettings());
    envStream.getTracks().forEach(track => track.stop());
    
    console.log('📱 Testing any camera...');
    const anyStream = await navigator.mediaDevices.getUserMedia({ 
      video: true
    });
    console.log('✅ Any camera available:', anyStream.getVideoTracks()[0].getSettings());
    anyStream.getTracks().forEach(track => track.stop());
    
    console.log('📱 Getting available devices...');
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log('📹 Available cameras:', videoDevices);
    
  } catch (error) {
    console.error('❌ Camera test failed:', error);
  }
}

testCamera();
