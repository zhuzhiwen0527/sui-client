/**
 * suix_getBalance 处理器
 * 参数: [address, contractAddress]
 * 对应: StateServiceClient.getBalance
 */
export function createGetBalanceHandler(grpcClient) {
  return async (params) => {
    const [address, contractAddress] = params || [];
    
    if (!address) {
      throw new Error('address parameter is required');
    }
    
    console.log(`[gRPC] Calling StateServiceClient.getBalance`, { address, contractAddress });
    
    const result = await grpcClient.stateService.getBalance({
      owner: address,
      coinType: contractAddress || '0x2::sui::SUI'
    });
    
    return result.response;
  };
}

