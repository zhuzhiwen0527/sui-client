/**
 * sui_getChainIdentifier 处理器
 * 参数: []
 * 对应: LedgerServiceClient.getServiceInfo
 * JSON-RPC 返回格式: 字符串，如 "35834a8a"
 * 注意: chainIdentifier 是 genesis checkpoint (sequence 0) 的 digest
 */
export function createGetChainIdentifierHandler(grpcClient) {
  return async (params) => {
    console.log(`[gRPC] Calling LedgerServiceClient.getServiceInfo`);
    
    try {
      // 获取 genesis checkpoint (sequence 0) 的 digest
      const genesisResult = await grpcClient.ledgerService.getCheckpoint({
        checkpointId: {
          oneofKind: 'sequenceNumber',
          sequenceNumber: 0n
        },
        readMask: {
          paths: ['digest']
        }
      });
      
      if (genesisResult.response.checkpoint?.digest) {
        // chainIdentifier 是 genesis checkpoint digest 的前 8 个字符（base64 编码）
        const digest = genesisResult.response.checkpoint.digest;
        // 如果 digest 是 base64 编码的，取前 8 个字符
        // 否则返回完整 digest
        return digest.length > 8 ? digest.substring(0, 8) : digest;
      }
      
      // 如果无法获取，尝试从 serviceInfo 获取 chainId
      const serviceInfo = await grpcClient.ledgerService.getServiceInfo({});
      return serviceInfo.response.chainId || '';
    } catch (error) {
      console.error('Error getting chain identifier:', error.message);
      // 如果获取失败，返回空字符串
      return '';
    }
  };
}

