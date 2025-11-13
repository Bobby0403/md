# iframe 集成指南

本文档说明如何通过 iframe 将微信 Markdown 编辑器集成到其他项目中。

## 快速开始

### 1. 基本集成

在你的 HTML 页面中嵌入编辑器：

```html
<!doctype html>
<html>
  <head>
    <title>集成 Markdown 编辑器</title>
    <style>
      body {
        margin: 0;
        padding: 0;
      }
      #editor-container {
        width: 100%;
        height: 100vh;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
    </style>
  </head>
  <body>
    <div id="editor-container">
      <iframe id="md-editor" src="http://localhost:5173/md/" allow="clipboard-read; clipboard-write"></iframe>
    </div>

    <script>
      // 编辑器通信代码
      const editorFrame = document.getElementById('md-editor')

      // 等待编辑器准备就绪
      window.addEventListener('message', (event) => {
        if (event.data.type === 'READY_RESPONSE') {
          console.log('编辑器已准备就绪')
        }
      })
    </script>
  </body>
</html>
```

### 2. 通信 API

编辑器通过 `postMessage` API 与父窗口通信。所有消息都包含以下字段：

- `type`: 消息类型（字符串）
- `id`: 消息 ID（可选，用于请求-响应匹配）
- `timestamp`: 时间戳（可选）
- `payload`: 消息数据（可选，根据消息类型而定）

## 消息类型

### 从父窗口发送到编辑器

#### SET_CONTENT - 设置编辑器内容

```javascript
editorFrame.contentWindow.postMessage({
  type: 'SET_CONTENT',
  payload: {
    content: '# 标题\n\n这是内容...'
  }
}, '*')
```

#### GET_CONTENT - 获取编辑器内容

```javascript
const messageId = `msg_${Date.now()}`
editorFrame.contentWindow.postMessage({
  type: 'GET_CONTENT',
  id: messageId
}, '*')

// 监听响应
window.addEventListener('message', (event) => {
  if (event.data.type === 'CONTENT_RESPONSE' && event.data.id === messageId) {
    console.log('编辑器内容:', event.data.payload.content)
  }
})
```

#### CLEAR_CONTENT - 清空编辑器内容

```javascript
editorFrame.contentWindow.postMessage({
  type: 'CLEAR_CONTENT'
}, '*')
```

#### INSERT_TEXT - 在光标位置插入文本

```javascript
editorFrame.contentWindow.postMessage({
  type: 'INSERT_TEXT',
  payload: {
    text: '插入的文本'
  }
}, '*')
```

#### REPLACE_SELECTION - 替换选中的文本

```javascript
editorFrame.contentWindow.postMessage({
  type: 'REPLACE_SELECTION',
  payload: {
    text: '替换后的文本'
  }
}, '*')
```

#### FORMAT_CONTENT - 格式化内容

```javascript
editorFrame.contentWindow.postMessage({
  type: 'FORMAT_CONTENT'
}, '*')
```

#### SET_THEME - 设置主题

```javascript
// 设置为暗色主题
editorFrame.contentWindow.postMessage({
  type: 'SET_THEME',
  payload: {
    theme: 'dark' // 或 'light'
  }
}, '*')
```

#### GET_RENDERED_HTML - 获取渲染后的 HTML

```javascript
const messageId = `msg_${Date.now()}`
editorFrame.contentWindow.postMessage({
  type: 'GET_RENDERED_HTML',
  id: messageId
}, '*')

// 监听响应
window.addEventListener('message', (event) => {
  if (event.data.type === 'RENDERED_HTML_RESPONSE' && event.data.id === messageId) {
    console.log('渲染后的 HTML:', event.data.payload.html)
  }
})
```

#### READY - 检查编辑器是否准备就绪

```javascript
editorFrame.contentWindow.postMessage({
  type: 'READY'
}, '*')
```

### 从编辑器发送到父窗口

#### READY_RESPONSE - 编辑器准备就绪

编辑器加载完成后会自动发送此消息。

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'READY_RESPONSE') {
    console.log('编辑器已准备就绪')
  }
})
```

#### CONTENT_CHANGED - 内容已更改

当编辑器内容发生变化时（用户输入或通过 API 修改），编辑器会自动发送此消息。

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'CONTENT_CHANGED') {
    console.log('内容已更改:', event.data.payload.content)
  }
})
```

