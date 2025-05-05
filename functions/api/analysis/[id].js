export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;
  
  // 添加 CORS 头
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  
  // 处理 OPTIONS 请求（预检请求）
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // 只处理 GET 请求
  if (request.method !== "GET") {
    return new Response(JSON.stringify({
      success: false,
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  
  try {
    console.log(`获取分析结果，ID: ${id}`);
    
    // 从 KV 存储中获取分析结果
    const result = await env.CHAT_ANALYSIS_STORAGE.get(`analysis:${id}`, { type: "json" });
    
    if (!result) {
      console.error(`找不到分析结果，ID: ${id}`);
      return new Response(JSON.stringify({
        success: false,
        error: "Analysis not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    console.log(`成功获取分析结果，ID: ${id}`);
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(`获取分析结果时出错，ID: ${id}`, error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error retrieving analysis: " + (error.message || "Unknown error")
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
