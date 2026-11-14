"use strict";

// Uppcoder 的 Express 模板默认执行 node index.js，并通过 APP_PORT 指定端口。
// 这里把平台端口透传给 server.js，本地开发不受影响。
if (process.env.APP_PORT && !process.env.PORT) {
  process.env.PORT = process.env.APP_PORT;
}

require("./server.js");

