import {
  ActivityType,
  Client,
  IntentsBitField,
  type TextBasedChannel
} from 'discord.js';
import config from '@config';
import logger from '@util/log';
import { registerCommands } from './interaction/command';
import { handleInteraction } from './interaction';

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds]
});

const start = async (): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    void (async () => {
      await client.login(config.discord.token).catch(reject);
      client.once('ready', async () => {
        resolve();
        await onReady();
      });
    })().catch(reject);
  });
};

const onReady = async (): Promise<void> => {
  logger.info(`Connected to Discord as '${client.user?.tag}'`);
  const guild = client.guilds.cache.get(config.discord.guildId);
  const channel = guild?.channels.cache.get(
    config.discord.channelId
  ) as TextBasedChannel;
  if (channel === undefined) {
    logger.error('Could not load Discord channel from config');
    process.exit(1);
  }
  if (guild === undefined) {
    logger.error('Could not load Discord guild from config');
    process.exit(1);
  }

  client.user?.setActivity('my inbox', {
    type: ActivityType.Watching,
    state: `Forwarded 0 emails since startup`
  });

  await registerCommands(client);
};

client.on('interactionCreate', async (interaction) => {
  await handleInteraction(client, interaction);
});

const sendToChannel = async (message: any): Promise<void> => {
  const channel = client.channels.cache.get(config.discord.channelId);
  if (channel?.isTextBased() === true) {
    await channel.send(message as string);
  } else {
    logger.error('Discord channel not found');
  }
};
let emailCount = 0;
let lastActivityUpdate = Date.now();
const updateEmailCountActivity = async (): Promise<void> => {
  emailCount += 1;
  if (Date.now() - lastActivityUpdate < 10_000) return; // minimum 10 seconds between updates
  lastActivityUpdate = Date.now();
  if (client.user === null) return;
  const isPlural = emailCount !== 1;
  client.user.setActivity('my inbox', {
    type: ActivityType.Watching,
    state: `Forwarded ${emailCount} email${isPlural ? 's' : ''} since startup`
  });
};

export { client, start, sendToChannel, updateEmailCountActivity };
