import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import { Service } from "../../../server/service.js";
import config from "../../../server/config.js";
import TestUtil from "../_util/testUtil.js";
import fs from "fs";
import fsPromises from "fs/promises";
import { PassThrough, Writable } from "stream";
import Throttle from "throttle";
import childProcess from "child_process";
import streamsPromises from "stream/promises";

const {
    dir: { publicDirectory, fxDirectory },
    constants: { fallbackBitRate, bitRateDivisor },
} = config;

describe("#Service - test suite for service processing", () => {
    const getSpawnResponse = ({
        stdout = "",
        stderr = "",
        stdin = () => {},
    }) => ({
        stdout: TestUtil.generateReadableStream([stdout]),
        stderr: TestUtil.generateReadableStream([stderr]),
        stdin: TestUtil.generateWritableStream(stdin),
    });

    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("#createFileStream", () => {
        const testStream = TestUtil.generateReadableStream(["test stream"]);

        jest.spyOn(fs, fs.createReadStream.name).mockReturnValue(testStream);

        const service = new Service();
        const testFile = "file.ext";
        const stream = service.createFileStream(testFile);

        expect(stream).toStrictEqual(testStream);
        expect(fs.createReadStream).toHaveBeenCalledWith(testFile);
    });

    test("#getFileInfo", async() => {
        const fileType = ".ext";
        const testFile = "file.ext";
        const fullFilePath = `${publicDirectory}/${testFile}`;
        jest.spyOn(fsPromises, fsPromises.access.name).mockResolvedValue();

        const service = new Service();
        const result = await service.getFileInfo(testFile);

        expect(result).toStrictEqual({ type: fileType, name: fullFilePath });
    });

    test("#getFileStream", async() => {
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

    test("#createClientStream", () => {
        const service = new Service();
        jest
            .spyOn(service.clientStreams, service.clientStreams.set.name)
            .mockReturnValue();

        const { id, clientStream } = service.createClientStream();

        expect(id.length).toBeGreaterThan(0);
        expect(clientStream).toBeInstanceOf(PassThrough);
        expect(service.clientStreams.set).toHaveBeenCalledWith(id, clientStream);
    });

    test("#removeClientStream", () => {
        const service = new Service();
        const id = "123";
        jest
            .spyOn(service.clientStreams, service.clientStreams.delete.name)
            .mockReturnValue();

        service.removeClientStream(id);
        expect(service.clientStreams.delete).toHaveBeenCalledWith(id);
    });

    test("#_executeSoxCommand", () => {
        const service = new Service();
        const args = ["test"];
        const output = {
            stdout: "ok",
        };

        jest.spyOn(childProcess, childProcess.spawn.name).mockReturnValue(output);

        const result = service._executeSoxCommand(args);

        expect(childProcess.spawn).toHaveBeenCalledWith("sox", args);
        expect(result.stdout).toStrictEqual("ok");
    });

    describe("#getBitRate", () => {
        const song = "mySong";
        const service = new Service();

        test("it should return the bitRate as string", async() => {
            const spawnResponse = getSpawnResponse({
                stdout: "  1k  ",
            });
            jest
                .spyOn(service, service._executeSoxCommand.name)
                .mockReturnValue(spawnResponse);

            const result = await service.getBitRate(song);
            expect(result).toStrictEqual("1000");
            expect(service._executeSoxCommand).toHaveBeenCalledWith([
                "--i",
                "-B",
                song,
            ]);
        });

        test("when an error ocurr it should get the fallbackBitRate", async() => {
            const spawnResponse = getSpawnResponse({
                stderr: "error",
            });
            jest
                .spyOn(service, service._executeSoxCommand.name)
                .mockReturnValue(spawnResponse);

            const result = await service.getBitRate(song);
            expect(result).toStrictEqual(fallbackBitRate);
            expect(service._executeSoxCommand).toHaveBeenCalledWith([
                "--i",
                "-B",
                song,
            ]);
        });
    });

    test("#broadCast - should write only for active client streams", () => {
        const service = new Service();
        const onData = jest.fn();
        const client1 = TestUtil.generateWritableStream(onData);
        const client2 = TestUtil.generateWritableStream(onData);
        jest.spyOn(service.clientStreams, service.clientStreams.delete.name);

        service.clientStreams.set("1", client1);
        service.clientStreams.set("2", client2);
        client2.end();

        const writable = service.broadCast();
        // vai mandar somente para o client1 pq o outro desconectou
        writable.write("Hello World");

        expect(writable).toBeInstanceOf(Writable);
        expect(service.clientStreams.delete).toHaveBeenCalledWith("2");
        expect(onData).toHaveBeenCalledTimes(1);
    });

    describe("#stopStreamming", () => {
        test("it should stop streamming if throttleTransform exists", () => {
            const service = new Service();
            service.throttleTransform = new Throttle(1);

            jest.spyOn(service.throttleTransform, "end").mockReturnValue();

            service.stopStreamming();
            expect(service.throttleTransform.end).toHaveBeenCalled();
        });
        test("it should do nothing if throttleTransform doesn´t exists", () => {
            const service = new Service();
            expect(() => service.stopStreamming()).not.toThrow();
        });
    });

    test("#startStreamming", async() => {
        const currentSong = "mySong.mp3";
        const service = new Service();
        service.currentSong = currentSong;
        const currentReadable = TestUtil.generateReadableStream(["test"]);
        const expectedResult = "ok";
        const writableBroadCaster = TestUtil.generateWritableStream(() => {});

        jest
            .spyOn(service, service.getBitRate.name)
            .mockResolvedValue(fallbackBitRate);

        jest
            .spyOn(streamsPromises, streamsPromises.pipeline.name)
            .mockResolvedValue(expectedResult);

        jest
            .spyOn(service, service.createFileStream.name)
            .mockReturnValue(currentReadable);

        jest
            .spyOn(service, service.broadCast.name)
            .mockReturnValue(writableBroadCaster);

        const expectedThrottle = fallbackBitRate / bitRateDivisor;
        const result = await service.startStreamming();

        expect(service.currentBitRate).toEqual(expectedThrottle);
        expect(result).toEqual(expectedResult);

        expect(service.getBitRate).toHaveBeenCalledWith(currentSong);
        expect(service.createFileStream).toHaveBeenCalledWith(currentSong);
        expect(streamsPromises.pipeline).toHaveBeenCalledWith(
            currentReadable,
            service.throttleTransform,
            service.broadCast()
        );
    });

    describe("#readFxByName", () => {
        const fxFile = "test_sound_effect_file.mp3";

        test("given an existent name", async() => {
            const fxName = "test";
            const service = new Service();
            jest
                .spyOn(fsPromises, fsPromises.readdir.name)
                .mockResolvedValue([fxFile]);

            const result = await service.readFxByName(fxName);

            expect(result).toStrictEqual(`${fxDirectory}/${fxFile}`);
            expect(fsPromises.readdir).toHaveBeenCalledWith(fxDirectory);
        });

        test("given an inexistent name", async() => {
            const fxName = "inexistent _name";
            const service = new Service();
            jest
                .spyOn(fsPromises, fsPromises.readdir.name)
                .mockResolvedValue([fxFile]);

            expect(service.readFxByName(fxName)).rejects.toEqual(
                `The sound effect '${fxName}' was not found!`
            );
            expect(fsPromises.readdir).toHaveBeenCalledWith(fxDirectory);
        });
    });

    test("#mergeAudioStreams", async() => {
        const currentFx = "fx.mp3";
        const service = new Service();
        const currentReadable = TestUtil.generateReadableStream(["abc"]);
        const spawnResponse = getSpawnResponse({
            stdout: "1k",
            stdin: "myFx",
        });

        jest
            .spyOn(service, service._executeSoxCommand.name)
            .mockReturnValue(spawnResponse);

        jest
            .spyOn(streamsPromises, streamsPromises.pipeline.name)
            .mockResolvedValue();

        const result = service.mergeAudioStreams(currentFx, currentReadable);

        const [call1, call2] = streamsPromises.pipeline.mock.calls;

        const [readableCall, stdinCall] = call1;
        expect(readableCall).toStrictEqual(currentReadable);
        expect(stdinCall).toStrictEqual(spawnResponse.stdin);

        const [stdoutCall, transformStream] = call2;
        expect(stdoutCall).toStrictEqual(spawnResponse.stdout);
        expect(transformStream).toBeInstanceOf(PassThrough);

        expect(result).toBeInstanceOf(PassThrough);
    });

    test("#appendFxStream", async() => {
        const currentFx = "fx.mp3";
        const service = new Service();
        service.throttleTransform = new PassThrough();
        service.currentReadable = TestUtil.generateReadableStream(["abc"]);

        const mergedthrottleTransformMock = new PassThrough();
        const expectedFirstCallResult = "ok1";
        const expectedSecondCallResult = "ok2";
        const writableBroadCaster = TestUtil.generateWritableStream(() => {});

        jest
            .spyOn(streamsPromises, streamsPromises.pipeline.name)
            .mockResolvedValueOnce(expectedFirstCallResult)
            .mockResolvedValueOnce(expectedSecondCallResult);

        jest
            .spyOn(service, service.broadCast.name)
            .mockReturnValue(writableBroadCaster);

        jest
            .spyOn(service, service.mergeAudioStreams.name)
            .mockReturnValue(mergedthrottleTransformMock);

        jest.spyOn(mergedthrottleTransformMock, "removeListener").mockReturnValue();

        jest.spyOn(service.throttleTransform, "pause");

        jest.spyOn(service.currentReadable, "unpipe").mockImplementation();

        service.appendFxStream(currentFx);

        expect(service.throttleTransform.pause).toHaveBeenCalled();
        expect(service.currentReadable.unpipe).toHaveBeenCalledWith(
            service.throttleTransform
        );

        service.throttleTransform.emit("unpipe");

        const [call1, call2] = streamsPromises.pipeline.mock.calls;
        const [resultCall1, resultCall2] = streamsPromises.pipeline.mock.results;

        const [throttleTransformCall1, broadCastCall1] = call1;
        expect(throttleTransformCall1).toBeInstanceOf(Throttle);
        expect(broadCastCall1).toStrictEqual(writableBroadCaster);

        const [result1, result2] = await Promise.all([
            resultCall1.value,
            resultCall2.value,
        ]);

        expect(result1).toStrictEqual(expectedFirstCallResult);
        expect(result2).toStrictEqual(expectedSecondCallResult);

        const [mergedStreamCall2, throttleTransformCall2] = call2;
        expect(mergedStreamCall2).toStrictEqual(mergedthrottleTransformMock);
        expect(throttleTransformCall2).toBeInstanceOf(Throttle);
        expect(service.currentReadable.removeListener).toHaveBeenCalled();
    });
});