/**
 * suix_getCoinMetadata 处理器
 * 参数: [address]
 * 对应: StateServiceClient.getCoinInfo
 */
export function createGetCoinMetadataHandler(grpcClient) {
  return async (params) => {
    const [coinType] = params || [];
    
    if (!coinType) {
      throw new Error('coinType parameter is required');
    }
    
    console.log(`[gRPC] Calling StateServiceClient.getCoinInfo`, { coinType });
    
    const result = await grpcClient.stateService.getCoinInfo({
      coinType: coinType
    });
    
    return result.response;
  };
}

