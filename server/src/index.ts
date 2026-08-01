import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import notebookRoutes from './routes/notebooks';
import clipboardItemRoutes from './routes/clipboardItems';
import todoRoutes from './routes/todos';
import dashboardRoutes from './routes/dashboard';
import aiRoutes from './routes/ai';
import ttsRoutes from './routes/tts';
import voiceRoutes from './routes/voice';
import audioRoutes from './routes/audio';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // To be restricted in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000', 
      'http://localhost:5173', 
      'http://localhost:5174', 
      'http://localhost', 
      'https://localhost',
      'capacitor://localhost'
    ];

    if (process.env.CORS_ORIGIN) {
      const envOrigins = process.env.CORS_ORIGIN.split(',');
      if (envOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    // Allow localhost or local IP addresses (192.168.x.x, 10.x.x.x, 172.x.x.x, etc.)
    const isLocal = origin.startsWith('http://localhost') || 
                    origin.startsWith('https://localhost') ||
                    origin.startsWith('capacitor://') ||
                    /^http:\/\/(127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);

    if (allowedOrigins.indexOf(origin) !== -1 || isLocal) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Make io accessible to routers
app.set('io', io);

// Basic Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ClipVault API is running.' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notebooks', notebookRoutes);
app.use('/api/clipboard-items', clipboardItemRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/audio', audioRoutes);

// Make uploads folder static
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Socket.io Connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  server.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
});
