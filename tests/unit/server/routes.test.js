import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import config from "../../../server/config.js";

import { handler } from "../../../server/routes.js";

import TestUtil from "../_util/testUtil.js";
import { Controller } from "../../../server/controller.js";

const {
    pages,
    location,
    constants: { CONTENT_TYPE },
} = config;

describe("#Routes - test suite for api response", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test("GET / - should redirect to homepage", async() => {
        const params = TestUtil.defaultHandleParams();
        params.request.method = "GET";
        params.request.url = "/";

        await handler(...params.values());
        expect(params.response.writeHead).toBeCalledWith(302, {
            Location: location.home,
        });
        expect(params.response.end).toHaveBeenCalled();
    });

    test(`GET /home - should response with ${pages.homeHTML} file stream`, async() => {
        const params = TestUtil.defaultHandleParams();
        params.request.method = "GET";
        params.request.url = "/home";

        const mockFileStream = TestUtil.generateReadableStream(["data"]);
        jest
            .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
            .mockResolvedValue({
                stream: mockFileStream,
            });

        jest.spyOn(mockFileStream, "pipe").mockReturnValue();
        await handler(...params.values());

        expect(Controller.prototype.getFileStream).toBeCalledWith(pages.homeHTML);
        expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    });

    test(`GET /controller - should response with ${pages.controllerHTML} file stream`, async() => {
        const params = TestUtil.defaultHandleParams();
        params.request.method = "GET";
        params.request.url = "/controller";

        const mockFileStream = TestUtil.generateReadableStream(["data"]);
        jest
            .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
            .mockResolvedValue({
                stream: mockFileStream,
            });

        jest.spyOn(mockFileStream, "pipe").mockReturnValue();
        await handler(...params.values());

        expect(Controller.prototype.getFileStream).toBeCalledWith(
            pages.controllerHTML
        );
        expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    });

    test(`GET /index.html - should response with file stream`, async() => {
        const params = TestUtil.defaultHandleParams();
        const filename = "/index.html";
        params.request.method = "GET";
        params.request.url = filename;

        const expectType = ".html";
        const mockFileStream = TestUtil.generateReadableStream(["data"]);
        jest
            .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
            .mockResolvedValue({
                stream: mockFileStream,
                type: expectType,
            });

        jest.spyOn(mockFileStream, "pipe").mockReturnValue();
        await handler(...params.values());

        expect(Controller.prototype.getFileStream).toBeCalledWith(filename);
        expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
        expect(params.response.writeHead).toHaveBeenCalledWith(200, {
            "Content-Type": CONTENT_TYPE[expectType],
        });
    });

    test(`GET /file.ext - should response with file stream`, async() => {
        const params = TestUtil.defaultHandleParams();
        const filename = "/file.ext";
        params.request.method = "GET";
        params.request.url = filename;

        const expectType = ".ext";
        const mockFileStream = TestUtil.generateReadableStream(["data"]);
        jest
            .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
            .mockResolvedValue({
                stream: mockFileStream,
                type: expectType,
            });

        jest.spyOn(mockFileStream, "pipe").mockReturnValue();
        await handler(...params.values());

        expect(Controller.prototype.getFileStream).toBeCalledWith(filename);
        expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
        expect(params.response.writeHead).not.toHaveBeenCalledWith();
    });

    test(`POST /unknown - given an inexistent route it should response with 404`, async() => {
        const params = TestUtil.defaultHandleParams();
        const filename = "/unknown";
        params.request.method = "POST";
        params.request.url = filename;

        await handler(...params.values());

        expect(params.response.writeHead).toHaveBeenCalledWith(404);
        expect(params.response.end).toHaveBeenCalled();
    });

    test("GET /stream?id=123 - should call createClientStream", async() => {
        const params = TestUtil.defaultHandleParams();
        params.request.method = "GET";
        params.request.url = "/stream?id=123";

        const stream = TestUtil.generateReadableStream(["audio data"]);

        jest.spyOn(stream, "pipe").mockReturnValue();

        const onClose = jest.fn();

        jest
            .spyOn(Controller.prototype, Controller.prototype.createClientStream.name)
            .mockReturnValue({ stream, onClose });

        await handler(...params.values());
        params.request.emit("close");

        expect(params.response.writeHead).toHaveBeenCalledWith(200, {
            "Content-Type": "audio/mpeg",
            "Accept-Ranges": "bytes",
        });

        expect(Controller.prototype.createClientStream).toHaveBeenCalled();
        expect(stream.pipe).toHaveBeenCalledWith(params.response);
        expect(onClose).toHaveBeenCalled();
    });

    test(`POST /controller - should call handleCommand`, async() => {
        const params = TestUtil.defaultHandleParams();
        params.request.method = "POST";
        params.request.url = "/controller";
        const bodyData = {
            command: "start",
        };
        params.request.push(JSON.stringify(bodyData));

        const jsonResponse = { result: "ok" };

        jest
            .spyOn(Controller.prototype, Controller.prototype.handleCommand.name)
            .mockResolvedValue(jsonResponse);

        await handler(...params.values());

        expect(Controller.prototype.handleCommand).toHaveBeenCalledWith(bodyData);
        expect(params.response.end).toHaveBeenCalledWith(
            JSON.stringify(jsonResponse)
        );
    });

    describe("exceptions", () => {
        test("given inexistent file it should respond with 404", async() => {
            const params = TestUtil.defaultHandleParams();
            const filename = "/index.png";
            params.request.method = "GET";
            params.request.url = filename;

            jest
                .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
                .mockRejectedValue(new Error("Error: ENOENT"));
            await handler(...params.values());

            expect(params.response.writeHead).toHaveBeenCalledWith(404);
            expect(params.response.end).toHaveBeenCalled();
        });

        test("given an error it should respond with 500", async() => {
            const params = TestUtil.defaultHandleParams();
            const filename = "/index.png";
            params.request.method = "GET";
            params.request.url = filename;

            jest
                .spyOn(Controller.prototype, Controller.prototype.getFileStream.name)
                .mockRejectedValue(new Error("Error"));
            await handler(...params.values());

            expect(params.response.writeHead).toHaveBeenCalledWith(500);
            expect(params.response.end).toHaveBeenCalled();
        });
    });
});