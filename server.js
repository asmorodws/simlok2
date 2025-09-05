const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Setup Socket.IO
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Setup Redis adapter
  const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const subClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  
  io.adapter(createAdapter(pubClient, subClient));

  // Store io instance globally for use in API routes
  global.__socket_io = io;
  global.__socket_server = httpServer;

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', (data) => {
      try {
        const { role, vendorId } = data;
        
        if (role === 'ADMIN') {
          socket.join('admin');
          console.log(`Socket ${socket.id} joined admin room`);
        } else if (role === 'VENDOR' && vendorId) {
          socket.join(`vendor:${vendorId}`);
          console.log(`Socket ${socket.id} joined vendor room: ${vendorId}`);
        }
      } catch (error) {
        console.error('Error joining room:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
