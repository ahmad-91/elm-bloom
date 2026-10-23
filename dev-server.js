const fs = require("fs");
const http = require("http");
const path = require("path");

function loadEnv() {
  const file = path.join(__dirname, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2];
  }
}

loadEnv();

const complete = require("./api/complete");
const phone = require("./api/phone");
const stats = require("./api/stats");
const reset = require("./api/reset");
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT || 8787);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".js": "text/javascript; charset=utf-8",
};

function wrap(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
  };
  return res;
}

function serveStatic(req, res) {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/admin") url = "/admin.html";
  if (url === "/") url = "/index.html";
  const file = path.normalize(path.join(DIST, url));
  if (!file.startsWith(DIST)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  const routes = { "/api/complete": complete, "/api/phone": phone, "/api/stats": stats, "/api/reset": reset };
  if (routes[url]) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    try {
      req.body = raw ? JSON.parse(raw) : {};
    } catch (err) {
      req.body = null;
    }
    wrap(res);
    try {
      await routes[url](req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log("http://localhost:" + PORT);
});
