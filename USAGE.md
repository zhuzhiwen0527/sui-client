# 使用指南

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

服务将在 `http://localhost:3000` 启动（可通过 `PORT` 环境变量修改）。

### 3. 配置 gRPC 端点

通过环境变量设置 Sui gRPC 服务地址：

```bash
export SUI_GRPC_URL=https://fullnode.mainnet.sui.io:443
npm start
```

或者使用其他网络：
- Testnet: `https://fullnode.testnet.sui.io:443`
- Devnet: `https://fullnode.devnet.sui.io:443`

### 4. 运行测试

```bash
npm test
```

## API 调用示例

### 使用 curl

```bash
# 获取余额
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "suix_getBalance",
    "params": ["0x0000000000000000000000000000000000000000000000000000000000000001"],
    "id": 1
  }'

# 获取参考 Gas 价格
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "suix_getReferenceGasPrice",
    "params": [],
    "id": 2
  }'

# 获取链标识符
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "sui_getChainIdentifier",
    "params": [],
    "id": 3
  }'
```

### 使用 JavaScript

```javascript
import axios from 'axios';

async function callJsonRpc(method, params) {
  const response = await axios.post('http://localhost:3000', {
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: 1
  });
  
  return response.data;
}

// 示例：获取余额
const result = await callJsonRpc('suix_getBalance', [
  '0x0000000000000000000000000000000000000000000000000000000000000001'
]);

console.log(result);
```

## 日志说明

服务会记录以下日志：

1. **请求日志**: 包含请求方法、URL、头部和请求体
2. **响应日志**: 包含状态码、响应时间和响应体
3. **gRPC 调用日志**: 记录每个 gRPC 方法调用
4. **错误日志**: 记录所有错误信息

日志格式示例：
```
[2024-01-01T00:00:00.000Z] [REQUEST 1234567890-abc123] { method: 'POST', url: '/', ... }
[gRPC] Calling StateServiceClient.getBalance { address: '0x...', ... }
[JSON-RPC] Method suix_getBalance completed successfully
[2024-01-01T00:00:00.100Z] [RESPONSE 1234567890-abc123] { status: 200, duration: '100ms', ... }
```

## 错误处理

服务遵循 JSON-RPC 2.0 错误规范：

- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32603`: Internal error

错误响应格式：
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "具体错误信息"
  },
  "id": 1
}
```

## 注意事项

1. 所有 gRPC 响应会自动转换为 JSON 格式
2. 支持批量请求（传递请求数组）
3. 确保 Sui gRPC 端点可访问
4. 某些方法需要有效的参数（如地址、交易哈希等）

