import {
  SlashCommandBuilder,
  type Client,
  type ChatInputCommandInteraction
} from 'discord.js';
import accessCmd from './access';
import logger from '@util/log';
import config from '@config';

const pingCmd = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Pong!'),
  handle: async (_client: Client, interaction: ChatInputCommandInteraction) => {
    await interaction.reply('Pong!');
  }
};

const commands = [pingCmd, accessCmd];

const handleCommand = async (
  client: Client,
  interaction: ChatInputCommandInteraction
): Promise<void> => {
  const { commandName } = interaction;

  try {
    const command = commands.find((cmd) => cmd.data.name === commandName);
    if (command === undefined) {
      throw new Error('Unknown command');
    }
    await command.handle(client, interaction);
  } catch (error: any) {
    logger.error('Error handling command', error.message);
    await interaction.reply({
      content: 'There was an error while executing this command!',
      ephemeral: true
    });
  }
};

const registerCommands = async (client: Client): Promise<void> => {
  const guild = client.guilds.cache.get(config.discord.guildId)!;

  await guild.commands
    .set(commands.map((cmd) => cmd.data))
    .then(() => {
      logger.debug(`Registered ${commands.length} commands`);
    })
    .catch((error: any) => {
      logger.error(`Error registering commands: ${error.message}`);
    });
};

export { registerCommands, handleCommand };
