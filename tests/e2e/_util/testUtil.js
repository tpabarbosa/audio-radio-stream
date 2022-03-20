/* istanbul ignore file */

import { jest, expect } from "@jest/globals";
import { Transform } from "stream";
import superTest from "supertest";
import portFinder from "portfinder";
import Server from "../../../server/server.js";

const getAvailablePort = portFinder.getPortPromise;

export default class TestUtil {
    static pipeAndReadStreamData(stream, onChunk) {
        const transform = new Transform({
            transform(chunk, enc, cb) {
                onChunk(chunk);
                cb(null, chunk);
            },
        });
        return stream.pipe(transform);
    }

    static commandSender(testServer) {
        return {
            async send(command, expectedResult) {
                const response = await testServer.post("/controller").send({
                    command,
                });
                expect(response.text).toStrictEqual(JSON.stringify(expectedResult));
            },
        };
    }

    static async getTestServer() {
        const getSuperTest = (port) => superTest(`http://localhost:${port}`);
        const port = await getAvailablePort();
        return new Promise((resolve, reject) => {
            const server = Server.listen(port)
                .once("listening", () => {
                    const testServer = getSuperTest(port);
                    const response = {
                        testServer,
                        kill() {
                            server.close();
                        },
                    };
                    return resolve(response);
                })
                .once("error", reject);
        });
    }
}