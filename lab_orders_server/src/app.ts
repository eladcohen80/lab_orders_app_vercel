import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import orderRoutes from './routes/orderRoutes';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import supplierRoutes from './routes/supplierRoutes';
import productRoutes from './routes/productRoutes';
import budgetRoutes from './routes/budgetRoutes';
import ragRoutes from './routes/ragRoutes';
import sql from './db';

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use('/orders', orderRoutes);
app.use('/users', userRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/products', productRoutes);
app.use('/budgets', budgetRoutes);
app.use('/api/rag', ragRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Run DB migration only outside of serverless cold-start to avoid blocking
sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`.catch(
  (error) => console.error('DB migration warning:', error)
);

// Local development server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;