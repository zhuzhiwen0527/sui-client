import axios from 'axios';
import fs from 'fs';
import path from 'path';

const SUI_NODE_URL = 'https://fullnode.mainnet.sui.io';
const LOCAL_URL = 'http://localhost:3000';

const transactionHash = '224PhAWDYpFBFFiWo4ZL3apU66c67MnqtgvnmCMLQdrS';

// 输出文件路径
const OUTPUT_DIR = path.join(process.cwd(), 'test', 'transaction-comparison');
const SUI_RESULT_FILE = path.join(OUTPUT_DIR, 'sui-node-result.json');
const LOCAL_RESULT_FILE = path.join(OUTPUT_DIR, 'local-service-result.json');
const COMPARISON_FILE = path.join(OUTPUT_DIR, 'comparison.txt');

async function callJsonRpc(url, method, params) {
  try {
    const response = await axios.post(url, {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 1
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    console.error(`Error calling ${url}:`, error.message);
    throw error;
  }
}

function writeToFile(filePath, content) {
  // 确保目录存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ 已写入文件: ${filePath}`);
}

async function compareTransactionBlock() {
  console.log('='.repeat(80));
  console.log('对比 getTransactionBlock 方法返回值');
  console.log('='.repeat(80));
  console.log(`Transaction Hash: ${transactionHash}\n`);

  const options = {
    showInput: true,
    showRawInput: true,
    showEffects: true,
    showEvents: true,
    showObjectChanges: true,
    showBalanceChanges: true,
    showRawEffects: true
  };

  let comparisonOutput = [];
  
  try {
    // 调用 Sui 节点
    console.log('1. 调用 Sui 节点 JSON-RPC...');
    const suiResult = await callJsonRpc(SUI_NODE_URL, 'sui_getTransactionBlock', [transactionHash, options]);
    
    // 写入 Sui 节点结果
    writeToFile(SUI_RESULT_FILE, JSON.stringify(suiResult, null, 2));
    comparisonOutput.push('='.repeat(80));
    comparisonOutput.push('Sui 节点返回结果:');
    comparisonOutput.push('='.repeat(80));
    comparisonOutput.push(JSON.stringify(suiResult, null, 2));
    comparisonOutput.push('');
    
    // 调用本地服务
    console.log('2. 调用本地 JSON-RPC 服务...');
    const localResult = await callJsonRpc(LOCAL_URL, 'sui_getTransactionBlock', [transactionHash, options]);
    
    // 写入本地服务结果
    writeToFile(LOCAL_RESULT_FILE, JSON.stringify(localResult, null, 2));
    comparisonOutput.push('='.repeat(80));
    comparisonOutput.push('本地服务返回结果:');
    comparisonOutput.push('='.repeat(80));
    comparisonOutput.push(JSON.stringify(localResult, null, 2));
    comparisonOutput.push('');

    // 对比结构 - 以 Sui 节点为模板
    comparisonOutput.push('='.repeat(80));
    comparisonOutput.push('字段结构对比 (以 Sui 节点为模板):');
    comparisonOutput.push('='.repeat(80));
    
    if (suiResult.result && localResult.result) {
      const suiData = suiResult.result;
      const localData = localResult.result;
      const suiKeys = Object.keys(suiData).sort();
      const localKeys = Object.keys(localData).sort();
      
      comparisonOutput.push(`Sui 节点字段 (${suiKeys.length}): ${suiKeys.join(', ')}`);
      comparisonOutput.push(`本地服务字段 (${localKeys.length}): ${localKeys.join(', ')}`);
      comparisonOutput.push('');
      
      const missingInLocal = suiKeys.filter(k => !localKeys.includes(k));
      const extraInLocal = localKeys.filter(k => !suiKeys.includes(k));
      
      if (missingInLocal.length > 0) {
        comparisonOutput.push(`❌ 本地服务缺少的字段 (${missingInLocal.length}):`);
        for (const key of missingInLocal) {
          const suiValue = suiData[key];
          const suiType = Array.isArray(suiValue) ? 'Array' : typeof suiValue;
          const suiPreview = typeof suiValue === 'object' && suiValue !== null 
            ? JSON.stringify(suiValue).substring(0, 100) + '...'
            : String(suiValue).substring(0, 100);
          comparisonOutput.push(`  - ${key}: ${suiType} = ${suiPreview}`);
        }
        comparisonOutput.push('');
      } else {
        comparisonOutput.push('✓ 本地服务包含所有 Sui 节点的字段');
        comparisonOutput.push('');
      }
      
      if (extraInLocal.length > 0) {
        comparisonOutput.push(`⚠ 本地服务多余的字段 (${extraInLocal.length}): ${extraInLocal.join(', ')}`);
        comparisonOutput.push('');
      }
      
      // 详细对比每个字段
      comparisonOutput.push('='.repeat(80));
      comparisonOutput.push('字段详细对比 (以 Sui 节点为模板):');
      comparisonOutput.push('='.repeat(80));
      comparisonOutput.push('');
      
      for (const key of suiKeys) {
        const suiValue = suiData[key];
        const localValue = localData[key];
        
        comparisonOutput.push(`字段: ${key}`);
        comparisonOutput.push(`  Sui 节点: ${getValueDescription(suiValue)}`);
        comparisonOutput.push(`  本地服务: ${localValue !== undefined ? getValueDescription(localValue) : '❌ 缺失'}`);
        
        if (localValue === undefined) {
          comparisonOutput.push(`  ❌ 本地服务缺少此字段`);
        } else {
          const comparison = compareValues(suiValue, localValue, key);
          if (comparison.match) {
            comparisonOutput.push(`  ✓ 值匹配`);
          } else {
            comparisonOutput.push(`  ⚠ ${comparison.diff}`);
          }
        }
        comparisonOutput.push('');
      }

      // 总结
      comparisonOutput.push('='.repeat(80));
      comparisonOutput.push('对比总结:');
      comparisonOutput.push('='.repeat(80));
      
      const totalFields = suiKeys.length;
      const missingFields = missingInLocal.length;
      const matchingFields = totalFields - missingFields;
      
      comparisonOutput.push(`总字段数: ${totalFields}`);
      comparisonOutput.push(`匹配字段数: ${matchingFields}`);
      comparisonOutput.push(`缺失字段数: ${missingFields}`);
      comparisonOutput.push(`匹配率: ${((matchingFields / totalFields) * 100).toFixed(2)}%`);
      
      if (missingFields === 0) {
        comparisonOutput.push('');
        comparisonOutput.push('✓ 本地服务包含所有 Sui 节点的字段！');
      } else {
        comparisonOutput.push('');
        comparisonOutput.push(`❌ 本地服务缺少 ${missingFields} 个字段，需要修复！`);
      }
    } else {
      comparisonOutput.push('错误: 无法获取结果');
      if (suiResult.error) {
        comparisonOutput.push('Sui 节点错误: ' + JSON.stringify(suiResult.error, null, 2));
      }
      if (localResult.error) {
        comparisonOutput.push('本地服务错误: ' + JSON.stringify(localResult.error, null, 2));
      }
    }

    // 写入对比结果
    writeToFile(COMPARISON_FILE, comparisonOutput.join('\n'));
    
    console.log('\n' + '='.repeat(80));
    console.log('对比完成！结果已保存到文件:');
    console.log(`  - Sui 节点结果: ${SUI_RESULT_FILE}`);
    console.log(`  - 本地服务结果: ${LOCAL_RESULT_FILE}`);
    console.log(`  - 对比报告: ${COMPARISON_FILE}`);
    console.log('='.repeat(80));

  } catch (error) {
    const errorMsg = `对比失败: ${error.message}\n${error.stack || ''}`;
    console.error(errorMsg);
    writeToFile(COMPARISON_FILE, errorMsg);
  }
}

// 辅助函数：获取值的描述
function getValueDescription(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `Array(${value.length}) ${value.length > 0 ? JSON.stringify(value[0]).substring(0, 100) + '...' : '[]'}`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return `Object { ${keys.length} keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''} }`;
  }
  if (typeof value === 'string') {
    return `string(${value.length}) "${value.substring(0, 100)}${value.length > 100 ? '...' : ''}"`;
  }
  return `${typeof value} ${String(value).substring(0, 100)}`;
}

// 辅助函数：对比两个值
function compareValues(suiValue, localValue, fieldName) {
  if (suiValue === undefined && localValue === undefined) {
    return { match: true, diff: '' };
  }
  if (suiValue === undefined || localValue === undefined) {
    return { match: false, diff: '一方未定义' };
  }
  if (suiValue === null && localValue === null) {
    return { match: true, diff: '' };
  }
  if (suiValue === null || localValue === null) {
    return { match: false, diff: '一方为 null' };
  }
  
  const suiType = Array.isArray(suiValue) ? 'array' : typeof suiValue;
  const localType = Array.isArray(localValue) ? 'array' : typeof localValue;
  
  if (suiType !== localType) {
    return { match: false, diff: `类型不一致: Sui=${suiType}, 本地=${localType}` };
  }
  
  if (Array.isArray(suiValue) && Array.isArray(localValue)) {
    if (suiValue.length !== localValue.length) {
      return { match: false, diff: `数组长度不一致: Sui=${suiValue.length}, 本地=${localValue.length}` };
    }
    // 对于数组，只检查长度，不深入比较每个元素（太复杂）
    return { match: true, diff: '' };
  }
  
  if (typeof suiValue === 'object') {
    // 对于对象，检查键的数量
    const suiKeys = Object.keys(suiValue).sort();
    const localKeys = Object.keys(localValue).sort();
    if (suiKeys.length !== localKeys.length) {
      return { match: false, diff: `对象键数量不一致: Sui=${suiKeys.length}, 本地=${localKeys.length}` };
    }
    const missingKeys = suiKeys.filter(k => !localKeys.includes(k));
    if (missingKeys.length > 0) {
      return { match: false, diff: `对象缺少键: ${missingKeys.join(', ')}` };
    }
    // 对象结构匹配，但不深入比较值（太复杂）
    return { match: true, diff: '' };
  }
  
  // 基本类型直接比较
  if (suiValue === localValue) {
    return { match: true, diff: '' };
  }
  
  return { match: false, diff: `值不一致` };
}

// 运行对比
compareTransactionBlock().catch(console.error);

