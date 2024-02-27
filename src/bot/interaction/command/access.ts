import {
  type Client,
  SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import database from '@database';
import logger from '@util/log';
import config from '@config';

const data = new SlashCommandBuilder()
  .setName('access')
  .setDescription('Manages user access to the mail system')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('grant')
      .setDescription('Grants a user to interact with the mail system')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to grant access to')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('revoke')
      .setDescription('Revokes a user from interacting with the mail system')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to revoke access from')
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('Lists all users with access')
  );

const handle = async (
  _client: Client,
  interaction: ChatInputCommandInteraction
): Promise<void> => {
  const subcommand = interaction.options.getSubcommand();
  try {
    if (interaction.user.id !== config.discord.owner) {
      await interaction.reply('You do not have permission to use this command');
      return;
    }
    switch (subcommand) {
      case 'grant': {
        await handleGrant(interaction);
        break;
      }
      case 'revoke': {
        await handleRevoke(interaction);
        break;
      }
      case 'list': {
        await handleList(interaction);
        break;
      }
    }
  } catch (error: any) {
    await interaction.reply('There was an error while executing this command');
    logger.error('Error handling access command');
    logger.error(error);
  }
};

const handleGrant = async (
  interaction: ChatInputCommandInteraction
): Promise<void> => {
  const user = interaction.options.getUser('user', true);
  const userAccess = await database.user.findFirst({
    where: { id: user.id }
  });
  if (userAccess !== null) {
    await interaction.reply(`@${user.username} already has access`);
    return;
  }
  await database.user.create({ data: { id: user.id, name: user.username } });
  logger.debug(
    `${interaction.user.username} granted access to ${user.username}`
  );
  await interaction.reply(`@${user.username} has been granted access`);
};

const handleRevoke = async (
  interaction: ChatInputCommandInteraction
): Promise<void> => {
  const user = interaction.options.getUser('user', true);
  const userAccess = await database.user.findFirst({
    where: { id: user.id }
  });
  if (userAccess === null) {
    await interaction.reply(`@${user.username} does not have access`);
    return;
  }
  await database.user.delete({ where: { id: user.id } });
  logger.debug(
    `${interaction.user.username} revoked access from ${user.username}`
  );
  await interaction.reply(`@${user.username} has been revoked access`);
};

const handleList = async (
  interaction: ChatInputCommandInteraction
): Promise<void> => {
  const users = await database.user.findMany();
  if (users.length === 0) {
    await interaction.reply(
      'No users have access to interact with the mail system'
    );
    return;
  }
  const userMentions = users
    .map((user) => `\`${user.name} (${user.id})\``)
    .join(', ');
  await interaction.reply(
    `The following user(s) can interact with the mail system:\n\n${userMentions}`
  );
};

export default { data, handle };
