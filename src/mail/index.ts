import { ImapFlow, type ImapFlowOptions } from 'imapflow';
import config from '@config';
import logger from '@util/log';
import { handleMail, handlers } from './handler';

const { imap } = config.mail;
const imapConfig: ImapFlowOptions = {
  host: imap.host,
  port: imap.port,
  secure: imap.secure,
  auth: {
    user: imap.user,
    pass: imap.password
  },
  tls: {
    rejectUnauthorized: false
  },
  logger: false
};

let client = new ImapFlow(imapConfig);

export const startListening = async (): Promise<void> => {
  logger.debug(`Loaded ${handlers.length} mail handlers`);
  logger.debug(
    handlers.map((handler) => {
      const handlerPatterns = Array.isArray(handler.match)
        ? handler.match.map((pattern) => pattern.type)
        : ['default'];
      return `${handler.name}: (${handlerPatterns.join(', ')})`;
    })
  );
  client.on('exists', async () => {
    await fetchMails(); // fetch messages on email arrival
  });
};

export const start = async (): Promise<void> => {
  await client.connect();
  logger.info('Connected to email server');
  await client.mailboxOpen(config.mail.mailbox);
  await startListening();
  await fetchMails(); // fetch messages on startup
  client.on('error', async (error) => {
    // restart the client on error
    logger.error(error);
    await client.logout();
    client.close();
    client = new ImapFlow(imapConfig);
    await start();
  });
};

export const fetchMails = async (): Promise<void> => {
  const messages = await client.search({
    seen: false,
    from: 'noreply@discord.com' // only fetch account-related emails from discord
  });
  if (messages.length === 0) return;
  logger.silly(`Received ${messages.length} new emails`);
  for (const messageId of messages) {
    await handleMail(client, messageId.toString());
  }
};

export { client };
