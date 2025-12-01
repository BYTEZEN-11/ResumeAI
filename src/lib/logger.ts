import pino from "pino";
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  }),
});
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
export function loggerWithRequestId(requestId: string) {
  return logger.child({ requestId: requestId.slice(0, 8) });
}
export type Logger = typeof logger;
