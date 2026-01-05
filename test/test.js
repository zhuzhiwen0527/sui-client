import axios from 'axios';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

/**
 * 发送 JSON-RPC 请求
 */
async function jsonRpcRequest(method, params, id = 1) {
  try {
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
  } catch (error) {
    console.error(`Error calling ${method}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * 测试用例
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('开始测试 JSON-RPC 服务');
  console.log('='.repeat(60));
  console.log(`测试服务器: ${BASE_URL}\n`);

  const tests = [];
  let passed = 0;
  let failed = 0;

  // 测试 1: suix_getBalance
  // tests.push(async () => {
  //   console.log('测试 1: suix_getBalance');
  //   try {
  //     const result = await jsonRpcRequest('suix_getBalance', [
  //       '0x0000000000000000000000000000000000000000000000000000000000000001'
  //     ]);
  //     console.log('✓ 成功:', JSON.stringify(result, null, 2));
  //     passed++;
  //   } catch (error) {
  //     console.log('✗ 失败:', error.message);
  //     failed++;
  //   }
  //   console.log('');
  // });

  // 测试 2: sui_getCheckpoints
  tests.push(async () => {
    console.log('测试 2: sui_getCheckpoints');
    try {
      const result = await jsonRpcRequest('sui_getCheckpoints', [null, 1, true]);
      console.log('✓ 成功:', JSON.stringify(result, null, 2));
      passed++;
    } catch (error) {
      console.log('✗ 失败:', error.message);
      failed++;
    }
    console.log('');
  });

  // 测试 3: sui_getCheckpoint
  tests.push(async () => {
    console.log('测试 3: sui_getCheckpoint');
    try {
      // 先获取一个 checkpoint ID
      const checkpointsResult = await jsonRpcRequest('sui_getCheckpoints', [null, 1, true]);
      if (checkpointsResult.result?.data?.[0]?.sequenceNumber) {
        const checkpointId = checkpointsResult.result.data[0].sequenceNumber;
        const result = await jsonRpcRequest('sui_getCheckpoint', [checkpointId]);
        console.log('✓ 成功:', JSON.stringify(result, null, 2));
        passed++;
      } else {
        console.log('⚠ 跳过: 无法获取 checkpoint ID');
      }
    } catch (error) {
      console.log('✗ 失败:', error.message);
      failed++;
    }
    console.log('');
  });

  // 测试 4: sui_getTransactionBlock
  // tests.push(async () => {
  //   console.log('测试 4: sui_getTransactionBlock');
  //   try {
  //     // 使用一个示例交易哈希（需要替换为实际的交易哈希）
  //     const txHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  //     const result = await jsonRpcRequest('sui_getTransactionBlock', [
  //       txHash,
  //       {
  //         showInput: true,
  //         showRawInput: true,
  //         showEffects: true,
  //         showEvents: true,
  //         showObjectChanges: true,
  //         showBalanceChanges: true,
  //         showRawEffects: true
  //       }
  //     ]);
  //     console.log('✓ 成功:', JSON.stringify(result, null, 2));
  //     passed++;
  //   } catch (error) {
  //     console.log('✗ 失败:', error.message);
  //     failed++;
  //   }
  //   console.log('');
  // });

  // 测试 5: sui_tryGetPastObject
  // tests.push(async () => {
  //   console.log('测试 5: sui_tryGetPastObject');
  //   try {
  //     const objectId = '0x0000000000000000000000000000000000000000000000000000000000000001';
  //     const version = '1';
  //     const result = await jsonRpcRequest('sui_tryGetPastObject', [
  //       objectId,
  //       version,
  //       {
  //         showType: true,
  //         showOwner: true,
  //         showPreviousTransaction: true,
  //         showDisplay: true,
  //         showContent: true,
  //         showBcs: true,
  //         showStorageRebate: true
  //       }
  //     ]);
  //     console.log('✓ 成功:', JSON.stringify(result, null, 2));
  //     passed++;
  //   } catch (error) {
  //     console.log('✗ 失败:', error.message);
  //     failed++;
  //   }
  //   console.log('');
  // });

  // 测试 6: sui_getObject
  // tests.push(async () => {
  //   console.log('测试 6: sui_getObject');
  //   try {
  //     const objectId = '0x0000000000000000000000000000000000000000000000000000000000000001';
  //     const result = await jsonRpcRequest('sui_getObject', [
  //       objectId,
  //       {
  //         showType: true,
  //         showOwner: true,
  //         showPreviousTransaction: true,
  //         showDisplay: true,
  //         showContent: true,
  //         showBcs: true,
  //         showStorageRebate: true
  //       }
  //     ]);
  //     console.log('✓ 成功:', JSON.stringify(result, null, 2));
  //     passed++;
  //   } catch (error) {
  //     console.log('✗ 失败:', error.message);
  //     failed++;
  //   }
  //   console.log('');
  // });

  // 测试 7: suix_getCoins
  // tests.push(async () => {
  //   console.log('测试 7: suix_getCoins');
  //   try {
  //     const result = await jsonRpcRequest('suix_getCoins', [
  //       '0x0000000000000000000000000000000000000000000000000000000000000001',
  //       '0x2::sui::SUI'
  //     ]);
  //     console.log('✓ 成功:', JSON.stringify(result, null, 2));
  //     passed++;
  //   } catch (error) {
  //     console.log('✗ 失败:', error.message);
  //     failed++;
  //   }
  //   console.log('');
  // });

  // 测试 8: suix_getReferenceGasPrice
  tests.push(async () => {
    console.log('测试 8: suix_getReferenceGasPrice');
    try {
      const result = await jsonRpcRequest('suix_getReferenceGasPrice', []);
      console.log('✓ 成功:', JSON.stringify(result, null, 2));
      passed++;
    } catch (error) {
      console.log('✗ 失败:', error.message);
      failed++;
    }
    console.log('');
  });

  // // 测试 9: sui_executeTransactionBlock
  // tests.push(async () => {
  //   console.log('测试 9: sui_executeTransactionBlock');
  //   console.log('⚠ 跳过: 需要实际的交易数据，跳过此测试');
  //   console.log('');
  // });

  // 测试 10: sui_getChainIdentifier
  tests.push(async () => {
    console.log('测试 10: sui_getChainIdentifier');
    try {
      const result = await jsonRpcRequest('sui_getChainIdentifier', []);
      console.log('✓ 成功:', JSON.stringify(result, null, 2));
      passed++;
    } catch (error) {
      console.log('✗ 失败:', error.message);
      failed++;
    }
    console.log('');
  });

  // // 测试 11: suix_getCoinMetadata
  // tests.push(async () => {
  //   console.log('测试 11: suix_getCoinMetadata');
  //   try {
  //     const result = await jsonRpcRequest('suix_getCoinMetadata', ['0x2::sui::SUI']);
  //     console.log('✓ 成功:', JSON.stringify(result, null, 2));
  //     passed++;
  //   } catch (error) {
  //     console.log('✗ 失败:', error.message);
  //     failed++;
  //   }
  //   console.log('');
  // });

  // 测试 12: 测试错误处理
  // tests.push(async () => {
  //   console.log('测试 12: 错误处理 - 无效的方法名');
  //   try {
  //     const result = await jsonRpcRequest('invalid_method', []);
  //     if (result.error) {
  //       console.log('✓ 成功返回错误:', JSON.stringify(result, null, 2));
  //       passed++;
  //     } else {
  //       console.log('✗ 失败: 应该返回错误');
  //       failed++;
  //     }
  //   } catch (error) {
  //     console.log('✗ 失败:', error.message);
  //     failed++;
  //   }
  //   console.log('');
  // });

  // 执行所有测试
  for (const test of tests) {
    await test();
  }

  // 输出测试结果
  console.log('='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`总计: ${passed + failed}`);
  console.log('='.repeat(60));
}

// 运行测试
runTests().catch(console.error);

