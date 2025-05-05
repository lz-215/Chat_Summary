# 聊天分析工具 API 参考文档

## API 概述

聊天分析工具提供了一组 RESTful API，允许开发者上传聊天记录文件并获取分析结果。所有 API 响应均为 JSON 格式。

## 基础 URL

```
http://localhost:3000/api
```

在生产环境中，请将 `localhost:3000` 替换为实际的服务器地址。

## 认证

目前 API 不需要认证。在未来版本中可能会添加认证机制。

## API 端点

### 上传聊天文件

上传聊天记录文件并进行分析。

**URL**: `/upload-chat`

**方法**: `POST`

**Content-Type**: `multipart/form-data`

**参数**:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| file   | File | 是   | 要上传的聊天记录文件（HTML或TXT格式） |

**响应**:

成功响应 (200 OK):

```json
{
  "success": true,
  "file_id": "1620000000000",
  "analysis_id": "analysis_1620000000000",
  "message": "File uploaded and analyzed successfully"
}
```

错误响应 (400 Bad Request):

```json
{
  "success": false,
  "error": "No file uploaded"
}
```

错误响应 (500 Internal Server Error):

```json
{
  "success": false,
  "error": "Failed to analyze file"
}
```

### 获取分析结果

获取指定分析ID的分析结果。

**URL**: `/analysis/:analysisId`

**方法**: `GET`

**URL 参数**:

| 参数名     | 类型   | 必填 | 描述       |
|------------|--------|------|------------|
| analysisId | String | 是   | 分析结果ID |

**响应**:

成功响应 (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "analysis_1620000000000",
    "timestamp": "2023-05-03T12:34:56.789Z",
    "language": "zh",
    "metadata": {
      "chatName": "示例聊天",
      "fileName": "chat.html",
      "fileSize": 12345,
      "messageCount": 1234,
      "participants": ["用户1", "用户2"]
    },
    "statistics": {
      "totalMessages": 1234,
      "messageCountByParticipant": {
        "用户1": 789,
        "用户2": 445
      },
      "messageCountByDate": {
        "2023-05-01": 123,
        "2023-05-02": 456,
        "2023-05-03": 655
      },
      "messageLengthStats": {
        "average": 42.5,
        "max": 500,
        "min": 1,
        "total": 52445
      },
      "timeStats": {
        "mostActiveHour": 20,
        "messageCountByHour": {
          "9": 100,
          "10": 150,
          "20": 300
        }
      }
    },
    "top_keywords": {
      "项目": 45,
      "会议": 32,
      "截止日期": 28,
      "周末": 24,
      "计划": 18
    },
    "sentiment": {
      "overall": 0.65,
      "byParticipant": {
        "用户1": 0.7,
        "用户2": 0.6
      }
    },
    "summary": "这是一段用户1和用户2之间的对话。对话主要围绕工作项目和即将到来的截止日期展开。参与者讨论了周末会议的安排，并分享了一些项目进展情况。整体氛围积极，偶尔有一些关于工作压力的讨论。",
    "events": [
      {
        "time": "2023-05-01 10:30:45",
        "sender": "用户1",
        "content": "别忘了明天的会议，下午2点开始。"
      },
      {
        "time": "2023-05-02 14:15:22",
        "sender": "用户2",
        "content": "我已经完成了项目的初步设计，可以在会议上讨论。"
      },
      {
        "time": "2023-05-03 09:45:11",
        "sender": "用户1",
        "content": "周五之前我们需要提交最终方案。"
      }
    ],
    "total_messages": 1234,
    "senders": {
      "用户1": 789,
      "用户2": 445
    }
  }
}
```

错误响应 (404 Not Found):

```json
{
  "success": false,
  "error": "Analysis result not found"
}
```

错误响应 (500 Internal Server Error):

```json
{
  "success": false,
  "error": "Failed to read analysis data"
}
```

## 数据模型

### 分析结果对象

| 字段名       | 类型   | 描述                           |
|--------------|--------|--------------------------------|
| id           | String | 分析结果ID                     |
| timestamp    | String | 分析时间（ISO 8601格式）       |
| language     | String | 检测到的语言（'zh', 'en'等）   |
| metadata     | Object | 元数据信息                     |
| statistics   | Object | 统计信息                       |
| top_keywords | Object | 关键词及其频率                 |
| sentiment    | Object | 情感分析结果                   |
| summary      | String | 聊天内容摘要                   |
| events       | Array  | 重要事件列表                   |
| total_messages | Number | 总消息数                     |
| senders      | Object | 发送者及其消息数               |

### 元数据对象

| 字段名        | 类型   | 描述                     |
|---------------|--------|--------------------------|
| chatName      | String | 聊天名称                 |
| fileName      | String | 原始文件名               |
| fileSize      | Number | 文件大小（字节）         |
| messageCount  | Number | 消息数量                 |
| participants  | Array  | 参与者列表               |

### 统计信息对象

| 字段名                   | 类型   | 描述                     |
|--------------------------|--------|--------------------------|
| totalMessages            | Number | 总消息数                 |
| messageCountByParticipant| Object | 每个参与者的消息数       |
| messageCountByDate       | Object | 每天的消息数             |
| messageLengthStats       | Object | 消息长度统计             |
| timeStats                | Object | 时间统计                 |

### 情感分析对象

| 字段名        | 类型   | 描述                                 |
|---------------|--------|------------------------------------|
| overall       | Number | 整体情感得分（-1到1，负面到正面）    |
| byParticipant | Object | 每个参与者的情感得分                 |

### 事件对象

| 字段名   | 类型   | 描述           |
|----------|--------|--------------|
| time     | String | 事件时间       |
| sender   | String | 发送者         |
| content  | String | 事件内容       |

## 错误代码

| 状态码 | 描述                | 可能的原因                     |
|--------|---------------------|--------------------------------|
| 400    | Bad Request         | 缺少必要参数或参数格式错误     |
| 404    | Not Found           | 请求的资源不存在               |
| 413    | Payload Too Large   | 上传的文件超过大小限制         |
| 415    | Unsupported Media Type | 不支持的文件格式            |
| 500    | Internal Server Error | 服务器内部错误               |

## 使用示例

### 使用 cURL 上传文件

```bash
curl -X POST \
  http://localhost:3000/api/upload-chat \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@/path/to/chat.html'
```

### 使用 JavaScript 上传文件

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('http://localhost:3000/api/upload-chat', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Analysis ID:', data.analysis_id);
    // 获取分析结果
    return fetch(`http://localhost:3000/api/analysis/${data.analysis_id}`);
  } else {
    throw new Error(data.error);
  }
})
.then(response => response.json())
.then(result => {
  if (result.success) {
    console.log('Analysis result:', result.data);
  } else {
    throw new Error(result.error);
  }
})
.catch(error => {
  console.error('Error:', error);
});
```

## 限制

- 文件大小限制：50MB
- 支持的文件格式：HTML, TXT
- 支持的语言：主要支持中文和英文

## 版本历史

### v1.0.0

- 初始版本
- 支持HTML和TXT格式的聊天记录分析
- 提供基本的分析功能：关键词提取、摘要生成、情感分析、事件识别
