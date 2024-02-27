// emails which does not contain any additional data other than the type
import {
  type ColorResolvable,
  EmbedBuilder,
  ActionRowBuilder
} from 'discord.js';
import { MailHandler, Pattern } from './builder';
import { type CheerioAPI } from 'cheerio';
import config from '@config';
import { sendToChannel } from '../../bot';

class Handler extends MailHandler {
  override async handleMail(
    _$: CheerioAPI,
    email: string,
    username: string,
    _link: string | undefined,
    _date: Date,
    type: string
  ): Promise<void> {
    const wrappedUsername = username === 'unknown' ? '' : ` (${username})`;
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${email}${wrappedUsername}`
      })
      .setTimestamp();
    const row = new ActionRowBuilder();

    const data: Record<
      typeof type,
      { title: string; color?: string; description?: string }
    > = {
      'pass-change': {
        title: 'Password Changed',
        description: 'The password for the account has been changed'
      },
      'email-change': {
        title: 'Email Changed',
        description: 'The email for the account has been changed'
      },
      'dev-revoke': {
        title: 'Developer Badge Revoked',
        description:
          'The Active Developer badge for the account has been revoked due to the absence of an active app'
      }
    };
    const { title, color, description } = data[type]!;
    if (description !== undefined) {
      embed.setDescription(description);
    }
    if (title !== undefined) {
      embed.setTitle(title);
    }
    embed.setColor((color as ColorResolvable) ?? config.theme.default);

    const payload: any = {
      embeds: [embed]
    };
    row.components.length > 0 && (payload.components = [row]);

    await sendToChannel(payload);
  }
}

const patterns = [
  new Pattern('pass-change', /password changed/i),
  new Pattern('email-change', /address changed/i),
  new Pattern('dev-revoke', /developer removal/i)
];
export default new Handler(patterns, 'StaticNotification');
