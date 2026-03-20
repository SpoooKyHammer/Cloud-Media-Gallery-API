import app from './app';
import config from './config/index';
import connectDB from './config/database';

const PORT = config.port;

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
