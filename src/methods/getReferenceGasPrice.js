/**
 * suix_getReferenceGasPrice 处理器
 * 参数: []
 * 对应: GrpcCoreClient.getReferenceGasPrice
 */
export function createGetReferenceGasPriceHandler(grpcClient) {
  return async (params) => {
    console.log(`[gRPC] Calling GrpcCoreClient.getReferenceGasPrice`);
    
    const result = await grpcClient.core.getReferenceGasPrice();
    
    return result;
  };
}

