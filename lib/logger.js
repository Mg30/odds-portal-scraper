import winston from 'winston';

// Define the logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => {
      return `${info.timestamp} - ${info.level.toUpperCase()} - ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
  ]
});

export default logger