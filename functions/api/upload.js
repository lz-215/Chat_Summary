export async function onRequest(context) {
  const { request, env } = context;
  
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
  
  // 只处理 POST 请求
  if (request.method !== "POST") {
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
    console.log("处理文件上传请求");
    
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get("file");
    const fileName = formData.get("fileName") || "uploaded_file.txt";
    
    console.log("表单字段:", Array.from(formData.keys()));
    
    if (!file || !(file instanceof File)) {
      console.error("没有接收到文件");
      return new Response(JSON.stringify({
        success: false,
        error: "No file uploaded"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    console.log("文件信息:", {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // 检查文件类型
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (ext !== ".txt") {
      console.error("不支持的文件类型:", ext);
      return new Response(JSON.stringify({
        success: false,
        error: `Unsupported file format: ${ext}. Only TXT files are supported.`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // 读取文件内容
    const fileContent = await file.text();
    
    // 生成文件ID和分析ID
    const fileId = Date.now().toString();
    const analysisId = `analysis_${fileId}`;
    
    // 创建一个简单的分析结果
    const analysisResult = {
      id: analysisId,
      timestamp: new Date().toISOString(),
      language: "zh",
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        messageCount: fileContent.split("\n").length
      },
      statistics: {
        totalMessages: fileContent.split("\n").length,
        messageCountByParticipant: {}
      },
      top_keywords: {},
      sentiment: {
        overall: 0,
        byParticipant: {}
      },
      summary: "这是一个自动生成的聊天记录摘要。由于当前环境限制，无法执行完整的分析。",
      events: [
        {
          time: "",
          sender: "System",
          content: "文件已成功上传并保存",
          type: "Info"
        }
      ],
      total_messages: fileContent.split("\n").length,
      senders: {}
    };
    
    // 保存文件内容和分析结果到KV存储
    try {
      await Promise.all([
        env.CHAT_ANALYSIS_STORAGE.put(`upload:${fileId}`, fileContent),
        env.CHAT_ANALYSIS_STORAGE.put(`analysis:${analysisId}`, JSON.stringify(analysisResult))
      ]);
      console.log(`文件和分析结果已保存，ID: ${fileId}, ${analysisId}`);
    } catch (storageError) {
      console.error("保存数据时出错:", storageError);
      throw new Error("Failed to save data: " + storageError.message);
    }
    
    // 返回成功响应
    return new Response(JSON.stringify({
      success: true,
      file_id: fileId,
      analysis_id: analysisId,
      message: "File uploaded and analyzed successfully"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("处理上传请求时出错:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error processing upload request: " + (error.message || "Unknown error")
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
