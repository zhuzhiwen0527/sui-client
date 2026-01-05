/**
 * suix_getCoins 处理器
 * 参数: [address, coinType, cursor]
 * 对应: GrpcCoreClient.getCoins
 */
export function createGetCoinsHandler(grpcClient) {
  return async (params) => {
    const [address, coinType = '0x2::sui::SUI', cursor] = params || [];
    
    if (!address) {
      throw new Error('address parameter is required');
    }
    
    console.log(`[gRPC] Calling GrpcCoreClient.getCoins`, { address, coinType, cursor });
    
    const result = await grpcClient.core.getCoins({
      address: address,
      coinType: coinType,
      cursor: cursor || null
    });
    
    return result;
  };
}

