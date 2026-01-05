import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import { createJsonRpcHandler } from './jsonrpc-handler.js';
import { createLoggingMiddleware } from './middleware/logger.js';

const app = new Koa();
const router = new Router();

// 日志中间件
app.use(logger());
app.use(createLoggingMiddleware());

// Body parser
app.use(bodyParser());

// JSON-RPC 处理器
const jsonRpcHandler = createJsonRpcHandler();

// JSON-RPC 路由
router.post('/', async (ctx) => {
  try {
    const result = await jsonRpcHandler.handle(ctx.request.body);
    ctx.body = result;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      },
      id: ctx.request.body?.id || null
    };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
const SUI_GRPC_URL = process.env.SUI_GRPC_URL || 'https://fullnode.mainnet.sui.io:443';
const SUI_NETWORK = process.env.SUI_NETWORK || 'mainnet';

app.listen(PORT, () => {
  console.log(`JSON-RPC proxy server listening on port ${PORT}`);
  console.log(`Sui gRPC endpoint: ${SUI_GRPC_URL}`);
  console.log(`Sui network: ${SUI_NETWORK}`);
});

export default app;

