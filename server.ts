import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db/index.js';
import { seedDatabase } from './server/db/seed.js';

import authRoutes from './server/routes/authRoutes.js';
import venueRoutes from './server/routes/venueRoutes.js';
import bookingRoutes from './server/routes/bookingRoutes.js';
import gameRoutes from './server/routes/gameRoutes.js';
import financialRoutes from './server/routes/financialRoutes.js';
import communityRoutes from './server/routes/communityRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize DB & Seed Data
  try {
    await getDb();
    await seedDatabase();
    console.log('KhelArena SQLite Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KhelArena Patna Engine',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/venues', venueRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/games', gameRoutes);
  app.use('/api/financials', financialRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve shared public game links redirect route handler if needed or let Vite handle client SPA fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KhelArena platform server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
