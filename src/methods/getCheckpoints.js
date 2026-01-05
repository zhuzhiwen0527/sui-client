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
          },
          // 获取完整数据，包括 transactions 和 summary
          readMask: {
            paths: [
              'digest',
              'sequence_number',
              'summary',
              'summary.epoch',
              'summary.total_network_transactions',
              'summary.previous_digest',
              'summary.epoch_rolling_gas_cost_summary',
              'summary.timestamp',
              'summary.commitments',
              'contents',
              'contents.transactions',
              'signature',
              'signature.signature',
              'signature.bitmap',
              'signature.epoch'
            ]
          }
        });
        
        if (result.response.checkpoint) {
          const checkpoint = result.response.checkpoint;
          // 转换为 JSON-RPC 格式（扁平化结构）
          const jsonRpcCheckpoint = {
            epoch: checkpoint.summary?.epoch?.toString() || checkpoint.epoch?.toString(),
            sequenceNumber: checkpoint.sequenceNumber?.toString() || checkpoint.summary?.sequenceNumber?.toString(),
            digest: checkpoint.digest || checkpoint.summary?.digest,
            networkTotalTransactions: checkpoint.summary?.totalNetworkTransactions?.toString(),
            previousDigest: checkpoint.summary?.previousDigest,
            epochRollingGasCostSummary: checkpoint.summary?.epochRollingGasCostSummary ? {
              computationCost: checkpoint.summary.epochRollingGasCostSummary.computationCost?.toString(),
              storageCost: checkpoint.summary.epochRollingGasCostSummary.storageCost?.toString(),
              storageRebate: checkpoint.summary.epochRollingGasCostSummary.storageRebate?.toString(),
              nonRefundableStorageFee: checkpoint.summary.epochRollingGasCostSummary.nonRefundableStorageFee?.toString()
            } : undefined,
            timestampMs: checkpoint.summary?.timestamp ? 
              (BigInt(checkpoint.summary.timestamp.seconds || 0) * 1000n + BigInt(Math.floor((checkpoint.summary.timestamp.nanos || 0) / 1000000))).toString() :
              undefined,
            transactions: checkpoint.contents?.transactions?.map(tx => tx.transaction).filter(Boolean) || 
                         checkpoint.transactions?.map(tx => tx.digest).filter(Boolean) || [],
            checkpointCommitments: checkpoint.summary?.commitments || [],
            validatorSignature: checkpoint.signature?.signature ? 
              Buffer.from(checkpoint.signature.signature).toString('base64') : 
              undefined
          };
          checkpoints.push(jsonRpcCheckpoint);
        }
      } catch (error) {
        console.error(`Error getting checkpoint ${sequence}:`, error.message);
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

