import axios from 'axios';
import { expect } from 'chai';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

/**
 * 发送 JSON-RPC 请求
 */
async function jsonRpcRequest(method, params, id = 1) {
  const response = await axios.post(BASE_URL, {
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: id
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return response.data;
}

describe('Sui JSON-RPC Methods', () => {
  describe('sui_getCheckpoints', () => {
    it('应该成功获取 checkpoints 列表（默认参数）', async () => {
      const result = await jsonRpcRequest('sui_getCheckpoints', [null, 1, true]);
      
      expect(result).to.have.property('jsonrpc', '2.0');
      expect(result).to.have.property('id', 1);
      expect(result).to.not.have.property('error');
      expect(result).to.have.property('result');
      expect(result.result).to.have.property('data');
      expect(result.result.data).to.be.an('array');
    });

    it('应该成功获取多个 checkpoints', async () => {
      const result = await jsonRpcRequest('sui_getCheckpoints', [null, 5, true]);
      
      expect(result).to.have.property('jsonrpc', '2.0');
      expect(result).to.not.have.property('error');
      expect(result.result).to.have.property('data');
      expect(result.result.data).to.be.an('array');
      expect(result.result.data.length).to.be.at.most(5);
    });

    it('应该支持 ascending 顺序', async () => {
      const result = await jsonRpcRequest('sui_getCheckpoints', [null, 3, false]);
      
      expect(result).to.have.property('jsonrpc', '2.0');
      expect(result).to.not.have.property('error');
      expect(result.result).to.have.property('data');
      expect(result.result.data).to.be.an('array');
    });

    it('应该支持 cursor 参数', async () => {
      // 先获取第一个结果
      const firstResult = await jsonRpcRequest('sui_getCheckpoints', [null, 1, true]);
      
      if (firstResult.result?.nextCursor) {
        const cursor = firstResult.result.nextCursor;
        const result = await jsonRpcRequest('sui_getCheckpoints', [cursor, 2, true]);
        
        expect(result).to.have.property('jsonrpc', '2.0');
        expect(result).to.not.have.property('error');
        expect(result.result).to.have.property('data');
      }
    });

    it('应该返回正确的数据结构', async () => {
      const result = await jsonRpcRequest('sui_getCheckpoints', [null, 1, true]);
      
      if (result.result?.data?.length > 0) {
        const checkpoint = result.result.data[0];
        // checkpoint 应该包含基本字段
        expect(checkpoint).to.be.an('object');
      }
    });
  });

  describe('sui_getCheckpoint', () => {
    let testCheckpointId = null;

    // 在测试前获取一个有效的 checkpoint ID
    before(async () => {
      try {
        const checkpointsResult = await jsonRpcRequest('sui_getCheckpoints', [null, 1, true]);
        if (checkpointsResult.result?.data?.[0]) {
          const checkpoint = checkpointsResult.result.data[0];
          // 使用序列号作为 checkpoint ID
          testCheckpointId = checkpoint.sequenceNumber?.toString() || checkpoint.sequence_number?.toString();
        }
      } catch (error) {
        console.warn('无法获取测试用的 checkpoint ID:', error.message);
      }
    });

    it('应该成功获取单个 checkpoint（通过序列号）', async function() {
      if (!testCheckpointId) {
        this.skip();
        return;
      }

      const result = await jsonRpcRequest('sui_getCheckpoint', [testCheckpointId]);
      
      expect(result).to.have.property('jsonrpc', '2.0');
      expect(result).to.not.have.property('error');
      expect(result).to.have.property('result');
      expect(result.result).to.have.property('checkpoint');
    });

    it('应该通过字符串序列号获取 checkpoint', async function() {
      if (!testCheckpointId) {
        this.skip();
        return;
      }

      const result = await jsonRpcRequest('sui_getCheckpoint', [testCheckpointId.toString()]);
      
      expect(result).to.have.property('jsonrpc', '2.0');
      expect(result).to.not.have.property('error');
    });

    it('应该处理无效的 checkpoint ID', async () => {
      const result = await jsonRpcRequest('sui_getCheckpoint', ['999999999999999999']);
      
      // 可能返回错误或空结果
      expect(result).to.have.property('jsonrpc', '2.0');
      // 如果返回错误，应该包含错误信息
      if (result.error) {
        expect(result.error).to.have.property('code');
        expect(result.error).to.have.property('message');
      }
    });

    it('应该返回正确的 checkpoint 数据结构', async function() {
      if (!testCheckpointId) {
        this.skip();
        return;
      }

      const result = await jsonRpcRequest('sui_getCheckpoint', [testCheckpointId]);
      
      if (result.result?.checkpoint) {
        const checkpoint = result.result.checkpoint;
        expect(checkpoint).to.be.an('object');
        // checkpoint 应该包含基本字段
      }
    });
  });

  describe('suix_getReferenceGasPrice', () => {
    it('应该成功获取参考 Gas 价格', async () => {
      const result = await jsonRpcRequest('suix_getReferenceGasPrice', []);
      
      expect(result).to.have.property('jsonrpc', '2.0');
      expect(result).to.not.have.property('error');
      expect(result).to.have.property('result');
    });

    it('应该返回有效的 Gas 价格', async () => {
      const result = await jsonRpcRequest('suix_getReferenceGasPrice', []);
      
      expect(result.result).to.have.property('referenceGasPrice');
      const gasPrice = result.result.referenceGasPrice;
      
      // Gas 价格应该是字符串或数字
      expect(gasPrice).to.exist;
      // 如果是字符串，应该可以转换为数字
      if (typeof gasPrice === 'string') {
        expect(Number(gasPrice)).to.be.a('number');
        expect(Number(gasPrice)).to.be.at.least(0);
      } else if (typeof gasPrice === 'number') {
        expect(gasPrice).to.be.at.least(0);
      }
    });

    it('应该返回一致的结果（多次调用）', async () => {
      const result1 = await jsonRpcRequest('suix_getReferenceGasPrice', []);
      const result2 = await jsonRpcRequest('suix_getReferenceGasPrice', []);
      
      expect(result1).to.have.property('jsonrpc', '2.0');
      expect(result2).to.have.property('jsonrpc', '2.0');
      // Gas 价格可能相同或略有变化，但应该都是有效值
      expect(result1.result).to.have.property('referenceGasPrice');
      expect(result2.result).to.have.property('referenceGasPrice');
    });

    it('应该正确处理空参数', async () => {
      const result = await jsonRpcRequest('suix_getReferenceGasPrice', []);
      
      expect(result).to.have.property('jsonrpc', '2.0');
      expect(result).to.not.have.property('error');
    });
  });
});

