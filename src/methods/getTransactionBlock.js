/**
 * sui_getTransactionBlock 处理器
 * 参数: [hash, { showInput, showRawInput, showEffects, showEvents, showObjectChanges, showBalanceChanges, showRawEffects }]
 * 对应: LedgerServiceClient.getTransaction
 */
export function createGetTransactionBlockHandler(grpcClient) {
  return async (params) => {
    const [digest, options = {}] = params || [];
    
    if (!digest) {
      throw new Error('digest parameter is required');
    }
    
    const {
      showInput = true,
      showRawInput = true,
      showEffects = true,
      showEvents = true,
      showObjectChanges = true,
      showBalanceChanges = true,
      showRawEffects = true
    } = options;
    
    console.log(`[gRPC] Calling LedgerServiceClient.getTransaction`, { digest, options });
    
    // 构建 readMask
    // 根据 ExecutedTransaction 类型定义（executed_transaction.d.ts），有效字段为：
    // 字段 1: digest
    // 字段 2: transaction (Transaction 类型)
    // 字段 3: signatures
    // 字段 4: effects (TransactionEffects 类型)
    // 字段 5: events
    // 字段 6: checkpoint
    // 字段 7: timestamp
    // 字段 8: balance_changes
    // 字段 9: objects (注意：是 objects，不是 object_changes)
    // 
    // Transaction 类型没有 raw_transaction 字段，只有 bcs 字段
    // TransactionEffects 类型没有 raw_effects 字段，只有 bcs 字段
    const readMaskPaths = [];
    if (showInput || showRawInput) readMaskPaths.push('transaction'); // 字段 2
    if (showEffects || showRawEffects) readMaskPaths.push('effects'); // 字段 4
    if (showEvents) readMaskPaths.push('events'); // 字段 5
    if (showObjectChanges) readMaskPaths.push('objects'); // 字段 9，注意：是 objects 不是 object_changes
    if (showBalanceChanges) readMaskPaths.push('balance_changes'); // 字段 8
    // Transaction 类型没有 raw_transaction，如果需要原始数据，使用 transaction.bcs
    if (showRawInput) readMaskPaths.push('transaction.bcs'); // Transaction 字段 1
    // TransactionEffects 类型没有 raw_effects，如果需要原始数据，使用 effects.bcs
    if (showRawEffects) readMaskPaths.push('effects.bcs'); // TransactionEffects 字段 1
    
    const result = await grpcClient.ledgerService.getTransaction({
      digest: digest,
      readMask: readMaskPaths.length > 0 ? { paths: readMaskPaths } : undefined
    });
    
    return result.response;
  };
}

