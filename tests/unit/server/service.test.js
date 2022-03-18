import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import { Service } from "../../../server/service.js";
import config from "../../../server/config.js";
import TestUtil from "../_util/testUtil.js";
import fs from "fs";
import fsPromises from "fs/promises";

const {
    dir: { publicDirectory },
} = config;

describe("#Service - test suite for service processing", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("sould create file stream", () => {
        const testStream = TestUtil.generateReadableStream(["test stream"]);

        jest.spyOn(fs, fs.createReadStream.name).mockReturnValue(testStream);

        const service = new Service();
        const testFile = "file.ext";
        const stream = service.createFileStream(testFile);

        expect(stream).toStrictEqual(testStream);
        expect(fs.createReadStream).toHaveBeenCalledWith(testFile);
    });

    test("should call getFileInfo", async() => {
        const fileType = ".ext";
        const testFile = "file.ext";
        const fullFilePath = `${publicDirectory}/${testFile}`;
        jest.spyOn(fsPromises, fsPromises.access.name).mockResolvedValue();

        const service = new Service();
        const result = await service.getFileInfo(testFile);

        expect(result).toStrictEqual({ type: fileType, name: fullFilePath });
    });

    test("should call getFileStream", async() => {
        const testStream = TestUtil.generateReadableStream(["test stream"]);

        const fileType = ".ext";
        const testFile = "file.ext";
        const fullFilePath = `${publicDirectory}/${testFile}`;

        const service = new Service();

        jest
            .spyOn(service, service.getFileInfo.name)
            .mockResolvedValue({ type: fileType, name: fullFilePath });

        jest
            .spyOn(service, service.createFileStream.name)
            .mockReturnValue(testStream);

        const result = await service.getFileStream(testFile);

        expect(result).toStrictEqual({ stream: testStream, type: fileType });
        expect(service.getFileInfo).toHaveBeenCalledWith(testFile);
        expect(service.createFileStream).toHaveBeenCalledWith(fullFilePath);
    });
});