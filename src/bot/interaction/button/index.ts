import {
  EmbedBuilder,
  type ButtonInteraction,
  type Client,
  type APIEmbed,
  type ButtonBuilder,
  ActionRowBuilder
} from 'discord.js';
import logger from '@util/log';
import database from '@database';
import verifyLoginButton from './verify-login';
import verifyMail from './verify-mail';
import emailChange from './email-change';
import twofaServerOtp from './twofa-server-otp';
import giftCode from './gift-code';
import verifyPurchase from './verify-purchase';

const buttons = [
  emailChange,
  giftCode,
  twofaServerOtp,
  verifyLoginButton,
  verifyMail,
  verifyPurchase
];

export const handleButton = async (
  client: Client,
  interaction: ButtonInteraction
): Promise<void> => {
  try {
    const userHasAccess = await database.user.findFirst({
      where: {
        id: interaction.user.id
      }
    });
    if (userHasAccess == null) {
      await interaction.reply({
        content: 'You do not have access to interact with the mail system',
        ephemeral: true
      });
      return;
    }

    const [command, code] = interaction.customId
      .split(/\.(.+)/, 2)
      .filter(Boolean) as [string, string];
    const button = buttons.find((b) => b.data.type === command);
    if (button === undefined) {
      await interaction.reply({
        content: 'This button is not supported',
        ephemeral: true
      });
      return;
    }
    const embed = new EmbedBuilder(interaction.message.embeds[0] as APIEmbed);
    const row = new ActionRowBuilder<ButtonBuilder>(
      interaction.message.components[0]?.toJSON()
    );
    await button.handle(client, interaction, code, embed, row);
  } catch (error: any) {
    logger.error(`Error handling button interaction: ${error.message}`);
  }
};
