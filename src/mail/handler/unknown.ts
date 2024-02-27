// emails which does not contain any additional data other than the type
import { EmbedBuilder } from 'discord.js';
import { MailHandler } from './builder';
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
    _type: string,
    subject: string
  ): Promise<void> {
    const wrappedUsername = username === 'unknown' ? '' : ` (${username})`;
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${email}${wrappedUsername}`
      })
      .setTitle('Received an unknown email type')
      .setColor(config.theme.warning)
      .setDescription(subject)
      .setTimestamp();

    await sendToChannel({
      embeds: [embed]
    });
  }
}

const patterns = /.*/;
export default new Handler(patterns, 'Unknown');
