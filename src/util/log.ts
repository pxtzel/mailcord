import { createLogger, format, transports } from 'winston';
import config from '@config';

const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `[${new Date(
    timestamp as number
  ).toLocaleString()}] [${level.toUpperCase()}]: ${typeof message === 'object' ? JSON.stringify(message) : message}`;
});

const errorFormat = format((info) => {
  if (info.level === 'error' && 'stack' in info) {
    return Object.assign({}, info, {
      message: config.isProduction ? info.message : info['stack']
    });
  }
  return info;
});

const logger = createLogger({
  level: config.log.level,
  format: combine(timestamp(), errorFormat(), myFormat),
  transports: [
    new transports.Console({
      format: combine(timestamp(), myFormat)
    })
  ]
});

export default logger;
