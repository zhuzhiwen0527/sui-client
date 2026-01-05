# Sui JSON-RPC Proxy Service

这是一个基于 Koa 的 JSON-RPC 代理服务，用于将 JSON-RPC 请求转发到 Sui gRPC 服务。

## 功能特性

- ✅ 使用 Koa 框架构建
- ✅ 完整的网络调用日志记录
- ✅ JSON-RPC 2.0 协议支持
- ✅ 支持批量请求
- ✅ 将 gRPC 响应转换为 JSON 格式
- ✅ 实现 11 个 JSON-RPC 方法

## 安装

```bash
npm install
```

## 配置

通过环境变量配置：

- `PORT`: 服务端口（默认: 3000）
- `SUI_GRPC_URL`: Sui gRPC 服务地址（默认: https://fullnode.mainnet.sui.io:443）
- `SUI_NETWORK`: Sui 网络名称（默认: mainnet，可选: testnet, devnet, localnet）

## 运行

```bash
npm start
```

## 测试

### 运行原始测试

```bash
npm test
```

### 运行 Mocha 测试

```bash
# 运行所有 mocha 测试
npm run test:mocha

# 运行 checkpoints 相关测试
npm run test:checkpoints

# 运行单独测试文件（支持单独测试每个方法）
npm run test:checkpoints:individual

# 测试特定方法
mocha test/checkpoints.individual.spec.js --grep "sui_getCheckpoints"
mocha test/checkpoints.individual.spec.js --grep "sui_getCheckpoint"
mocha test/checkpoints.individual.spec.js --grep "suix_getReferenceGasPrice"
```

详细测试说明请查看 [test/README.md](test/README.md)

或者设置自定义测试 URL：

```bash
TEST_URL=http://localhost:3000 node test/test.js
```

## 实现的 JSON-RPC 方法

1. **suix_getBalance** - 获取账户余额
   - 参数: `[address, contractAddress]`
   - gRPC: `StateServiceClient.getBalance`

2. **sui_getCheckpoints** - 获取检查点列表
   - 参数: `[cursor, limit, descending]`
   - gRPC: `LedgerServiceClient.getCheckpoints`

3. **sui_getCheckpoint** - 获取单个检查点
   - 参数: `[checkpointId]`
   - gRPC: `LedgerServiceClient.getCheckpoint`

4. **sui_getTransactionBlock** - 获取交易区块
   - 参数: `[digest, options]`
   - gRPC: `LedgerServiceClient.getTransaction`

5. **sui_tryGetPastObject** - 获取历史对象
   - 参数: `[id, version, options]`
   - gRPC: `LedgerServiceClient.getObject`

6. **sui_getObject** - 获取对象
   - 参数: `[id, options]`
   - gRPC: `LedgerServiceClient.getObject`

7. **suix_getCoins** - 获取代币列表
   - 参数: `[address, coinType, cursor]`
   - gRPC: `GrpcCoreClient.getCoins`

8. **suix_getReferenceGasPrice** - 获取参考 Gas 价格
   - 参数: `[]`
   - gRPC: `GrpcCoreClient.getReferenceGasPrice`

9. **sui_executeTransactionBlock** - 执行交易区块
   - 参数: `[rawtx, signatures]`
   - gRPC: `GrpcCoreClient.executeTransaction`

10. **sui_getChainIdentifier** - 获取链标识符
    - 参数: `[]`
    - gRPC: `GrpcCoreClient.getServiceInfo`

11. **suix_getCoinMetadata** - 获取代币元数据
    - 参数: `[coinType]`
    - gRPC: `StateServiceClient.getCoinInfo`

## API 使用示例

### 单个请求

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "suix_getBalance",
    "params": ["0x0000000000000000000000000000000000000000000000000000000000000001"],
    "id": 1
  }'
```

### 批量请求

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '[
    {
      "jsonrpc": "2.0",
      "method": "suix_getReferenceGasPrice",
      "params": [],
      "id": 1
    },
    {
      "jsonrpc": "2.0",
      "method": "sui_getChainIdentifier",
      "params": [],
      "id": 2
    }
  ]'
```

## 日志

服务会记录所有网络调用，包括：
- 请求信息（方法、URL、头部、请求体）
- 响应信息（状态码、响应时间、响应体）
- 错误信息（错误消息、堆栈跟踪）

## 项目结构

```
sui-client/
├── src/
│   ├── index.js                 # 主服务文件
│   ├── jsonrpc-handler.js       # JSON-RPC 处理器
│   ├── middleware/
│   │   └── logger.js            # 日志中间件
│   └── methods/                 # 方法处理器
│       ├── index.js
│       ├── getBalance.js
│       ├── getCheckpoints.js
│       ├── getCheckpoint.js
│       ├── getTransactionBlock.js
│       ├── tryGetPastObject.js
│       ├── getObject.js
│       ├── getCoins.js
│       ├── getReferenceGasPrice.js
│       ├── executeTransactionBlock.js
│       ├── getChainIdentifier.js
│       └── getCoinMetadata.js
├── test/
│   └── test.js                  # 测试用例
├── package.json
└── README.md
```

## 依赖

- `@mysten/sui`: ^1.45.2 - Sui SDK
- `koa`: ^2.15.0 - Web 框架
- `koa-bodyparser`: ^4.4.1 - 请求体解析
- `koa-router`: ^12.0.1 - 路由
- `koa-logger`: ^3.2.1 - 日志中间件

## 许可证

MIT

