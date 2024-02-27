import {
  type Client,
  type ButtonInteraction,
  type EmbedBuilder,
  type ActionRowBuilder,
  type ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import logger from '@util/log';
import axios from 'axios';
import { expandMaglitURL } from '@util/common';
import { getCache } from '@util/cache';

const data = {
  type: 'location'
};

const handle = async (
  _client: Client,
  interaction: ButtonInteraction,
  slug: string,
  embed: EmbedBuilder,
  row: ActionRowBuilder<ButtonBuilder>
): Promise<void> => {
  try {
    row.components[0]!.setDisabled(true); // disable while loading
    row.components[0]!.setLabel('Authorizing...');
    await interaction.update({
      embeds: [embed],
      components: [row]
    });

    const cachedAuthURL = getCache(interaction.customId);
    const authURL = cachedAuthURL ?? (await expandMaglitURL(slug));
    const authToken = authURL.split('=')[1];
    await axios
      .post(
        'https://discord.com/api/v9/auth/authorize-ip',
        {
          token: authToken
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      .then(async () => {
        row.components[0]!.setDisabled(true);
        row.components[0]!.setStyle(ButtonStyle.Success);
        row.components[0]!.setLabel(
          `Authorized by ${interaction.user.username}`
        );
        await interaction.editReply({
          embeds: [embed],
          components: [row]
        });
      })
      .catch(async () => {
        row.components[0]!.setDisabled(true);
        row.components[0]!.setStyle(ButtonStyle.Danger);
        row.components[0]!.setLabel('Authorization Failed');

        await interaction.editReply({
          embeds: [embed],
          components: [row]
        });
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
