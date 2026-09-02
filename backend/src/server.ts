import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDB, disconnectDB } from './config/database.js';
import { seedDatabaseIfEmpty } from './utils/seedHelper.js';

process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('💥 Unhandled Rejection', reason);
});

async function bootstrap() {
  try {
    logger.info(`🚀 Starting backend service in ${env.NODE_ENV} mode...`);
    logger.info(`🔌 Port configured: ${env.PORT}`);

    await connectDB();
    await seedDatabaseIfEmpty();

    const server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on http://0.0.0.0:${env.PORT}`);
      logger.info(`🏥 Health check available at /api/v1/health`);
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
  } catch (error: any) {
    logger.error('❌ Failed to start server', error);
    process.exit(1);
  }
}

bootstrap();
