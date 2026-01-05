# Mocha 测试用例说明

## 安装依赖

首先安装测试依赖：

```bash
npm install
```

## 运行测试

### 运行所有 mocha 测试

```bash
npm run test:mocha
```

### 运行 checkpoints 相关测试

```bash
npm run test:checkpoints
```

### 运行单独测试文件（支持单独测试每个方法）

```bash
npm run test:checkpoints:individual
```

## 单独测试特定方法

### 测试 sui_getCheckpoints

```bash
mocha test/checkpoints.individual.spec.js --grep "sui_getCheckpoints"
```

### 测试 sui_getCheckpoint

```bash
mocha test/checkpoints.individual.spec.js --grep "sui_getCheckpoint"
```

### 测试 suix_getReferenceGasPrice

```bash
mocha test/checkpoints.individual.spec.js --grep "suix_getReferenceGasPrice"
```

## 配置测试服务器地址

默认测试服务器地址是 `http://localhost:3000`，可以通过环境变量修改：

```bash
TEST_URL=http://localhost:3000 npm run test:mocha
```

## 测试文件说明

### checkpoints.spec.js

包含所有三个方法的完整测试套件：
- `sui_getCheckpoints` - 测试获取 checkpoints 列表的各种场景
- `sui_getCheckpoint` - 测试获取单个 checkpoint
- `suix_getReferenceGasPrice` - 测试获取参考 Gas 价格

### checkpoints.individual.spec.js

每个方法都有独立的 describe 块，可以单独运行：
- 使用 `--grep` 参数可以只运行特定方法的测试
- 每个测试都有详细的控制台输出

## 测试用例覆盖

### sui_getCheckpoints
- ✅ 默认参数获取
- ✅ 获取多个 checkpoints
- ✅ 支持 ascending/descending 顺序
- ✅ 支持 cursor 分页
- ✅ 数据结构验证

### sui_getCheckpoint
- ✅ 通过序列号获取
- ✅ 通过字符串序列号获取
- ✅ 无效 ID 错误处理
- ✅ 数据结构验证

### suix_getReferenceGasPrice
- ✅ 成功获取 Gas 价格
- ✅ 数据格式验证
- ✅ 多次调用一致性
- ✅ 空参数处理

## 注意事项

1. 运行测试前确保服务已启动：`npm start`
2. 某些测试需要网络连接到 Sui 节点
3. 测试超时时间设置为 10 秒
4. 如果无法获取 checkpoint ID，相关测试会自动跳过

