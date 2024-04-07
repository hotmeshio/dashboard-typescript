import 'dotenv/config';
import { Pluck } from '@hotmeshio/pluck';
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
//import morgan from 'morgan';
import winston from 'winston';
import expressWinston from 'express-winston';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';

import { setupTelemetry } from '../services/tracer';
import { Bill } from '../services/pluck/bill';
import { User } from '../services/pluck/user';
import { router as billRouter } from './routes/bill';
import { router as userRouter } from './routes/user';
import { router as pluckRouter } from './routes/pluck';
import { CustomRequest } from '../types/http';
import { Socket } from './utils/socket';

const app = express();

// Create a Winston logger instance with custom settings
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json(),
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console(),
    // Add other transports here, e.g., file transport for error logs
  ],
});

// Use express-winston logger middleware for more detailed request logging
app.use(expressWinston.logger({
  winstonInstance: logger,
  msg: 'HTTP {{req.method}} {{req.url}}',
  // Include the stack trace in the log if it's an error
  expressFormat: true,
  colorize: false,
}));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

const corsOptions = {
  origin: 'http://localhost:3000', // adjust according to the front-end URL
  credentials: true, // important for sessions (or token authentication in cookies)
};
app.use(cors(corsOptions));

async function initialize() {
  // Setup open telemetry
  setupTelemetry();

  // Setup Pluck; connect functions
  await User.connect();
  await User.index();
  await Bill.connect();
  await Bill.index();

  // Express application setup
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "http://localhost:3000", // Ensure this matches your front-end URL, adjust as needed
      methods: ["GET", "POST"], // Allowed request methods
      credentials: true
    }
  });
  Socket.bindServer(io);

  // Express Middleware config
  app.use(express.json());
  app.use((req: CustomRequest, _, next) => {
    req.io = io;
    next();
  });

  // API route declarations
  app.use('/api/v1/bills', billRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/pluck', pluckRouter);

  // Static React Webapp serving
  app.use(express.static(path.join(__dirname, '../app/build')));
  app.get('/*', (req, res) => {
      res.sendFile(path.join(__dirname, '../app/build', 'index.html'));
  });

  // Socket.io setup
  io.on('connection', (socket) => {
    console.log('A user connected');

    // socket.on('updateUser', (data) => {
    //   io.emit('mesh.planes.control', data);
    // });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  // Start HTTP server
  const PORT = process.env.PORT || 3010;
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Call initialize function
initialize().catch(error => {
  console.error('Failed to initialize the application:', error);
  process.exit(1);
});

// Disconnect Pluck and Express; exit the process
async function shutdown() {
  await Pluck.shutdown();
  //todo: close express server
  process.exit(0);
}

// Quit on ctrl-c when running docker in terminal
process.on('SIGINT', async function onSigint() {
  console.log('Got SIGINT (aka ctrl-c in docker). Graceful shutdown', { loggedAt: new Date().toISOString() });
  await shutdown();
});

// Quit properly on docker stop
process.on('SIGTERM', async function onSigterm() {
  console.log('Got SIGTERM (docker container stop). Graceful shutdown', { loggedAt: new Date().toISOString() });
  await shutdown();
});
