import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";
import TestUtil from "../_util/testUtil.js";
import { Service } from "../../../server/service.js";
import { Controller } from "../../../server/controller.js";

describe("#Controller - test suite for controller calls", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("#getFileStream", async() => {
        const mockStream = TestUtil.generateReadableStream(["test"]);
        const mockType = ".html";
        const mockFilename = "test.html";

        jest
            .spyOn(Service.prototype, Service.prototype.getFileStream.name)
            .mockResolvedValue({ stream: mockStream, type: mockType });

        const controller = new Controller();
        const { stream, type } = await controller.getFileStream(mockFilename);
        expect(stream).toStrictEqual(mockStream);
        expect(type).toStrictEqual(mockType);
    });

    describe("#handleCommand", () => {
        const controller = new Controller();

        test("given start command it should call startStreamming", async() => {
            const command = { command: "start" };

            jest
                .spyOn(Service.prototype, Service.prototype.startStreamming.name)
                .mockReturnValue();

            const result = await controller.handleCommand(command);
            expect(Service.prototype.startStreamming).toHaveBeenCalled();
            expect(result).toStrictEqual({ result: "Streamming started" });
        });

        test("given stop command it should call stopStreamming", async() => {
            const command = { command: "stop" };
            jest
                .spyOn(Service.prototype, Service.prototype.stopStreamming.name)
                .mockReturnValue();

            const result = await controller.handleCommand(command);
            expect(Service.prototype.stopStreamming).toHaveBeenCalled();
            expect(result).toStrictEqual({ result: "Streamming stopped" });
        });

        test("given any other command it should not call startStreamming nor stopStreamming", async() => {
            const command = { command: "other" };
            jest
                .spyOn(Service.prototype, Service.prototype.stopStreamming.name)
                .mockReturnValue();
            jest
                .spyOn(Service.prototype, Service.prototype.startStreamming.name)
                .mockReturnValue();
            const result = await controller.handleCommand(command);
            expect(Service.prototype.startStreamming).not.toHaveBeenCalled();
            expect(Service.prototype.stopStreamming).not.toHaveBeenCalled();
            expect(result).toStrictEqual({ result: "" });
        });
    });

    test("#createClientStream", async() => {
        const mockStream = TestUtil.generateReadableStream(["test"]);
        const mockId = "123";

        jest
            .spyOn(Service.prototype, Service.prototype.createClientStream.name)
            .mockReturnValue({ id: mockId, clientStream: mockStream });

        jest
            .spyOn(Service.prototype, Service.prototype.removeClientStream.name)
            .mockReturnValue();

        const controller = new Controller();
        const { stream, onClose } = await controller.createClientStream();

        onClose();
        expect(stream).toStrictEqual(mockStream);
        expect(Service.prototype.createClientStream).toHaveBeenCalled();
        expect(Service.prototype.removeClientStream).toHaveBeenCalledWith(mockId);
    });
});