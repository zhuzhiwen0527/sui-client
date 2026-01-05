/**
 * sui_tryGetPastObject 处理器
 * 参数: [id, version, { showType, showOwner, showPreviousTransaction, showDisplay, showContent, showBcs, showStorageRebate }]
 * 对应: LedgerServiceClient.getObject
 */
export function createTryGetPastObjectHandler(grpcClient) {
  return async (params) => {
    const [id, version, options = {}] = params || [];
    
    if (!id) {
      throw new Error('id parameter is required');
    }
    
    if (version === undefined || version === null) {
      throw new Error('version parameter is required');
    }
    
    const {
      showType = true,
      showOwner = true,
      showPreviousTransaction = true,
      showDisplay = true,
      showContent = true,
      showBcs = true,
      showStorageRebate = true
    } = options;
    
    console.log(`[gRPC] Calling LedgerServiceClient.getObject (past)`, { id, version, options });
    
    // 构建 readMask
    // 根据 Object 类型定义（object.d.ts），有效字段为：
    // 字段 1: bcs
    // 字段 2: object_id
    // 字段 3: version
    // 字段 4: digest
    // 字段 5: owner
    // 字段 6: object_type
    // 字段 8: contents (注意：不是 content)
    // 字段 10: previous_transaction
    // 字段 11: storage_rebate
    // 字段 100: json
    // 字段 101: balance
    // 注意：display 不是有效字段，已被移除
    const readMaskPaths = [];
    if (showType) readMaskPaths.push('object_type'); // 字段 6
    if (showOwner) readMaskPaths.push('owner'); // 字段 5
    if (showPreviousTransaction) readMaskPaths.push('previous_transaction'); // 字段 10
    // display 不是有效的 readMask 路径，已移除
    if (showContent) readMaskPaths.push('contents'); // 字段 8，注意：是 contents 不是 content
    if (showBcs) readMaskPaths.push('bcs'); // 字段 1
    if (showStorageRebate) readMaskPaths.push('storage_rebate'); // 字段 11
    
    const versionBigInt = typeof version === 'string' ? BigInt(version) : BigInt(version);
    
    const result = await grpcClient.ledgerService.getObject({
      objectId: id,
      version: versionBigInt,
      readMask: readMaskPaths.length > 0 ? { paths: readMaskPaths } : undefined
    });
    
    return result.response;
  };
}

