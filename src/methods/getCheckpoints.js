/**
 * sui_getCheckpoints 处理器
 * 参数: [cursor, limit, descending]
 * 对应: LedgerServiceClient.getCheckpoint (多次调用)
 * 注意: gRPC API 只支持获取单个 checkpoint，这里通过获取服务信息获取最新序列号，然后获取多个
 */
export function createGetCheckpointsHandler(grpcClient) {
  return async (params) => {
    const [cursor, limit = 1, descending = true] = params || [];
    
    console.log(`[gRPC] Calling LedgerServiceClient.getCheckpoints`, { cursor, limit, descending });
    
    // 先获取服务信息以获取最新的 checkpoint 序列号
    const serviceInfo = await grpcClient.ledgerService.getServiceInfo({});
    const latestSequence = serviceInfo.response.checkpointHeight;
    
    if (latestSequence === undefined) {
      throw new Error('Unable to get latest checkpoint sequence');
    }
    
    // 根据 cursor 确定起始序列号
    let startSequence;
    if (cursor) {
      // cursor 可能是序列号字符串
      startSequence = BigInt(cursor);
    } else {
      startSequence = latestSequence;
    }
    
    // 获取多个 checkpoint
    const checkpoints = [];
    const count = Math.min(Number(limit), 100); // 限制最多 100 个
    
    for (let i = 0; i < count; i++) {
      const sequence = descending 
        ? startSequence - BigInt(i)
        : startSequence + BigInt(i);
      
      if (sequence < 0) break;
      
      try {
        const result = await grpcClient.ledgerService.getCheckpoint({
          checkpointId: {
            oneofKind: 'sequenceNumber',
            sequenceNumber: sequence
          }
        });
        
        if (result.response.checkpoint) {
          checkpoints.push(result.response.checkpoint);
        }
      } catch (error) {
        // 如果 checkpoint 不存在，停止
        break;
      }
    }
    
    return {
      data: checkpoints,
      nextCursor: checkpoints.length > 0 
        ? (descending ? (startSequence - BigInt(checkpoints.length)).toString() : (startSequence + BigInt(checkpoints.length)).toString())
        : null,
      hasNextPage: checkpoints.length === count
    };
  };
}

