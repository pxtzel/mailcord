// emails which does not contain any additional data other than the type
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { type CheerioAPI } from 'cheerio';
import dateFns from 'date-fns';
import timeParser from 'parse-human-relative-time/date-fns';
import config from '@config';
import { setCache } from '@util/cache';
import {
  type IShortened,
  generateSecuredShortURL,
  maskIPAddress,
  dateToRelativeDiscord,
  generateRandomString
} from '@util/common';
import { sendToChannel } from '../../bot';
import { MailHandler, Pattern } from './builder';
import logger from '@util/log';

const parseRelativeTime = timeParser(dateFns);
const FIVE_MINUTES = 60 * 1000 * 5;

class Handler extends MailHandler {
  override async handleMail(
    $: CheerioAPI,
    email: string,
    username: string,
    link: string | undefined,
    date: Date,
    type: string
  ): Promise<void> {
    const wrappedUsername = username === 'unknown' ? '' : ` (${username})`;
    const short =
      link === undefined ? undefined : await generateSecuredShortURL(link);
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${email}${wrappedUsername}`
      })
      .setColor(config.theme.default)
      .setTimestamp(date);
    const row = new ActionRowBuilder();
    const otp = $('[style*="font-weight:bold"]')?.text()?.trim();

    switch (type) {
      case 'verify-location': {
        await processVerifyLocation($, embed, row, short, link);
        break;
      }
      case 'violation-warning': {
        await processTOSViolation($, embed);
        break;
      }
      case 'change-mail': {
        await processChangeMail(email, otp, embed, row);
        break;
      }
      case 'otp-backup-server': {
        await processBackupOrServerOtp($, email, otp, embed, row);
        break;
      }
      case 'phone-delete': {
        await processPhoneDelete($, embed);
        break;
      }
      // eslint-disable-next-line sonarjs/no-duplicate-string
      case 'delete-requested':
      case 'delete-inactive': {
        await processAccountDeletion($, embed, row, type);
        break;
      }
      case 'gift-revoke': {
        await processGiftRevoke($, embed);
        break;
      }
      case 'nitro-sub-ending': {
        await processSubscriptionEnding($, embed, row, date);
        break;
      }
      case 'perm-ban': {
        await processPermanentBan($, embed);
        break;
      }
      case 'payment-fail': {
        await processAutoBillingFail($, embed);
        break;
      }
      case 'payment-refund': {
        await processPaymentRefunded($, embed);
        break;
      }
      case 'payment-complete': {
        await processPaymentComplete($, embed, row);
        break;
      }
      case 'trial-receipt': {
        await processTrialReceipt($, embed);
        break;
      }
    }

    const payload: any = {
      embeds: [embed]
    };
    row.components.length > 0 && (payload.components = [row]);

    await sendToChannel(payload);
  }
}

const processVerifyLocation = async (
  $: CheerioAPI,
  embed: EmbedBuilder,
  row: ActionRowBuilder,
  short: IShortened | undefined,
  originalLink: string | undefined
): Promise<void> => {
  if (short == null || originalLink == null) {
    return;
  }
  const ipAddress =
    $.text().match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0] ?? 'unknown';
  const country =
    ($.text().match(/Location: (.+?)\n/)?.[1] ?? 'unknown')
      .split(',')
      .at(-1)
      ?.trim() ?? 'unknown';
  const maskedIP = maskIPAddress(ipAddress);
  const cacheKey = `location.${short.slug}`;
  embed.setTitle('Authorize Login');
  embed.setDescription(
    'A login attempt was made from a new location. Verify the location and the IP address before proceeding'
  );
  embed.addFields(
    { name: 'IP Address', value: maskedIP, inline: true },
    { name: 'Country', value: country, inline: true }
  );
  row.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('Authorize')
      .setCustomId(cacheKey),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Manual')
      .setURL(short.link)
  );
  setCache(cacheKey, originalLink, FIVE_MINUTES);
};

const processTOSViolation = async (
  $: CheerioAPI,
  embed: EmbedBuilder
): Promise<void> => {
  const reason =
    $('p')
      .eq(2)
      .text()
      .match(/Specifically, (.+?)\./)?.[1] ?? 'unknown';
  embed.setDescription(reason);
  embed.setTitle('Warning Received - TOS Violation');
};

const processChangeMail = async (
  email: string,
  otp: string,
  embed: EmbedBuilder,
  row: ActionRowBuilder
): Promise<void> => {
  const cacheKey = `email_change.${email}`;
  setCache(cacheKey, otp, FIVE_MINUTES);
  const maskedOTP = otp.replaceAll(/./g, '\\*');

  embed.addFields({ name: 'OTP', value: maskedOTP });
  embed.setTitle('Email Change Confirmation');
  embed.setDescription(
    'Use the OTP below to authorize the email change\n\n`Expires in Five Minutes`'
  );
  row.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('View Code')
      .setCustomId(cacheKey)
  );
};

const processBackupOrServerOtp = async (
  $: CheerioAPI,
  email: string,
  otp: string,
  embed: EmbedBuilder,
  row: ActionRowBuilder
): Promise<void> => {
  const maskedOTP = otp.replaceAll(/./g, '\\*');

  const type = $.text().includes('backup codes') ? 'backup' : 'ownership';
  const cacheKey = `otp_backup_server.${type === 'backup' ? 'b' : 's'}.${email}`;
  setCache(cacheKey, otp, FIVE_MINUTES);

  embed.addFields({ name: 'OTP', value: maskedOTP });
  embed.setTitle(
    `One-Time Verification for ${type === 'backup' ? 'Backup Codes' : 'Ownership Transfer'}`
  );
  embed.setDescription(
    `Use the OTP below to ${
      type === 'backup'
        ? 'generate backup 2FA codes'
        : 'transfer ownership of a server'
    } of the account\n\n\`Expires in Five Minutes\``
  );
  row.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel('View Code')
      .setCustomId(cacheKey)
  );
};

