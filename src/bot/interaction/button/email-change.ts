import { type Client, type ButtonInteraction } from 'discord.js';
import { getCache } from '@util/cache';

const data = {
  type: 'email_change'
};

const handle = async (
  _client: Client,
  interaction: ButtonInteraction
): Promise<void> => {
  const cachedCode = getCache(interaction.customId);
  if (cachedCode === undefined) {
    await interaction.reply({
      content: 'This verification has expired from cache',
      ephemeral: true
    });
    return;
  }
  await interaction.reply({
    content: cachedCode,
    ephemeral: true
  });
};

export default { handle, data };
