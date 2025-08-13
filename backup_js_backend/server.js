import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import atsRoutes from './routes/ats.js';

// Load environment variables
dotenv.config({ path: '../.env' });

// Debug environment loading
console.log('Environment check:');
console.log('- GEMINI_API_KEY:', process.env.REACT_APP_GEMINI_API_KEY ? 'Loaded (***' + process.env.REACT_APP_GEMINI_API_KEY.slice(-4) + ')' : 'Missing');

// Initialize express app
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Routes
app.use('/api/ats', atsRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('ATS API is running - Upload a resume for analysis');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});