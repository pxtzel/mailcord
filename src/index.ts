// exit if ran without env file
import './prestart';
import logger from '@util/log';
import database from '@database';
import { client as discordClient, start as startBot } from './bot';
import { start as startMail, client as mailClient } from './mail';

const requiredEnvironmentVariables = [
  'NODE_ENV',
  'IMAP_USER',
  'IMAP_PASSWORD',
  'DISCORD_TOKEN',
  'DATABASE_URL',
  'SHORTENER_PASSWORD'
];

if (
  !requiredEnvironmentVariables.every((environment) => process.env[environment])
) {
  throw new Error('Environment variables are not set up correctly');
}

async function main(): Promise<void> {
  logger.info('Starting Mailcord');

  logger.debug('Connecting to database');
  await database.$connect();
  logger.debug('Connected to database');

  logger.debug('Starting Discord bot');
  await startBot();
  logger.debug('Discord bot started');

  logger.debug('Starting mail client');
  await startMail();
  logger.debug('Mail client started');
}

try {
  void main();
} catch (error) {
  logger.error('Error on main function:');
  logger.error(error);
  process.exit(1);
}

const onExit = async (): Promise<void> => {
  logger.info('Gracefully shutting down... (this may take a few seconds)');
  if (discordClient.readyAt !== null) {
    logger.debug('Discord client is active, logging out');
    await discordClient.destroy();
    logger.debug('Disconnected from discord server');
  }
  if (mailClient.authenticated === true) {
    logger.debug('Mail client is active, logging out');
    await mailClient.logout();
    logger.debug('Disconnected from mail server');
  }
  // check if database is active
  await database.$queryRaw`SELECT 1`
    .then(async () => {
      logger.debug('Database is active, disconnecting');
      await database.$disconnect();
      logger.debug('Disconnected from database');
    })
    .catch(() => {});
  mailClient.close();
  logger.info('Shutdown complete');
  process.exit(0);
};

// handle signals
process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);

// catch unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:');
  logger.error(error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:');
  logger.error(error);
  process.exit(1);
});
