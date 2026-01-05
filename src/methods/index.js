import { createGetBalanceHandler } from './getBalance.js';
import { createGetCheckpointsHandler } from './getCheckpoints.js';
import { createGetCheckpointHandler } from './getCheckpoint.js';
import { createGetTransactionBlockHandler } from './getTransactionBlock.js';
import { createTryGetPastObjectHandler } from './tryGetPastObject.js';
import { createGetObjectHandler } from './getObject.js';
import { createGetCoinsHandler } from './getCoins.js';
import { createGetReferenceGasPriceHandler } from './getReferenceGasPrice.js';
import { createExecuteTransactionBlockHandler } from './executeTransactionBlock.js';
import { createGetChainIdentifierHandler } from './getChainIdentifier.js';
import { createGetCoinMetadataHandler } from './getCoinMetadata.js';

/**
 * 创建所有方法处理器
 */
export function createMethodHandlers(grpcClient) {
  return {
    'suix_getBalance': createGetBalanceHandler(grpcClient),
    'sui_getCheckpoints': createGetCheckpointsHandler(grpcClient),
    'sui_getCheckpoint': createGetCheckpointHandler(grpcClient),
    'sui_getTransactionBlock': createGetTransactionBlockHandler(grpcClient),
    'sui_tryGetPastObject': createTryGetPastObjectHandler(grpcClient),
    'sui_getObject': createGetObjectHandler(grpcClient),
    'suix_getCoins': createGetCoinsHandler(grpcClient),
    'suix_getReferenceGasPrice': createGetReferenceGasPriceHandler(grpcClient),
    'sui_executeTransactionBlock': createExecuteTransactionBlockHandler(grpcClient),
    'sui_getChainIdentifier': createGetChainIdentifierHandler(grpcClient),
    'suix_getCoinMetadata': createGetCoinMetadataHandler(grpcClient)
  };
}

