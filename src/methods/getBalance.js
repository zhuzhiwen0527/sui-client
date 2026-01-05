/**
 * suix_getBalance 处理器
 * 参数: [address, contractAddress]
 * 对应: StateServiceClient.getBalance
 * JSON-RPC 返回格式: { coinType, coinObjectCount, totalBalance, lockedBalance }
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
    
    const balance = result.response.balance;
    if (!balance) {
      return {
        coinType: contractAddress || '0x2::sui::SUI',
        coinObjectCount: 0,
        totalBalance: '0',
        lockedBalance: {}
      };
    }
    
    // 获取 coinObjectCount，需要调用 getCoins
    let coinObjectCount = 0;
    try {
      const coinsResult = await grpcClient.core.getCoins({
        address: address,
        coinType: contractAddress || '0x2::sui::SUI',
        cursor: null
      });
      coinObjectCount = coinsResult.objects.length;
    } catch (error) {
      // 如果获取失败，使用默认值
      coinObjectCount = balance.balance && balance.balance > 0n ? 1 : 0;
    }
    
    // 转换为 JSON-RPC 格式
    // 统一 coinType 格式：将 0x0000...0002 转换为 0x2
    let normalizedCoinType = balance.coinType || contractAddress || '0x2::sui::SUI';
    if (normalizedCoinType.startsWith('0x0000000000000000000000000000000000000000000000000000000000000002::')) {
      normalizedCoinType = normalizedCoinType.replace('0x0000000000000000000000000000000000000000000000000000000000000002::', '0x2::');
    }
    
    return {
      coinType: normalizedCoinType,
      coinObjectCount: coinObjectCount,
      totalBalance: balance.balance?.toString() || '0',
      lockedBalance: {} // gRPC 不返回 locked balance
    };
  };
}

