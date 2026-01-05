/**
 * 网络调用日志中间件
 */
export function createLoggingMiddleware() {
  return async (ctx, next) => {
    const start = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 记录请求
    console.log(`[${new Date().toISOString()}] [REQUEST ${requestId}]`, {
      method: ctx.method,
      url: ctx.url,
      headers: ctx.headers,
      body: ctx.request.body
    });

    try {
      await next();
      
      const duration = Date.now() - start;
      
      // 记录响应
      console.log(`[${new Date().toISOString()}] [RESPONSE ${requestId}]`, {
        status: ctx.status,
        duration: `${duration}ms`,
        body: ctx.body
      });
    } catch (error) {
      const duration = Date.now() - start;
      
      // 记录错误
      console.error(`[${new Date().toISOString()}] [ERROR ${requestId}]`, {
        status: ctx.status,
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  };
}

