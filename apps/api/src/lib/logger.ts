import pino from "pino";

// Do not import the validated env module here: logging is used while booting.
const isDev = process.env.NODE_ENV !== "production";
export const logger = pino({
  level: isDev ? "debug" : "info",

  transport:
    isDev
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});
