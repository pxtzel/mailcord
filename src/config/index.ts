import config from 'config';

const environment =
  process.env['NODE_ENV'] === 'production' ? 'production' : 'development';
type Color = `#${string}`;

export default {
  mail: {
    imap: {
      user: process.env['IMAP_USER']!,
      password: process.env['IMAP_PASSWORD']!,
      host: config.get<string>('mail.imap.host'),
      port: config.get<number>('mail.imap.port'),
      secure: config.get<boolean>('mail.imap.secure'),
      authTimeout: config.get<number>('mail.imap.authTimeout')
    },
    mailbox: config.get<string>('mail.mailbox'),
    handleUnknown: config.get<boolean>('mail.handleUnknown'),
    blacklist: config.get<string[]>('mail.blacklist')
  },
  shortenerPassword: process.env['SHORTENER_PASSWORD']!,
  discord: {
    token: process.env['DISCORD_TOKEN']!,
    channelId: config.get<string>('discord.channelId'),
    guildId: config.get<string>('discord.guildId'),
    owner: config.get<string>('discord.owner')
  },
  log: {
    level: config.get<string>('log.level')
  },
  environment,
  isProduction: environment === 'production',
  theme: {
    default: config.get<Color>('theme.default'),
    success: config.get<Color>('theme.success'),
    error: config.get<Color>('theme.error'),
    warning: config.get<Color>('theme.warning')
  }
};