const processPhoneDelete = async (
  $: CheerioAPI,
  embed: EmbedBuilder
): Promise<void> => {
  const phone =
    $('p')
      ?.text()
      ?.match(/\*{5,15}\d{4}/)?.[0]
      ?.replaceAll(/\*/g, '\\*') ?? 'unknown';

  embed.setTitle('Phone Removed');
  embed.setDescription(
    'The phone number linked to the account has been removed'
  );
  embed.addFields({ name: 'Phone Number', value: phone });
};

const processAccountDeletion = async (
  $: CheerioAPI,
  embed: EmbedBuilder,
  row: ActionRowBuilder,
  type: string
): Promise<void> => {
  const isRequested = type === 'delete-requested';
  const expiryDate = $('p')
    .text()
    .match(/\b\w{3}\s\d{1,2},\s\d{4}\b|\b\d{1,2}\s\w{3}\s\d{4}\b/g)?.[0];
  const dateParsed =
    expiryDate === undefined
      ? 'unknown'
      : dateToRelativeDiscord(new Date(expiryDate));

  embed.setTitle(
    `Account Deletion - ${isRequested ? 'Requested' : 'Inactive'}`
  );
  embed.setDescription(
    isRequested
      ? 'An account deletion has been requested'
      : 'The account has been inactive for a long time. Log in to cancel the deletion'
  );
  embed.addFields({ name: 'Scheduled Date', value: dateParsed });
  embed.setColor(config.theme.error);

  row.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Cancel Deletion')
      .setURL('https://discord.com/login')
  );
};

const processGiftRevoke = async (
  $: CheerioAPI,
  embed: EmbedBuilder
): Promise<void> => {
  const gift =
    $('p')
      .eq(1)
      .text()
      .match(/gift for (.+?) sent/i)?.[1] ?? 'unknown';
  embed.setTitle('Gift Revoked');
  embed.setDescription(`A gift sent to the account has been revoked`);
  embed.addFields({ name: 'Gift', value: gift });
};

const processSubscriptionEnding = async (
  $: CheerioAPI,
  embed: EmbedBuilder,
  row: ActionRowBuilder,
  time: Date
): Promise<void> => {
  const [product, relativeExpiry] = $('p')
    .text()
    .match(
      /Your(?: free trial of)? (\w+ \w+)(?: access)? is about to end (in \d+ \w+)?/
    )
    ?.slice(1) ?? ['unknown', undefined];
  const isTrial = $('p').text().includes('free trial');
  try {
    const relativeDate: Date =
      relativeExpiry !== undefined && parseRelativeTime(relativeExpiry, time);
    const dateParsed =
      relativeDate === undefined
        ? 'unknown'
        : dateToRelativeDiscord(relativeDate);

    embed.setTitle(`${isTrial ? 'Free Trial' : 'Subscription'} Ending`);
    embed.setDescription(
      `An active ${isTrial ? 'Free Trial' : 'Subscription'} on the account will be cancelled soon`
    );
    embed.addFields(
      { name: 'Product', value: product ?? 'unknown', inline: true },
      { name: 'Expiry ', value: dateParsed, inline: true }
    );

    row.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('Renew')
        .setURL('https://discord.com/store')
    );
  } catch (error: any) {
    logger.error(`Error parsing relative time: ${error.message}`);
  }
};

const processPermanentBan = async (
  $: CheerioAPI,
  embed: EmbedBuilder
): Promise<void> => {
  let reason = $('p').eq(2)?.text()?.trim() ?? 'unknown';
  const subReasons = $('ul')
    .eq(0)
    .find('li')
    ?.map((_, element) => `- ${$(element).text()}`)
    .get()
    .join('\n');

  if (subReasons !== undefined) reason += `\n\n${subReasons}`;

  embed.setTitle('Account Permanently Disabled');
  embed.setDescription(reason);
  embed.setColor(config.theme.error);
};

