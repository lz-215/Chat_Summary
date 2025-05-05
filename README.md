# 聊天记录分析工具

这个工具可以分析聊天记录，生成摘要、提取关键事件，并提供可视化分析功能。支持上传HTML和TXT格式的聊天记录。

## 功能特点

- 支持HTML和TXT格式的聊天记录导入
- 自动识别聊天平台
- 生成聊天摘要
- 提取关键事件
- 可视化分析
- 使用DeepSeek API提供高质量的摘要和事件提取
- 支持将分析结果导出为HTML格式

## 系统要求

- Node.js 14.0 或更高版本
- npm 包管理器

## 安装步骤

1. 克隆或下载本项目
2. 安装依赖包：
   ```
   npm install
   ```
3. 配置环境变量：
   复制 `config/.env.example` 文件为 `config/.env`，并根据需要修改配置：
   ```
   cp config/.env.example config/.env
   ```

## DeepSeek API 配置

本项目使用DeepSeek API进行聊天记录分析，提供高质量的摘要和事件提取。

1. 获取DeepSeek API密钥
   - 访问 [DeepSeek平台](https://platform.deepseek.com/api_keys)
   - 注册并创建API密钥

2. 在 `config/.env` 文件中配置DeepSeek API：
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   DEEPSEEK_API_URL=https://api.deepseek.com
   DEEPSEEK_MODEL=deepseek-r1
   ```

如果DeepSeek API不可用，系统将显示错误信息。

## 使用方法

1. 启动应用：
   ```
   npm start
   ```
   或开发模式：
   ```
   npm run dev
   ```

2. 在浏览器中访问 `http://localhost:3003`（或根据您在 `.env` 中配置的端口）

3. 上传聊天记录文件（支持HTML和TXT格式）

4. 点击"分析聊天"按钮

5. 查看生成的摘要、关键事件和可视化分析

## 技术原理

本工具使用以下技术实现聊天记录分析：

1. 使用Node.js和Express构建Web应用
2. 支持HTML和TXT格式的聊天记录解析
3. 使用DeepSeek API进行高质量的摘要生成和事件提取
4. 使用D3.js等库实现数据可视化
5. 前端实现HTML导出功能

## API集成架构

本项目使用DeepSeek API进行聊天记录分析：

1. 直接调用DeepSeek API进行摘要生成和事件提取
2. 在前端实现可视化和HTML导出功能

## 注意事项

- 需要配置有效的DeepSeek API密钥才能使用分析功能
- 大型聊天记录文件可能需要较长的处理时间
- 分析结果的质量取决于聊天记录的内容和格式
- 本工具仅用于个人数据分析，请勿用于非法用途

## 隐私声明

本工具在本地运行，仅在使用DeepSeek API时会将聊天内容发送到DeepSeek服务器进行处理。所有分析结果仅保存在本地计算机上。

## 常见问题

**Q: 为什么分析结果生成很慢？**
A: 分析速度取决于聊天记录的大小和DeepSeek API的响应时间。大型文件可能需要更长的处理时间。

**Q: 为什么显示"DeepSeek API is not available"错误？**
A: 这表示DeepSeek API密钥无效或API服务暂时不可用。请检查您的API密钥配置。

**Q: 如何导出分析结果？**
A: 在分析页面点击"Export as HTML"按钮，系统会自动生成并下载HTML格式的分析报告。

**Q: 是否支持其他格式的聊天记录？**
A: 当前版本仅支持HTML和TXT格式，未来可能会添加更多格式支持。

## 许可证

本项目采用MIT许可证。详见[LICENSE](LICENSE)文件。

## 免责声明

本工具仅供学习和研究使用。使用本工具分析聊天记录时，请遵守相关法律法规，尊重他人隐私。作者不对使用本工具产生的任何后果负责。