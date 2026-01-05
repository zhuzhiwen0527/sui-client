/**
 * sui_executeTransactionBlock 处理器
 * 参数: [rawtx, [signature]]
 * 对应: GrpcCoreClient.executeTransaction
 */
export function createExecuteTransactionBlockHandler(grpcClient) {
  return async (params) => {
    const [rawtx, signatures = []] = params || [];
    
    if (!rawtx) {
      throw new Error('rawtx parameter is required');
    }
    
    console.log(`[gRPC] Calling GrpcCoreClient.executeTransaction`, { 
      rawtxLength: rawtx?.length || 0,
      signaturesCount: signatures.length 
    });
    
    // rawtx 可能是 base64 字符串或 Uint8Array
    let transactionBytes;
    if (typeof rawtx === 'string') {
      // 假设是 base64 编码，需要转换为 Uint8Array
      // 使用 Buffer 或手动解析 base64
      if (typeof Buffer !== 'undefined') {
        transactionBytes = Buffer.from(rawtx, 'base64');
      } else {
        // 浏览器环境，使用 atob
        const binaryString = atob(rawtx);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        transactionBytes = bytes;
      }
    } else if (rawtx instanceof Uint8Array) {
      transactionBytes = rawtx;
    } else if (Array.isArray(rawtx)) {
      transactionBytes = new Uint8Array(rawtx);
    } else {
      throw new Error('Invalid transaction format');
    }
    
    const result = await grpcClient.core.executeTransaction({
      transaction: transactionBytes,
      signatures: signatures.length > 0 ? signatures : []
    });
    
    return result;
  };
}

