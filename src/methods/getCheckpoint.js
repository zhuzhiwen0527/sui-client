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
        readMask: { paths: ['digest', 'sequence_number', 'summary.timestamp', 'summary.previous_digest', 
        ] }
      };
    } else if (typeof checkpointId === 'string') {
      // 字符串，作为 digest
      request = {
        checkpointId: {
          oneofKind: 'digest',
          digest: checkpointId
        },
        readMask: { paths: ['digest', 'sequence_number', 'summary.timestamp', 'summary.previous_digest', 
        ] }
        }
    } else {
      // 数字，作为序列号
      request = {
        checkpointId: {
          oneofKind: 'sequenceNumber',
          sequenceNumber: BigInt(checkpointId)
        },      
        readMask: { paths: ['digest', 'sequence_number', 'summary.timestamp', 'summary.previous_digest', 
           ] }
        }
    }
    
    const result = await grpcClient.ledgerService.getCheckpoint(request);
    
    return result.response;
  };
}
