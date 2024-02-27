// emails which does not contain any additional data other than the type
import {
  type ColorResolvable,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { MailHandler, Pattern } from './builder';
import { type CheerioAPI } from 'cheerio';
import config from '@config';
import { sendToChannel } from '../../bot';
import { type IShortened, generateSecuredShortURL } from '@util/common';
import { setCache } from '@util/cache';

const MANUAL = 'Manual';

class Handler extends MailHandler {
  override async handleMail(
    _$: CheerioAPI,
    email: string,
    username: string,
    link: string | undefined,
    _date: Date,
    type: string
  ): Promise<void> {
    const wrappedUsername = username === 'unknown' ? '' : ` (${username})`;
    const short =
      link === undefined ? undefined : await generateSecuredShortURL(link);
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
      'verify-mail': {
        title: 'Email Verification',
        description: 'Verify the email address for the account'
      },
      'pass-reset': {
        title: 'Password Reset Requested',
        description:
          'Reset the password for the account\n\n(Auto reset is not implemented yet)'
      },
      'authorize-payment': {
        title: 'Authorize Payment',
        description: 'A purchase is being made with the account'
      },
      'suspicious-locked': {
        title: 'Account Locked',
        description: 'The account has been locked due to suspicious activity'
      }
    };

    switch (type) {
      case 'verify-mail': {
        await processVerifyMail(row, short);
        break;
      }
      case 'pass-reset': {
        await processPassReset(row, short);
        break;
      }
      case 'authorize-payment': {
        await processAuthorizePayment(row, short, link!);
        break;
      }
      case 'suspicious-locked': {
        await processSuspiciousLocked(row, short);
        break;
      }
    }

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

const processVerifyMail = async (
  row: ActionRowBuilder,
  short: IShortened | undefined
): Promise<void> => {
  if (short == null) {
    return;
  }
  row.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('Verify')
      .setCustomId(`email_verify.${short.slug}`)
      .setDisabled(true),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel(MANUAL)
      .setURL(short.link)
  );
};

const processPassReset = async (
  row: ActionRowBuilder,
  short: IShortened | undefined
): Promise<void> => {
  if (short == null) {
    return;
  }
  row.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('Set Password')
      .setCustomId(`pass_${short.slug}`)
      .setDisabled(true),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel(MANUAL)
      .setURL(short.link ?? '')
  );
};

const processAuthorizePayment = async (
  row: ActionRowBuilder,
  short: IShortened | undefined,
  originalLink: string
): Promise<void> => {
  if (short == null) {
    return;
  }
  const cacheKey = `payment_auth.${short?.slug}`;
  setCache(cacheKey, originalLink);
  row.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('Authorize')
      .setCustomId(cacheKey),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel(MANUAL)
      .setURL(short?.link ?? '')
  );
};

const processSuspiciousLocked = async (
  row: ActionRowBuilder,
  short: IShortened | undefined
): Promise<void> => {
  if (short == null) {
    return;
  }
  row.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('Reset Password')
      .setCustomId(`susp_${short.slug}`)
      .setDisabled(true),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel(MANUAL)
      .setURL(short.link)
  );
};

const patterns = [
  new Pattern('verify-mail', /verify email/i),
  new Pattern('pass-reset', /password reset/i),
  new Pattern('authorize-payment', /authorize payment/i),
  new Pattern('suspicious-locked', /suspicious activity/i)
];
export default new Handler(patterns, 'SecureButtonAction');
