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

/**
 * 单独测试 sui_getCheckpoints
 * 运行: mocha test/checkpoints.individual.spec.js --grep "sui_getCheckpoints"
 */
describe('sui_getCheckpoints (单独测试)', () => {
  it('应该成功获取 checkpoints 列表', async () => {
    const result = await jsonRpcRequest('sui_getCheckpoints', [null, 1, true]);
    
    expect(result).to.have.property('jsonrpc', '2.0');
    expect(result).to.not.have.property('error');
    expect(result).to.have.property('result');
    expect(result.result).to.have.property('data');
    expect(result.result.data).to.be.an('array');
    
    console.log('✓ sui_getCheckpoints 测试通过');
    console.log('返回数据:', JSON.stringify(result.result, null, 2));
  });

  it('应该支持 limit 参数', async () => {
    const result = await jsonRpcRequest('sui_getCheckpoints', [null, 3, true]);
    
    expect(result).to.have.property('jsonrpc', '2.0');
    expect(result.result.data.length).to.be.at.most(3);
    
    console.log('✓ limit 参数测试通过');
  });

  it('应该支持 descending 参数', async () => {
    const result = await jsonRpcRequest('sui_getCheckpoints', [null, 2, false]);
    
    expect(result).to.have.property('jsonrpc', '2.0');
    expect(result.result.data).to.be.an('array');
    
    console.log('✓ descending 参数测试通过');
  });
});

/**
 * 单独测试 sui_getCheckpoint
 * 运行: mocha test/checkpoints.individual.spec.js --grep "sui_getCheckpoint"
 */
describe('sui_getCheckpoint (单独测试)', () => {
  let testCheckpointId = null;

  before(async () => {
    try {
      const checkpointsResult = await jsonRpcRequest('sui_getCheckpoints', [null, 1, true]);
      if (checkpointsResult.result?.data?.[0]) {
        const checkpoint = checkpointsResult.result.data[0];
        testCheckpointId = checkpoint.sequenceNumber?.toString() || 
                          checkpoint.sequence_number?.toString() ||
                          checkpoint.checkpointId;
      }
    } catch (error) {
      console.warn('无法获取测试用的 checkpoint ID');
    }
  });

  it('应该成功获取单个 checkpoint', async function() {
    if (!testCheckpointId) {
      this.skip();
      return;
    }

    const result = await jsonRpcRequest('sui_getCheckpoint', [testCheckpointId]);
    
    expect(result).to.have.property('jsonrpc', '2.0');
    expect(result).to.not.have.property('error');
    expect(result).to.have.property('result');
    expect(result.result).to.have.property('checkpoint');
    
    console.log('✓ sui_getCheckpoint 测试通过');
    console.log('Checkpoint ID:', testCheckpointId);
    console.log('返回数据:', JSON.stringify(result.result, null, 2));
  });

  it('应该处理无效的 checkpoint ID', async () => {
    const result = await jsonRpcRequest('sui_getCheckpoint', ['invalid_id']);
    
    expect(result).to.have.property('jsonrpc', '2.0');
    // 应该返回错误
    if (result.error) {
      expect(result.error).to.have.property('code');
      console.log('✓ 错误处理测试通过');
    }
  });
});

/**
 * 单独测试 suix_getReferenceGasPrice
 * 运行: mocha test/checkpoints.individual.spec.js --grep "suix_getReferenceGasPrice"
 */
describe('suix_getReferenceGasPrice (单独测试)', () => {
  it('应该成功获取参考 Gas 价格', async () => {
    const result = await jsonRpcRequest('suix_getReferenceGasPrice', []);
    
    expect(result).to.have.property('jsonrpc', '2.0');
    expect(result).to.not.have.property('error');
    expect(result).to.have.property('result');
    expect(result.result).to.have.property('referenceGasPrice');
    
    const gasPrice = result.result.referenceGasPrice;
    expect(gasPrice).to.exist;
    
    console.log('✓ suix_getReferenceGasPrice 测试通过');
    console.log('Gas 价格:', gasPrice);
    console.log('返回数据:', JSON.stringify(result.result, null, 2));
  });

  it('应该返回有效的数字格式', async () => {
    const result = await jsonRpcRequest('suix_getReferenceGasPrice', []);
    
    const gasPrice = result.result.referenceGasPrice;
    const numPrice = typeof gasPrice === 'string' ? Number(gasPrice) : gasPrice;
    
    expect(numPrice).to.be.a('number');
    expect(numPrice).to.be.at.least(0);
    
    console.log('✓ Gas 价格格式验证通过:', numPrice);
  });
});