#### CONTENT_RESPONSE - 内容响应

响应 `GET_CONTENT` 请求。

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'CONTENT_RESPONSE') {
    console.log('编辑器内容:', event.data.payload.content)
  }
})
```

#### RENDERED_HTML_RESPONSE - 渲染 HTML 响应

响应 `GET_RENDERED_HTML` 请求。

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'RENDERED_HTML_RESPONSE') {
    console.log('渲染后的 HTML:', event.data.payload.html)
  }
})
```

#### ERROR - 错误消息

当发生错误时发送。

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'ERROR') {
    console.error('错误:', event.data.payload.error, event.data.payload.message)
  }
})
```

## 完整示例

以下是一个完整的集成示例，展示了如何使用所有 API：

```html
<!doctype html>
<html>
  <head>
    <title>Markdown 编辑器集成示例</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: Arial, sans-serif;
      }
      .container {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .toolbar {
        padding: 10px;
        background: #f5f5f5;
        border-bottom: 1px solid #ddd;
        display: flex;
        gap: 10px;
      }
      .toolbar button {
        padding: 8px 16px;
        cursor: pointer;
      }
      #editor-container {
        flex: 1;
        border: 1px solid #ddd;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="toolbar">
        <button onclick="setContent()">设置内容</button>
        <button onclick="getContent()">获取内容</button>
        <button onclick="clearContent()">清空内容</button>
        <button onclick="formatContent()">格式化</button>
        <button onclick="toggleTheme()">切换主题</button>
        <button onclick="getRenderedHtml()">获取 HTML</button>
      </div>
      <div id="editor-container">
        <iframe id="md-editor" src="http://localhost:5173/md/" allow="clipboard-read; clipboard-write"></iframe>
      </div>
    </div>

    <script>
      const editorFrame = document.getElementById('md-editor')
      let isDark = false
      let messageIdCounter = 0

      // 生成唯一消息 ID
      function generateMessageId() {
        return 'msg_' + ++messageIdCounter + '_' + Date.now()
      }

      // 发送消息到编辑器
      function sendMessage(type, payload = {}) {
        const message = {
          type,
          id: generateMessageId(),
          ...(Object.keys(payload).length > 0 && { payload }),
        }
        editorFrame.contentWindow.postMessage(message, '*')
        return message.id
      }

      // 等待编辑器准备就绪
      let editorReady = false
      window.addEventListener('message', (event) => {
        // 安全检查：验证消息来源
        // if (event.origin !== 'http://localhost:5173') return;

        const { type, id, payload } = event.data

        switch (type) {
          case 'READY_RESPONSE':
            editorReady = true
            console.log('✅ 编辑器已准备就绪')
            break

          case 'CONTENT_CHANGED':
            console.log('📝 内容已更改:', payload.content.substring(0, 50) + '...')
            break

          case 'CONTENT_RESPONSE':
            console.log('📄 编辑器内容:', payload.content)
            alert('内容已复制到控制台')
            break

          case 'RENDERED_HTML_RESPONSE':
            console.log('🎨 渲染后的 HTML:', payload.html)
            alert('HTML 已复制到控制台')
            break

          case 'ERROR':
            console.error('❌ 错误:', payload.error, payload.message)
            alert('错误: ' + payload.message)
            break
        }
      })

      // 工具栏函数
      function setContent() {
        sendMessage('SET_CONTENT', {
          content: '# 新标题\n\n这是通过 API 设置的内容。\n\n- 列表项 1\n- 列表项 2',
        })
      }

      function getContent() {
        sendMessage('GET_CONTENT')
      }

      function clearContent() {
        if (confirm('确定要清空编辑器内容吗？')) {
          sendMessage('CLEAR_CONTENT')
        }
      }

      function formatContent() {
        sendMessage('FORMAT_CONTENT')
      }

      function toggleTheme() {
        isDark = !isDark
        sendMessage('SET_THEME', {
          theme: isDark ? 'dark' : 'light',
        })
      }

      function getRenderedHtml() {
        sendMessage('GET_RENDERED_HTML')
      }

      // 等待 iframe 加载完成
      editorFrame.addEventListener('load', () => {
        console.log('iframe 已加载')
        // 发送 READY 消息检查编辑器是否准备就绪
        sendMessage('READY')
      })
    </script>
  </body>
</html>
```

## TypeScript 类型定义

如果你使用 TypeScript，可以导入类型定义：

```typescript
import type { IframeMessage, IframeMessageType } from '@md/web/src/types/iframe-message'

// 使用示例
const message: IframeMessage = {
  type: IframeMessageType.SET_CONTENT,
  payload: {
    content: '# Hello World'
  }
}
```

## 安全配置

### 域名白名单机制

编辑器内置了域名白名单机制，可以防止未授权的网站通过 iframe 嵌入编辑器。默认情况下：

- **开发环境**：允许所有域名（`*`）
- **生产环境**：不允许任何域名（需要显式配置）

### 配置方法

#### 方法 1：环境变量配置（推荐，构建时配置）

在构建时通过环境变量配置允许的域名：

```bash
# .env 文件
VITE_IFRAME_ALLOWED_ORIGINS='["https://example.com","https://*.example.com"]'

# 或在构建命令中
VITE_IFRAME_ALLOWED_ORIGINS='["https://example.com"]' pnpm web build
```

#### 方法 2：运行时配置（浏览器控制台）

在浏览器控制台中配置允许的域名：

```javascript
// 设置允许的域名列表
localStorage.setItem('__md_iframe_allowed_origins', JSON.stringify([
  'https://example.com',
  'https://*.example.com', // 支持通配符
  'http://localhost:3000' // 开发环境
]))

// 刷新页面使配置生效
location.reload()
```

#### 方法 3：通过代码配置

```javascript
import { setAllowedOrigins } from '@md/web/src/utils/iframeSecurity'

// 设置允许的域名
setAllowedOrigins([
  'https://example.com',
  'https://*.example.com',
  'http://localhost:3000'
])
```

### 域名格式说明

- **精确匹配**：`'https://example.com'` - 只允许该域名
- **通配符匹配**：`'https://*.example.com'` - 允许所有 example.com 的子域名
- **允许所有**：`'*'` - 允许所有域名（仅开发环境推荐）

### 验证机制

编辑器会自动验证：

1. **接收消息时**：验证 `event.origin` 是否在白名单中
2. **发送消息时**：验证目标域名是否被允许
3. **未授权访问**：会发送 `ERROR` 消息，错误类型为 `UNAUTHORIZED_ORIGIN`

### 安全注意事项

1. **消息来源验证**：编辑器已内置 origin 验证，无需手动验证。

2. **CSP 策略**：如果使用 Content Security Policy，确保允许 iframe 和 postMessage。

3. **XSS 防护**：编辑器输出的 HTML 已经过安全处理，但如果你要显示渲染后的 HTML，请确保进行适当的转义。

4. **生产环境配置**：生产环境必须配置白名单，否则编辑器将拒绝所有 iframe 通信。

5. **HTTPS 要求**：生产环境建议只允许 HTTPS 域名。

## 常见问题

### Q: 如何检测编辑器是否已加载？

A: 监听 `READY_RESPONSE` 消息：

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'READY_RESPONSE') {
    console.log('编辑器已准备就绪')
  }
})
```

### Q: 如何实时监听内容变化？

A: 监听 `CONTENT_CHANGED` 消息：

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'CONTENT_CHANGED') {
    const content = event.data.payload.content
    // 处理内容变化
  }
})
```

### Q: 编辑器支持哪些功能？

A: 编辑器支持完整的 Markdown 语法、代码高亮、数学公式、Mermaid 图表、PlantUML、主题切换等功能。详细功能列表请参考主 README。

### Q: 可以在生产环境使用吗？

A: 可以，但请确保：

1. 使用 HTTPS
2. 验证消息来源
3. 处理错误情况
4. 测试所有功能

## 更多信息

- 项目主页: https://github.com/doocs/md
- 在线演示: https://md.doocs.org
- 问题反馈: https://github.com/doocs/md/issues
