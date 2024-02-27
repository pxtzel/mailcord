import config from '@config';
import axios from 'axios';

interface IShortened {
  slug: string;
  link: string;
  password: string;
}

const generateSecuredShortURL = async (url: string): Promise<IShortened> => {
  const password = config.shortenerPassword;
  const slug = `mc-${generateRandomString(5, CharDictionary.lower + CharDictionary.number)}`;
  await axios.post(
    'https://maglit.me/api/create',
    { link: url, slug, password },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    }
  );

  const link = `https://maglit.me/${slug}`;
  return { slug, link, password };
};
const expandTrackingURL = async (url: string): Promise<string> => {
  if (!url.startsWith('https://click.discord.com')) return url;
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Cookie: 'mc=1'
    }
  });
  return response.request.res.responseUrl;
};

const expandMaglitURL = async (slug: string): Promise<string> => {
  slug = slug.replace('https://maglit.me/', '');
  const response = await axios.post('https://maglit.me/api/verify', {
    slug,
    password: config.shortenerPassword
  });
  return response.data.linkData.link;
};

enum CharDictionary {
  lower = 'abcdefghijklmnopqrstuvwxyz',
  upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  number = '0123456789'
}

const generateRandomString = (
  length: number,
  charDict = CharDictionary.lower + CharDictionary.upper + CharDictionary.number
): string => {
  let result = '';
  for (let index = 0; index < length; index++) {
    result += charDict[Math.floor(Math.random() * charDict.length)];
  }
  return result;
};

const maskIPAddress = (ip: string): string => {
  const ipParts = ip.split('.');
  return (
    ipParts.slice(0, 2).join('.') +
    '.' +
    ipParts
      .slice(2, 4)
      .map((part) => part.replaceAll(/\d/g, 'x'))
      .join('.')
  );
};

const dateToRelativeDiscord = (date: Date): string =>
  `<t:${Math.floor(+date / 1000)}:R>`;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export {
  generateSecuredShortURL,
  generateRandomString,
  expandTrackingURL,
  expandMaglitURL,
  maskIPAddress,
  sleep,
  dateToRelativeDiscord,
  CharDictionary,
  type IShortened
};
