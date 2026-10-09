import winston from "winston";
import moment from "moment-timezone";
const loggerTimeZone = "Asia/Kolkata";

const timeZoned = () => {
    return moment().tz(loggerTimeZone).format("YYYY-MM-DD HH:mm:ss");
};

const transports = [
    new winston.transports.Console({
        level: "silly",
    }),
];

const exceptionHandlers = [
    new winston.transports.Console({
        level: "error",
    }),
];

export const logger = winston.createLogger({
    level: "silly",
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: timeZoned }),
        winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level}: ${message}`;
        })
    ),
    transports,
    exceptionHandlers,
    exitOnError: false,
});