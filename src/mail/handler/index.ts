import { load } from 'cheerio';
import { type ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import logger from '@util/log';
import StaticNotification from './static-notification';
import SecureButton from './secure-button';
import DynamicNotification from './dynamic-notification';
import UnknownMail from './unknown';
import { updateEmailCountActivity } from '../../bot';
import { expandTrackingURL } from '@util/common';
import config from '@config';

const handlers = [StaticNotification, SecureButton, DynamicNotification];

const handleMail = async (
  client: ImapFlow,
  messageId: string
): Promise<void> => {
  const message = await client.fetchOne(messageId, {
    envelope: true,
    source: true
  });
  const { subject = 'none', date: time, to } = message.envelope;
  const isBlacklisted = config.mail.blacklist.some((subjectRegex) =>
    new RegExp(subjectRegex, 'i').test(subject)
  );
  if (isBlacklisted) {
    logger.debug(`Email with subject: \`${subject}\` is blacklisted`);
    await client.messageFlagsAdd(messageId, ['\\Seen']);
    return;
  }
  const accountEmail = to[0]?.address ?? 'unknown';
  const parsed = await simpleParser(message.source);
  const $ = load(parsed.html.toString());
  const rawLink = $('td[bgcolor="#5865f2"] a').attr('href'); // extract the link from blue button
  const link =
    rawLink?.includes('click.discord.com') === undefined
      ? rawLink
      : await expandTrackingURL(rawLink);
  const userElement = $('h2')?.length > 0 ? $('h2') : $('p');
  const username =
    userElement
      ?.text()
      .match(
        /(?:hey\s+there,\s+|hey,?\s+|hi\s+|thank you,\s+|what's\s+up\s+)(.+?)(?=[!,?])/i
      )?.[1] ?? 'unknown';
  // regex to extract the username from the greeting
  // either from the first h2 or p tag
  // using p tag may cause unwanted results

  let handled = false;
  for (const handler of handlers) {
    const patterns = Array.isArray(handler.match)
      ? handler.match
      : [{ type: 'default', regex: handler.match }];
    const patternMatched = patterns.find((pattern) =>
      pattern.regex.test(subject)
    );
    if (patternMatched !== undefined) {
      try {
        await handler.handleMail(
          $,
          accountEmail,
          username,
          link,
          time,
          patternMatched.type
        );
        logger.debug(
          `Handled email with subject: \`${subject}\` using \`${handler.name}\` handler`
        );
      } catch (error: any) {
        logger.error(
          `Error handling \`${handler.name}\` (${patternMatched.type}): ${error.message}`
        );
        logger.error(error);
      }
      handled = true;
      break; // only one handler should handle the email
    }
  }
  if (!handled) {
    if (config.mail.handleUnknown) {
      await UnknownMail.handleMail(
        $,
        accountEmail,
        username,
        link,
        time,
        '',
        subject
      );
    } else {
      logger.debug(`Email with subject: \`${subject}\` was not handled `);
      return;
    }
  }
  await updateEmailCountActivity(); // update the bot's activity
  await client.messageFlagsAdd(messageId, ['\\Seen']);
};

export { handleMail, handlers };
