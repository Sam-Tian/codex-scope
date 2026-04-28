import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { runRefresh } from "./refresh.js";
import { statePath } from "../utils/fs.js";

export type ViewerServer = {
  url: string;
  close: () => Promise<void>;
};

export async function startViewerServer(options: { cwd: string; port: number }): Promise<ViewerServer> {
  await runRefresh({ cwd: options.cwd, servedMode: true });

  const server: Server = createServer(async (req, res) => {
    try {
      if (req.method === "POST" && req.url === "/refresh") {
        await runRefresh({ cwd: options.cwd, servedMode: true });
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        res.end("refreshed");
        return;
      }

      if (req.method === "GET" && (req.url === "/" || req.url === "/report.html")) {
        const html = await readFile(statePath(options.cwd, "report.html"), "utf8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(message);
    }
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(options.port, "127.0.0.1");
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Viewer server did not expose a TCP address");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
