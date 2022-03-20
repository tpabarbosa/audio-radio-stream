import server from "./server.js";
import { logger } from "./util.js";
import config from "./config.js";

server
    .listen(config.port)
    .on("listening", () => logger.info(`listening on port: ${config.port}`));

process.on("uncaughtException", (error) =>
    logger.error(`uncaughtException: ${error.stack || error}`)
);
process.on("unhandledRejection", (error) =>
    logger.error(`unhandledRejection: ${error.stack || error}`)
);