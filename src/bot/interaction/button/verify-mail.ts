import { type Client, type ButtonInteraction } from 'discord.js';
import logger from '@util/log';
const data = {
  type: 'email_verify'
};

const handle = async (
  _client: Client,
  interaction: ButtonInteraction
): Promise<void> => {
  try {
    await interaction.reply({
      content: 'This feature is not yet implemented. Please try again later.',
      ephemeral: true
    });
  } catch (error: any) {
    await interaction.reply({
      content: 'There was an error while executing this button',
      ephemeral: true
    });
    logger.error('Error handling verify-login button interaction');
    logger.error(error);
  }
};

export default { handle, data };
