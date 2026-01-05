import { Transaction } from "@mysten/sui/transactions";

/**
 * sui_getCheckpoint 处理器
 * 参数: [hash]
 * 对应: LedgerServiceClient.getCheckpoint
 */
export function createGetCheckpointHandler(grpcClient) {
  return async (params) => {
    const [checkpointId] = params || [];
    
    if (!checkpointId) {
      throw new Error('checkpointId parameter is required');
    }
    
    console.log(`[gRPC] Calling LedgerServiceClient.getCheckpoint`, { checkpointId });
    
    // checkpointId 可能是序列号（数字）或 digest（字符串）
    let request;
    if (typeof checkpointId === 'string' && checkpointId.match(/^\d+$/)) {
      // 纯数字字符串，作为序列号
      request = {
        checkpointId: {
          oneofKind: 'sequenceNumber',
          sequenceNumber: BigInt(checkpointId)
        },
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
      };
    } else if (typeof checkpointId === 'string') {
      // 字符串，作为 digest
      request = {
        checkpointId: {
          oneofKind: 'digest',
          digest: checkpointId
        },
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
      };
    } else {
      // 数字，作为序列号
      request = {
        checkpointId: {
          oneofKind: 'sequenceNumber',
          sequenceNumber: BigInt(checkpointId)
        },
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
      };
    }
    
    const result = await grpcClient.ledgerService.getCheckpoint(request);
    
    if (!result.response.checkpoint) {
      return null;
    }
    
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
    
    // JSON-RPC 直接返回 checkpoint 数据，不包装
    return jsonRpcCheckpoint;
  };
}
