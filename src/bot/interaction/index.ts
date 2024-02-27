import { type Client, type Interaction } from 'discord.js';
import { handleCommand } from './command';
import { handleButton } from './button';
import logger from '@util/log';

export const handleInteraction = async (
  client: Client,
  interaction: Interaction
): Promise<void> => {
  if (interaction.isChatInputCommand()) {
    await handleCommand(client, interaction);
    return;
  } else if (interaction.isButton()) {
    await handleButton(client, interaction);
    return;
  }

  logger.warn('Received an unhandled interaction type');
  if (interaction.isRepliable()) {
    await interaction.reply('Unable to handle this interaction');
  }
};
