/**
 * suix_getCoins 处理器
 * 参数: [address, coinType, cursor]
 * 对应: GrpcCoreClient.getCoins
 * JSON-RPC 返回格式: { data: [...], nextCursor: ..., hasNextPage: ... }
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
    
    // 转换为 JSON-RPC 格式
    // JSON-RPC 使用 data 而不是 objects，字段名也不同
    const data = result.objects.map(coin => {
      // 提取 coinType，去掉 0x2::coin::Coin<> 或 0x0000...0002::coin::Coin<> 包装
      let extractedCoinType = coinType;
      if (coin.type) {
        // 匹配 0x2::coin::Coin<...> 或 0x0000...0002::coin::Coin<...>
        // 使用非贪婪匹配，确保正确提取内部类型
        const match = coin.type.match(/0x[0-9a-fA-F]+::coin::Coin<([^>]+)>/);
        if (match && match[1]) {
          extractedCoinType = match[1];
        } else {
          // 如果没有匹配到，使用原始类型
          extractedCoinType = coin.type;
        }
      }
      
      // 统一 coinType 格式：将 0x0000...0002 转换为 0x2
      if (extractedCoinType.startsWith('0x0000000000000000000000000000000000000000000000000000000000000002::')) {
        extractedCoinType = extractedCoinType.replace('0x0000000000000000000000000000000000000000000000000000000000000002::', '0x2::');
      }
      
      return {
        coinType: extractedCoinType,
        coinObjectId: coin.id,
        version: coin.version,
        digest: coin.digest,
        balance: coin.balance,
        previousTransaction: coin.previousTransaction
      };
    });
    
    return {
      data: data,
      nextCursor: result.cursor,
      hasNextPage: result.hasNextPage
    };
  };
}

