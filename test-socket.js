const { io } = require('socket.io-client');

// Test Socket.IO connection and events
const testSocket = () => {
  console.log('🧪 Testing Socket.IO Realtime Events...\n');

  const socket = io('http://localhost:3000', {
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    
    // Test joining admin room
    socket.emit('join-room', { scope: 'admin' });
    
    // Listen for all events
    socket.on('notification:new', (data) => {
      console.log('🔔 New notification received:', data);
    });
    
    socket.on('stats:updated', (data) => {
      console.log('📊 Stats updated:', data);
    });
    
    socket.on('submission:new', (data) => {
      console.log('📝 New submission:', data);
    });
    
    socket.on('submission:updated', (data) => {
      console.log('📝 Submission updated:', data);
    });
    
    socket.on('user:verified', (data) => {
      console.log('✅ User verified:', data);
    });
    
    console.log('🎧 Listening for events...');
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });

  // Keep the connection alive for testing
  setTimeout(() => {
    console.log('🔌 Closing test connection...');
    socket.disconnect();
    process.exit(0);
  }, 30000); // 30 seconds
};

testSocket();
