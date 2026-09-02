import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDB, disconnectDB } from './config/database.js';
import { seedDatabaseIfEmpty } from './utils/seedHelper.js';

async function bootstrap() {
  try {
    await connectDB();
    await seedDatabaseIfEmpty();

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
      logger.info(`🏥 Health check available at http://localhost:${env.PORT}/api/v1/health`);
    });

    // Graceful Shutdown Handling
    const gracefulShutdown = async (signal: string) => {
      logger.warn(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDB();
        logger.info('MongoDB disconnected.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
