const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

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

  // Initialize Socket.IO using singleton pattern
  const { initializeSocketIO } = require('./src/lib/singletons');
  const io = initializeSocketIO(httpServer);

  // Store references globally for API routes
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
