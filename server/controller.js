import { Service } from "./service.js";
import { logger } from "./util.js";

export class Controller {
    constructor() {
        this.service = new Service();
    }

    async getFileStream(filename) {
        return this.service.getFileStream(filename);
    }

    async handleCommand({ command }) {
        logger.info(`Command received: ${command}`);
        const cmd = command.toLowerCase();

        if (cmd.includes("start")) {
            this.service.startStreamming();
            return { result: "Streamming started" };
        }
        if (cmd.includes("stop")) {
            this.service.stopStreamming();
            return { result: "Streamming stopped" };
        }

        const chosenFx = await this.service.readFxByName(cmd);
        if (chosenFx) {
            logger.info(`Added sound effect to service: ${chosenFx}`);
            this.service.appendFxStream(chosenFx);
            return { result: `Sound effect: ${chosenFx}` };
        }

        return { result: "" };
    }

    createClientStream() {
        const { id, clientStream } = this.service.createClientStream();

        const onClose = () => {
            logger.info(`closing connection of ${id}`);
            this.service.removeClientStream(id);
        };

        return {
            stream: clientStream,
            onClose,
        };
    }
}