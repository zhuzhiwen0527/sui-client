/**
 * sui_getTransactionBlock 处理器
 * 参数: [hash, { showInput, showRawInput, showEffects, showEvents, showObjectChanges, showBalanceChanges, showRawEffects }]
 * 对应: LedgerServiceClient.getTransaction
 */
export function createGetTransactionBlockHandler(grpcClient) {
  return async (params) => {
    const [digest, options = {}] = params || [];
    
    if (!digest) {
      throw new Error('digest parameter is required');
    }
    
    const {
      showInput = true,
      showRawInput = true,
      showEffects = true,
      showEvents = true,
      showObjectChanges = true,
      showBalanceChanges = true,
      showRawEffects = true
    } = options;
    
    console.log(`[gRPC] Calling LedgerServiceClient.getTransaction`, { digest, options });
    
    // 构建 readMask
    // 根据 ExecutedTransaction 类型定义（executed_transaction.d.ts），有效字段为：
    // 字段 1: digest
    // 字段 2: transaction (Transaction 类型)
    // 字段 3: signatures
    // 字段 4: effects (TransactionEffects 类型)
    // 字段 5: events
    // 字段 6: checkpoint
    // 字段 7: timestamp
    // 字段 8: balance_changes
    // 字段 9: objects (注意：是 objects，不是 object_changes)
    // 
    // Transaction 类型没有 raw_transaction 字段，只有 bcs 字段
    // TransactionEffects 类型没有 raw_effects 字段，只有 bcs 字段
    const readMaskPaths = [];
    
    // 始终需要 digest（顶层字段）
    readMaskPaths.push('digest');
    
    if (showInput || showRawInput) {
      readMaskPaths.push('transaction'); // 字段 2
      if (showRawInput) {
        readMaskPaths.push('transaction.bcs'); // Transaction 的 BCS 字段
      }
    }
    
    // signatures 需要包含（用于 txSignatures）
    readMaskPaths.push('signatures');
    
    if (showEffects || showRawEffects) {
      readMaskPaths.push('effects'); // 字段 4
      if (showRawEffects) {
        readMaskPaths.push('effects.bcs'); // TransactionEffects 的 BCS 字段
      }
    }
    
    if (showEvents) {
      readMaskPaths.push('events'); // 字段 5
    }
    
    if (showObjectChanges) {
      readMaskPaths.push('objects'); // 字段 9，注意：是 objects 不是 object_changes
    }
    
    if (showBalanceChanges) {
      readMaskPaths.push('balance_changes'); // 字段 8
    }
    
    // checkpoint 和 timestamp 也需要包含
    readMaskPaths.push('checkpoint'); // 字段 6
    readMaskPaths.push('timestamp'); // 字段 7
    
    const result = await grpcClient.ledgerService.getTransaction({
      digest: digest,
      readMask: readMaskPaths.length > 0 ? { paths: readMaskPaths } : undefined
    });
    
    // GetTransactionResponse 包含 transaction 字段（ExecutedTransaction 类型）
    // JSON-RPC 直接返回 ExecutedTransaction，不包装在 response 中
    if (!result.response.transaction) {
      throw new Error('Transaction not found');
    }
    
    const executedTx = result.response.transaction;
    
    // 转换为 JSON-RPC 格式
    // JSON-RPC 格式与 gRPC 格式不同，需要转换：
    // 1. transaction: gRPC 返回 Transaction 对象，JSON-RPC 需要 {data, txSignatures}
    // 2. events: gRPC 返回 TransactionEvents 对象，JSON-RPC 需要 events 数组
    // 3. rawTransaction: 从 transaction.bcs 转换为 base64 字符串
    // 4. rawEffects: 从 effects.bcs 转换为数组
    // 5. objectChanges: 从 objects 转换为 objectChanges 格式
    
    // 提取顶层字段
    const txDigest = executedTx.digest;
    const checkpoint = executedTx.checkpoint?.toString();
    const timestampMs = executedTx.timestamp ? 
      (BigInt(executedTx.timestamp.seconds || 0) * 1000n + BigInt(Math.floor((executedTx.timestamp.nanos || 0) / 1000000))).toString() :
      undefined;
    
    // 转换 transaction: gRPC 的 Transaction 对象 -> JSON-RPC 的 {data, txSignatures}
    let transactionData = undefined;
    let txSignatures = undefined;
    if (executedTx.transaction) {
      const tx = executedTx.transaction;
      // JSON-RPC 的 transaction.data 需要从 Transaction 对象构建
      // 如果 transaction 有 json 字段，使用它；否则需要从其他字段构建
      if (tx.json) {
        transactionData = tx.json;
      } else {
        // 从 Transaction 字段构建 data 对象
        transactionData = {
          messageVersion: tx.version === 1 ? 'v1' : 'v2',
          transaction: tx.kind ? {
            kind: tx.kind.data?.oneofKind === 'programmableTransaction' ? 'ProgrammableTransaction' : 
                  tx.kind.data?.oneofKind === 'changeEpoch' ? 'ChangeEpoch' :
                  tx.kind.data?.oneofKind === 'genesis' ? 'Genesis' :
                  tx.kind.data?.oneofKind === 'consensusCommitPrologue' ? 'ConsensusCommitPrologue' : undefined,
            // 需要根据 kind 类型提取具体数据
            ...(tx.kind?.data?.programmableTransaction || {})
          } : undefined,
          sender: tx.sender,
          gasData: tx.gasPayment ? {
            payment: tx.gasPayment.objects,
            owner: tx.gasPayment.owner,
            price: tx.gasPayment.price?.toString(),
            budget: tx.gasPayment.budget?.toString()
          } : undefined,
          expiration: tx.expiration
        };
      }
      
      // 转换 signatures: gRPC 的 UserSignature[] -> JSON-RPC 的 base64 字符串数组
      if (executedTx.signatures && executedTx.signatures.length > 0) {
        txSignatures = executedTx.signatures.map(sig => {
          // UserSignature 需要转换为 base64 字符串
          if (sig.bcs?.value) {
            return Buffer.from(sig.bcs.value).toString('base64');
          } else if (sig.signature?.oneofKind === 'simple' && sig.signature.simple?.signature) {
            return Buffer.from(sig.signature.simple.signature).toString('base64');
          }
          return '';
        }).filter(Boolean);
      }
    }
    
    // 转换 rawTransaction: 从 transaction.bcs 提取
    let rawTransaction = undefined;
    if (executedTx.transaction?.bcs?.value) {
      rawTransaction = Buffer.from(executedTx.transaction.bcs.value).toString('base64');
    }
    
    // 转换 events: gRPC 的 TransactionEvents 对象 -> JSON-RPC 的 events 数组
    let eventsArray = undefined;
    if (executedTx.events) {
      // events 可能是 TransactionEvents 对象，包含 events 数组
      if (executedTx.events.events && Array.isArray(executedTx.events.events)) {
        eventsArray = executedTx.events.events;
      } else if (Array.isArray(executedTx.events)) {
        eventsArray = executedTx.events;
      }
    }
    
    // 转换 rawEffects: 从 effects.bcs 提取
    let rawEffects = undefined;
    if (executedTx.effects?.bcs?.value) {
      rawEffects = Array.from(executedTx.effects.bcs.value);
    }
    
    // 转换 effects: 保持 effects 对象，但可能需要调整格式
    let effectsData = executedTx.effects;
    
    // 转换 objectChanges: 从 objects 提取
    let objectChanges = undefined;
    if (executedTx.objects?.objects && Array.isArray(executedTx.objects.objects)) {
      objectChanges = executedTx.objects.objects;
    }
    
    // 构建 JSON-RPC 结果
    const jsonRpcResult = {
      digest: txDigest,
      transaction: transactionData ? {
        data: transactionData,
        txSignatures: txSignatures || []
      } : undefined,
      effects: effectsData,
      events: eventsArray,
      checkpoint: checkpoint,
      timestampMs: timestampMs,
      balanceChanges: executedTx.balanceChanges,
      objectChanges: objectChanges,
      rawTransaction: rawTransaction,
      rawEffects: rawEffects
    };
    
    return jsonRpcResult;
  };
}

