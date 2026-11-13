import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(".");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (request.method === "POST" && pathname === "/__stop") {
    response.writeHead(200).end();
    server.close();
    server.closeIdleConnections();
    return;
  }
  const file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  const relative = file.slice(root.length + 1);
  if (!file.startsWith(root + sep) || !["index.html", "app.js", "styles.css"].includes(relative) && !relative.startsWith(`js${sep}`)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await readFile(file);
    response.writeHead(200, { "Content-Type": `${mime[extname(file)] || "text/plain"};charset=utf-8`, "Cache-Control": "no-store" });
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, "127.0.0.1");
