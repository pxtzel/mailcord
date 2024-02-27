import { type CheerioAPI } from 'cheerio';

export class MailHandler {
  constructor(
    public match: RegExp | Array<{ type: string; regex: RegExp }>,
    public name: string
  ) {}

  async handleMail(
    _$: CheerioAPI,
    _email?: string,
    _username?: string,
    _link?: string,
    _date?: Date,
    _type?: string,
    _subject?: string
  ): Promise<void> {
    throw new Error('Not implemented');
  }
}

export class Pattern {
  constructor(
    public type: string,
    public regex: RegExp
  ) {
    return { type, regex };
  }
}
