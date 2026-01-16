import axios from 'axios';

/**
 * Sui JSON-RPC 客户端
 * 使用 axios 直接调用 Sui 节点的 JSON-RPC API
 */
class SuiJsonRpcClient {
  constructor(url) {
    this.url = url || 'https://fullnode.mainnet.sui.io';
    this.requestId = 0;
  }

  /**
   * 发送 JSON-RPC 请求
   * @param {string} method - JSON-RPC 方法名
   * @param {Array} params - 方法参数
   * @param {number} id - 请求 ID（可选）
   * @returns {Promise<Object>} JSON-RPC 响应
   */
  async request(method, params = [], id = null) {
    const requestId = id !== null ? id : ++this.requestId;
    
    const payload = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: requestId
    };

    try {
      const response = await axios.post(this.url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      });

      if (response.data.error) {
        throw new Error(`JSON-RPC Error: ${response.data.error.message} (code: ${response.data.error.code})`);
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        // 服务器返回了错误响应
        throw new Error(`HTTP Error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        // 请求已发送但没有收到响应
        throw new Error(`Network Error: Unable to connect to ${this.url}`);
      } else {
        // 其他错误
        throw error;
      }
    }
  }

  /**
   * 批量请求
   * @param {Array<Object>} requests - 请求数组，每个对象包含 method 和 params
   * @returns {Promise<Array>} 响应数组
   */
  async batch(requests) {
    const payloads = requests.map((req, index) => ({
      jsonrpc: '2.0',
      method: req.method,
      params: req.params || [],
      id: req.id || index + 1
    }));

    try {
      const response = await axios.post(this.url, payloads, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP Error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error(`Network Error: Unable to connect to ${this.url}`);
      } else {
        throw error;
      }
    }
  }

  // ========== 实现的 JSON-RPC 方法 ==========

  /**
   * suix_getBalance - 获取账户余额
   * @param {string} address - 账户地址
   * @param {string} coinType - 代币类型（可选，默认 SUI）
   * @returns {Promise<Object>}
   */
  async getBalance(address, coinType = '0x2::sui::SUI') {
    return this.request('suix_getBalance', [address, coinType]);
  }

  /**
   * sui_getCheckpoints - 获取检查点列表
   * @param {string|null} cursor - 游标（可选）
   * @param {number} limit - 限制数量（默认 1）
   * @param {boolean} descending - 是否降序（默认 true）
   * @returns {Promise<Object>}
   */
  async getCheckpoints(cursor = null, limit = 1, descending = true) {
    return this.request('sui_getCheckpoints', [cursor, limit, descending]);
  }

  /**
   * sui_getCheckpoint - 获取单个检查点
   * @param {string} checkpointId - 检查点 ID（序列号或 digest）
   * @returns {Promise<Object>}
   */
  async getCheckpoint(checkpointId) {
    return this.request('sui_getCheckpoint', [checkpointId]);
  }

  /**
   * sui_getTransactionBlock - 获取交易区块
   * @param {string} digest - 交易 digest
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async getTransactionBlock(digest, options = {}) {
    const {
      showInput = true,
      showRawInput = true,
      showEffects = true,
      showEvents = true,
      showObjectChanges = true,
      showBalanceChanges = true,
      showRawEffects = true
    } = options;

    return this.request('sui_getTransactionBlock', [
      digest,
      {
        showInput,
        showRawInput,
        showEffects,
        showEvents,
        showObjectChanges,
        showBalanceChanges,
        showRawEffects
      }
    ]);
  }

  /**
   * sui_tryGetPastObject - 获取历史对象
   * @param {string} id - 对象 ID
   * @param {string|number} version - 版本号
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async tryGetPastObject(id, version, options = {}) {
    const {
      showType = true,
      showOwner = true,
      showPreviousTransaction = true,
      showDisplay = true,
      showContent = true,
      showBcs = true,
      showStorageRebate = true
    } = options;

    return this.request('sui_tryGetPastObject', [
      id,
      version,
      {
        showType,
        showOwner,
        showPreviousTransaction,
        showDisplay,
        showContent,
        showBcs,
        showStorageRebate
      }
    ]);
  }

  /**
   * sui_getObject - 获取对象
   * @param {string} id - 对象 ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async getObject(id, options = {}) {
    const {
      showType = true,
      showOwner = true,
      showPreviousTransaction = true,
      showDisplay = true,
      showContent = true,
      showBcs = true,
      showStorageRebate = true
    } = options;

    return this.request('sui_getObject', [
      id,
      {
        showType,
        showOwner,
        showPreviousTransaction,
        showDisplay,
        showContent,
        showBcs,
        showStorageRebate
      }
    ]);
  }

  /**
   * suix_getCoins - 获取代币列表
   * @param {string} address - 账户地址
   * @param {string} coinType - 代币类型（默认 SUI）
   * @param {string|null} cursor - 游标（可选）
   * @returns {Promise<Object>}
   */
  async getCoins(address, coinType = '0x2::sui::SUI', cursor = null) {
    return this.request('suix_getCoins', [address, coinType, cursor]);
  }

  /**
   * suix_getReferenceGasPrice - 获取参考 Gas 价格
   * @returns {Promise<Object>}
   */
  async getReferenceGasPrice() {
    return this.request('suix_getReferenceGasPrice', []);
  }

  /**
   * sui_executeTransactionBlock - 执行交易区块
   * @param {string} rawtx - 原始交易数据（base64 编码）
   * @param {Array<string>} signatures - 签名数组
   * @returns {Promise<Object>}
   */
  async executeTransactionBlock(rawtx, signatures = []) {
    return this.request('sui_executeTransactionBlock', [rawtx, signatures]);
  }

  /**
   * sui_getChainIdentifier - 获取链标识符
   * @returns {Promise<Object>}
   */
  async getChainIdentifier() {
    return this.request('sui_getChainIdentifier', []);
  }

  /**
   * suix_getCoinMetadata - 获取代币元数据
   * @param {string} coinType - 代币类型
   * @returns {Promise<Object>}
   */
  async getCoinMetadata(coinType) {
    return this.request('suix_getCoinMetadata', [coinType]);
  }

  /**
   * 通用方法调用（用于其他未实现的方法）
   * @param {string} method - 方法名
   * @param {Array} params - 参数数组
   * @returns {Promise<Object>}
   */
  async call(method, params = []) {
    return this.request(method, params);
  }
}

/**
 * 创建 Sui JSON-RPC 客户端实例
 * @param {string} network - 网络名称 ('mainnet' | 'testnet' | 'devnet' | 'localnet') 或自定义 URL
 * @returns {SuiJsonRpcClient}
 */
export function createSuiClient(network = 'mainnet') {
  let url;
  
  if (network.startsWith('http://') || network.startsWith('https://')) {
    url = network;
  } else {
    const urls = {
      mainnet: 'https://fullnode.mainnet.sui.io',
      testnet: 'https://fullnode.testnet.sui.io',
      devnet: 'https://fullnode.devnet.sui.io',
      localnet: 'http://localhost:9000'
    };
    url = urls[network] || urls.mainnet;
  }
  
  return new SuiJsonRpcClient(url);
}

// 导出默认实例（mainnet）
export const suiClient = createSuiClient('mainnet');

// 导出类
export default SuiJsonRpcClient;

// ========== 使用示例 ==========

/**
 * 使用示例
 */
async function examples() {
  // 创建客户端
  const client = createSuiClient('mainnet');
  // 或使用自定义 URL
  // const client = createSuiClient('https://fullnode.mainnet.sui.io');
  
  // 测试参数
  const account = '0x5b87c8e6e58daa108d73c90f0582aff6d355a7c74e2453a4a00f4c01b666cae2';
  const coinType = '0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL';
  const objectId = '0x8447e99d3344da18080fd19929f4659fea032e3f35743d1cef664b81a818d360';
  const transactionHash = '4sAFo5Tr2WgxgFCy1bUF5edDQZCYTupcyDSw5E8GW9VD';
  
  try {
    // 示例 1: 获取参考 Gas 价格
    console.log('=== 1. 获取参考 Gas 价格 ===');
    const gasPrice = await client.getReferenceGasPrice();
    console.log('Gas Price:', JSON.stringify(gasPrice.result, null, 2));
    
    // 示例 2: 获取链标识符
    console.log('\n=== 2. 获取链标识符 ===');
    const chainId = await client.getChainIdentifier();
    console.log('Chain ID:', JSON.stringify(chainId.result, null, 2));
    
    // 示例 3: 获取 checkpoints
    console.log('\n=== 3. 获取 Checkpoints ===');
    const checkpoints = await client.getCheckpoints(null, 3, true);
    console.log('Checkpoints:', JSON.stringify(checkpoints.result, null, 2));
    
    // 示例 4: 获取单个 checkpoint
    if (checkpoints.result?.data?.[0]) {
      const checkpointId = checkpoints.result.data[0].sequenceNumber || 
                          checkpoints.result.data[0].checkpointId;
      console.log('\n=== 4. 获取单个 Checkpoint ===');
      const checkpoint = await client.getCheckpoint(checkpointId);
      console.log('Checkpoint:', JSON.stringify(checkpoint.result, null, 2));
    }
    
    // 示例 5: 获取余额 (USDC)
    console.log('\n=== 5. 获取账户余额 (USDC) ===');
    console.log(`Account: ${account}`);
    console.log(`Coin Type: ${coinType}`);
    const balance = await client.getBalance(account, coinType);
    console.log('Balance:', JSON.stringify(balance.result, null, 2));
    
    // 示例 6: 获取 SUI 余额
    console.log('\n=== 6. 获取账户余额 (SUI) ===');
    const suiBalance = await client.getBalance(account);
    console.log('SUI Balance:', JSON.stringify(suiBalance.result, null, 2));
    
    // 示例 7: 获取 USDC 代币列表
    console.log('\n=== 7. 获取 USDC 代币列表 ===');
    const coins = await client.getCoins(account, coinType);
    console.log('Coins:', JSON.stringify(coins.result, null, 2));
    
    // 示例 8: 获取 SUI 代币列表
    console.log('\n=== 8. 获取 SUI 代币列表 ===');
    const suiCoins = await client.getCoins(account);
    console.log('SUI Coins:', JSON.stringify(suiCoins.result, null, 2));
    
    // 示例 9: 获取对象
    console.log('\n=== 9. 获取对象 ===');
    console.log(`Object ID: ${objectId}`);
    const object = await client.getObject(objectId, {
      showType: true,
      showOwner: true,
      showPreviousTransaction: true,
      showDisplay: true,
      showContent: true,
      showBcs: true,
      showStorageRebate: true
    });
    console.log('Object:', JSON.stringify(object.result, null, 2));
    
    // 示例 10: 获取交易区块
    console.log('\n=== 10. 获取交易区块 ===');
    console.log(`Transaction Hash: ${transactionHash}`);
    const transaction = await client.getTransactionBlock(transactionHash, {
      showInput: true,
      showRawInput: true,
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true,
      showRawEffects: true
    });
    // console.log('Transaction:', JSON.stringify(transaction.result, null, 2));
    
    // 示例 11: 获取历史对象（需要先获取对象的版本号）
    console.log('\n=== 11. 获取历史对象 ===');
    try {
        const pastObject = await client.tryGetPastObject("0x68842897e2d982707e076d82da8ca5820687d38b6d990113954826afbcadb44e", 739779334, {
          showType: true,
          showOwner: true,
          showPreviousTransaction: true,
          showDisplay: true,
          showContent: true,
          showBcs: true,
          showStorageRebate: true
        });
        console.log('Past Object:', JSON.stringify(pastObject.result, null, 2));
        } catch (error) {
          console.error('Try Get Past Object Error:', error.message);
        }
    
    // 示例 12: 获取 USDC 代币元数据
    console.log('\n=== 12. 获取 USDC 代币元数据 ===');
    console.log(`Coin Type: ${coinType}`);
    const coinMetadata = await client.getCoinMetadata(coinType);
    console.log('Coin Metadata:', JSON.stringify(coinMetadata.result, null, 2));
    
    // 示例 13: 获取 SUI 代币元数据
    console.log('\n=== 13. 获取 SUI 代币元数据 ===');
    const suiMetadata = await client.getCoinMetadata('0x2::sui::SUI');
    console.log('SUI Metadata:', JSON.stringify(suiMetadata.result, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// 如果直接运行此文件，执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  examples().catch(console.error);
}

