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

    test("should call getFileStream", async() => {
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
});