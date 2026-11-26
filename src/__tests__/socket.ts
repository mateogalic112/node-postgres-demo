import { Server } from "http";
import { io as clientIo, Socket } from "socket.io-client";
import { createTestApp } from "./setup";

/**
 * Starts the app on a random port for the current test file and registers the Jest hooks
 * that disconnect every socket after each test and stop the server at the end.
 */
export const useSocketServer = () => {
  let server: Server;
  let url: string;
  const openSockets: Socket[] = [];

  beforeAll((done) => {
    server = createTestApp().getServer();
    server.listen(0, () => {
      url = `http://localhost:${(server.address() as { port: number }).port}`;
      done();
    });
  });

  afterEach(() => {
    openSockets.forEach((socket) => socket.disconnect());
    openSockets.length = 0;
  });

  afterAll((done) => {
    server.close(done);
  });

  /** Opens a socket connection, sending `cookie` in the handshake when given. */
  const connectSocket = (cookie?: string) =>
    new Promise<Socket>((resolve) => {
      const socket = clientIo(url, {
        transports: ["websocket"],
        extraHeaders: cookie ? { cookie } : {}
      });
      openSockets.push(socket);
      socket.once("connect", () => resolve(socket));
    });

  return { connectSocket };
};

/** Resolves with the payload of the next `event` this socket receives. */
export const once = <T>(socket: Socket, event: string): Promise<T> =>
  new Promise((resolve) => socket.once(event, resolve));

/** Resolves if `event` does not arrive within `windowMs`, rejects if it does. */
export const expectNoEvent = (socket: Socket, event: string, windowMs = 200): Promise<void> =>
  new Promise((resolve, reject) => {
    const onEvent = () => {
      clearTimeout(timer);
      reject(new Error(`Unexpected ${event} event`));
    };
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      resolve();
    }, windowMs);
    socket.once(event, onEvent);
  });
