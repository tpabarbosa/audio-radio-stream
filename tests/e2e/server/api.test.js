import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import fs from "fs";
import { setTimeout } from "timers/promises";
import TestUtil from "../_util/testUtil.js";
import config from "../../../server/config.js";

const {
    pages,
    dir,
    constants: { CONTENT_TYPE },
} = config;
const RETENTION_DATA_PERIOD = 300;

describe("API e2e Suite Test", () => {
    describe("Routes", () => {
        test("GET / - should redirect to /home with 302 status code", async() => {
            const server = await TestUtil.getTestServer();
            const result = await server.testServer.get("/");

            expect(result.statusCode).toStrictEqual(302);
            expect(result.headers.location).toStrictEqual("/home");
            server.kill();
        });

        test(`GET /home - should respond with ${pages.homeHTML} file stream`, async() => {
            const server = await TestUtil.getTestServer();
            const result = await server.testServer.get("/home");
            const homePage = await fs.promises.readFile(
                `${dir.publicDirectory}/${pages.homeHTML}`
            );
            expect(result.statusCode).toStrictEqual(200);
            expect(result.text).toStrictEqual(homePage.toString());
            server.kill();
        });

        test(`GET /controller - should respond with ${pages.controllerHTML} file stream`, async() => {
            const server = await TestUtil.getTestServer();
            const result = await server.testServer.get("/controller");
            const controllerPage = await fs.promises.readFile(
                `${dir.publicDirectory}/${pages.controllerHTML}`
            );
            expect(result.statusCode).toStrictEqual(200);
            expect(result.text).toStrictEqual(controllerPage.toString());
            server.kill();
        });

        test("GET /unknown - given an unknown route it should respond with 404 status code", async() => {
            const server = await TestUtil.getTestServer();
            const result = await server.testServer.get("/unknown");
            expect(result.statusCode).toStrictEqual(404);
            server.kill();
        });
    });

    describe("Static Files", () => {
        test("GET /inexistent_file.ext - should respond with 404 status code", async() => {
            const server = await TestUtil.getTestServer();
            const result = await server.testServer.get("/inexistent_file.ext");
            expect(result.statusCode).toStrictEqual(404);
            server.kill();
        });

        test("GET /an_existent_file.css - should respond with content-type text/css", async() => {
            const file = "/home/css/reset.css";
            const server = await TestUtil.getTestServer();
            const result = await server.testServer.get(file);
            const fileContent = await fs.promises.readFile(
                `${dir.publicDirectory}/${file}`
            );
            expect(result.statusCode).toStrictEqual(200);
            expect(result.text).toStrictEqual(fileContent.toString());
            expect(result.header["content-type"]).toStrictEqual("text/css");
            server.kill();
        });

        test("GET /existent_file.js - should respond with content-type text/javascript", async() => {
            const file = "/home/js/animation.js";
            const server = await TestUtil.getTestServer();
            const result = await server.testServer.get(file);
            const fileContent = await fs.promises.readFile(
                `${dir.publicDirectory}/${file}`
            );
            expect(result.statusCode).toStrictEqual(200);
            expect(result.text).toStrictEqual(fileContent.toString());
            expect(result.header["content-type"]).toStrictEqual("text/javascript");
            server.kill();
        });

        test("GET /existent_file.html - should respond with content-type text/html", async() => {
            const file = "/controller/index.html";
            const server = await TestUtil.getTestServer();
            const result = await server.testServer.get(file);
            const fileContent = await fs.promises.readFile(
                `${dir.publicDirectory}/${file}`
            );
            expect(result.statusCode).toStrictEqual(200);
            expect(result.text).toStrictEqual(fileContent.toString());
            expect(result.header["content-type"]).toStrictEqual("text/html");
            server.kill();
        });
    });

    describe("GET /stream - client workflow", () => {
        test("it should not receive data stream if the process is not playing", async() => {
            const server = await TestUtil.getTestServer();

            const onChunk = jest.fn();
            TestUtil.pipeAndReadStreamData(server.testServer.get("/stream"), onChunk);
            await setTimeout(RETENTION_DATA_PERIOD);
            server.kill();
            expect(onChunk).not.toHaveBeenCalled();
        });

        test("it should receive data stream if the process is playing", async() => {
            const server = await TestUtil.getTestServer();

            const onChunk = jest.fn();

            const { send } = TestUtil.commandSender(server.testServer);
            TestUtil.pipeAndReadStreamData(server.testServer.get("/stream"), onChunk);

            await send("start", { result: "Streamming started" });
            await setTimeout(RETENTION_DATA_PERIOD);

            await send("stop", { result: "Streamming stopped" });

            const [
                [buffer]
            ] = onChunk.mock.calls;

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.length).toBeGreaterThan(1000);
            server.kill();
        });
    });
});