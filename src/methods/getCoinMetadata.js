/**
 * suix_getCoinMetadata 处理器
 * 参数: [coinType]
 * 对应: StateServiceClient.getCoinInfo
 * JSON-RPC 返回格式: 直接返回 metadata 对象，如 { decimals, name, symbol, description, iconUrl, id }
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
    
    const response = result.response;
    
    // JSON-RPC 返回格式：直接返回 metadata 对象
    if (response.metadata) {
      return {
        decimals: response.metadata.decimals,
        name: response.metadata.name,
        symbol: response.metadata.symbol,
        description: response.metadata.description,
        iconUrl: response.metadata.iconUrl,
        id: response.metadata.id
      };
    }
    
    // 如果没有 metadata，返回空对象
    return {};
  };
}