const processAutoBillingFail = async (
  $: CheerioAPI,
  embed: EmbedBuilder
): Promise<void> => {
  const expiryDate = $('p')
    .text()
    .match(/\b\w{3}\s\d{1,2},\s\d{4}\b|\b\d{1,2}\s\w{3}\s\d{4}\b/g)?.[0];
  const dateParsed =
    expiryDate === undefined
      ? 'unknown'
      : dateToRelativeDiscord(new Date(expiryDate));

  embed.setTitle('Automatic Billing Failed');
  embed.setDescription(
    'A payment for a subscription has failed. Please update the payment method to avoid cancellation'
  );
  embed.addFields({ name: 'Expiry Date', value: dateParsed });
  embed.setColor(config.theme.error);
};

const processPaymentRefunded = async (
  $: CheerioAPI,
  embed: EmbedBuilder
): Promise<void> => {
  const [amount, product] = $('p')
    .text()
    .match(/(\$\d+\.\d{2})\sfor\s(.+?)\shas\sbeen\scompleted\./)
    ?.slice(1) ?? [undefined, undefined];

  embed.setTitle('Payment Refunded');
  embed.setDescription(
    `A payment for a purchase has been refunded. The amount will be returned to the payment source`
  );
  embed.addFields(
    { name: 'Amount', value: amount ?? 'unknown', inline: true },
    { name: 'Product', value: product ?? 'unknown', inline: true }
  );
};

const processPaymentComplete = async (
  $: CheerioAPI,
  embed: EmbedBuilder,
  row: ActionRowBuilder
): Promise<void> => {
  const details = $('table')
    .eq(7)
    .find('td')
    .toArray()
    .filter((_, index) => index % 2 !== 0)
    .map((td) => $(td).text().trim() ?? 'unknown');
  const isGift = $.text().includes('gift');

  const [id, purchaseDate, paymentSource, product] = details as [
    string,
    string,
    string,
    string
  ];
  const total = details[isGift ? 4 : 5]!;
  const parsedPurchaseDate = dateToRelativeDiscord(new Date(purchaseDate));

  embed.setTitle(`Purchase Receipt - ${isGift ? 'Gift Code' : 'Subscription'}`);
  embed.addFields(
    { name: 'Purchase ID', value: id, inline: true },
    { name: 'Purchase Date', value: parsedPurchaseDate, inline: true },
    { name: 'Payment Source', value: paymentSource, inline: true },
    { name: 'Product', value: product, inline: true },
    {
      name: 'Total',
      value: total,
      inline: true
    }
  );

  if (isGift) {
    const uid = generateRandomString(5);
    const giftLink = $('[bgcolor="#5865f2"] a').text().trim();
    const code = giftLink.split('/').at(-1) ?? 'unknown';
    const cacheKey = `gift_code.${uid}`;
    setCache(cacheKey, code, FIVE_MINUTES);
    row.addComponents(
      new ButtonBuilder()
        .setLabel('View Gift Code')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(cacheKey)
    );
  }
};

const processTrialReceipt = async (
  $: CheerioAPI,
  embed: EmbedBuilder
): Promise<void> => {
  const details = $('table')
    .eq(7)
    .find('td')
    .toArray()
    .filter((_, index) => index % 2 !== 0 && index !== 3) // remove the total, which is always $0.00 for trials
    .map((td) => $(td).text().trim() ?? 'unknown');
  const isNitro = $.text().includes('supporting Discord');
  const trialType = isNitro ? 'Nitro' : 'Server';

  const [purchaseDate, duration, nextBilling] = details as [
    string,
    string,
    string
  ];
  const parsedPurchaseDate = dateToRelativeDiscord(new Date(purchaseDate));
  const parsedBillingDate = dateToRelativeDiscord(new Date(nextBilling));
  const billingCycle =
    $.text()
      .match(/\bcharge you (\S+\/\S+) until cancellation/)?.[1]
      ?.replace('year', 'y')
      .replace('month', 'm') ?? 'unknown';
  embed.setTitle(`Trial Started - Receipt`);
  embed.addFields(
    { name: 'Duration', value: duration, inline: true },
    { name: 'Type', value: trialType, inline: true },
    { name: 'Billing Cycle', value: billingCycle, inline: true },
    { name: 'Purchase Date', value: parsedPurchaseDate, inline: true },
    { name: 'Next Billing', value: parsedBillingDate, inline: true }
  );
};

const patterns = [
  new Pattern('verify-location', /new location/i),
  new Pattern('violation-warning', /warning.*violation/i),
  new Pattern('perm-ban', /disabled.*violation/i),
  new Pattern('change-mail', /email verification code/i),
  new Pattern('otp-backup-server', /one-time verification/i),
  new Pattern('phone-delete', /phone removed/i),
  new Pattern('delete-inactive', /deletion.*log in to/i),
  new Pattern('delete-requested', /deletion.*log in now/i),
  new Pattern('gift-revoke', /gift revoked/i),
  new Pattern('nitro-sub-ending', /ending|expiring soon/i),
  new Pattern('payment-fail', /payment failed/i),
  new Pattern('payment-refund', /payment refunded/i),
  new Pattern('payment-complete', /(purchase receipt)|(payment succeeded)/i),
  new Pattern('trial-receipt', /trial receipt/i)
];
export default new Handler(patterns, 'DynamicNotificationAction');
