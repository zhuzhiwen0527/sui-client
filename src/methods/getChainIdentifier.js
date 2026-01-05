/**
 * sui_getChainIdentifier 处理器
 * 参数: []
 * 对应: GrpcCoreClient.getServiceInfo
 */
export function createGetChainIdentifierHandler(grpcClient) {
  return async (params) => {
    console.log(`[gRPC] Calling LedgerServiceClient.getServiceInfo`);
    
    const result = await grpcClient.ledgerService.getServiceInfo({});
    
    // 从 serviceInfo 中提取 chainIdentifier
    return {
      chainIdentifier: result.response.chainId || ''
    };
  };
}

