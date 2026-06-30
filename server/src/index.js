import http from "node:http";
import { config } from "./config.js";
import { applyCorsContext, handleError, rejectCorsIfNeeded, sendOptions } from "./lib/http.js";
import { checkRateLimit } from "./lib/rateLimit.js";
import { route } from "./routes/router.js";

const server = http.createServer(async (req, res) => {
  applyCorsContext(req, res);
  if (req.method === "OPTIONS") return sendOptions(res);
  if (rejectCorsIfNeeded(req, res)) return;

  try {
    checkRateLimit(req);
    await route(req, res);
  } catch (error) {
    console.error(error);
    handleError(res, error);
  }
});

server.listen(config.port, config.host, () => {
  console.log(`AI交易人格测评 server 已启动：http://localhost:${config.port}`);
});
