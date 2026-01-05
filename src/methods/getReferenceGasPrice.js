/**
 * suix_getReferenceGasPrice 处理器
 * 参数: []
 * 对应: GrpcCoreClient.getReferenceGasPrice
 * JSON-RPC 返回格式: 字符串，如 "506"
 */
export function createGetReferenceGasPriceHandler(grpcClient) {
  return async (params) => {
    console.log(`[gRPC] Calling GrpcCoreClient.getReferenceGasPrice`);
    
    const result = await grpcClient.core.getReferenceGasPrice();
    
    // JSON-RPC 返回字符串格式，不是对象
    return result.referenceGasPrice || '0';
  };
}

