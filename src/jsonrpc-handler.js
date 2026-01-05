import { SuiGrpcClient } from '@mysten/sui/grpc';
import { createMethodHandlers } from './methods/index.js';

const SUI_GRPC_URL = process.env.SUI_GRPC_URL || 'https://fullnode.mainnet.sui.io:443';
const SUI_NETWORK = process.env.SUI_NETWORK || 'mainnet';

/**
 * 将 gRPC 响应转换为 JSON 格式
 */
function grpcToJson(grpcResponse) {
  if (grpcResponse === null || grpcResponse === undefined) {
    return null;
  }
  
  // 处理 BigInt - 转换为字符串
  if (typeof grpcResponse === 'bigint') {
    return grpcResponse.toString();
  }
  
  // 如果已经是普通对象，直接返回
  if (typeof grpcResponse !== 'object') {
    return grpcResponse;
  }
  
  // 处理 Buffer/Uint8Array
  if (grpcResponse instanceof Uint8Array || Buffer.isBuffer(grpcResponse)) {
    return Array.from(grpcResponse);
  }
  
  // 递归处理对象
  if (Array.isArray(grpcResponse)) {
    return grpcResponse.map(item => grpcToJson(item));
  }
  
  const result = {};
  for (const [key, value] of Object.entries(grpcResponse)) {
    // 处理 BigInt
    if (typeof value === 'bigint') {
      result[key] = value.toString();
    } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      result[key] = Array.from(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = grpcToJson(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * 创建 JSON-RPC 处理器
 */
export function createJsonRpcHandler() {
  // 初始化 Sui gRPC 客户端
  const grpcClient = new SuiGrpcClient({
    network: SUI_NETWORK,
    baseUrl: SUI_GRPC_URL
  });
  
  const methodHandlers = createMethodHandlers(grpcClient);
  
  return {
    async handle(request) {
      // 支持批量请求
      if (Array.isArray(request)) {
        return Promise.all(request.map(req => this.handleSingle(req)));
      }
      
      return this.handleSingle(request);
    },
    
    async handleSingle(request) {
      const { jsonrpc, method, params, id } = request;
      
      if (jsonrpc !== '2.0') {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request'
          },
          id: id || null
        };
      }
      
      if (!method) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: method is required'
          },
          id: id || null
        };
      }
      
      const handler = methodHandlers[method];
      
      if (!handler) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          },
          id: id || null
        };
      }
      
      try {
        console.log(`[JSON-RPC] Handling method: ${method}`, { params });
        const result = await handler(params || []);
        const jsonResult = grpcToJson(result);
        
        console.log(`[JSON-RPC] Method ${method} completed successfully`);
        
        return {
          jsonrpc: '2.0',
          result: jsonResult,
          id: id || null
        };
      } catch (error) {
        console.error(`[JSON-RPC] Method ${method} failed:`, error);
        
        return {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: error.message
          },
          id: id || null
        };
      }
    }
  };
}

