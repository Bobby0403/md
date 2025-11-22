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

设置编辑器的主题模式（暗色/亮色）。

```javascript
// 设置为暗色主题
editorFrame.contentWindow.postMessage({
  type: 'SET_THEME',
  payload: {
    theme: 'dark' // 或 'light'
  }
}, '*')

// 设置为亮色主题
editorFrame.contentWindow.postMessage({
  type: 'SET_THEME',
  payload: {
    theme: 'light'
  }
}, '*')
```

**参数说明：**

- `theme`: 主题模式，可选值：
  - `'dark'`: 暗色主题
  - `'light'`: 亮色主题

**注意事项：**

- 主题切换会立即生效，无需刷新页面
- 主题设置会持久化保存到浏览器的 localStorage 中
- 如果当前主题与目标主题一致，不会触发切换操作

**完整示例：**

```javascript
let currentTheme = 'light' // 或从 localStorage 读取

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light'
  editorFrame.contentWindow.postMessage({
    type: 'SET_THEME',
    payload: {
      theme: currentTheme
    }
  }, '*')
}

// 根据系统主题自动切换
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
prefersDark.addEventListener('change', (e) => {
  editorFrame.contentWindow.postMessage({
    type: 'SET_THEME',
    payload: {
      theme: e.matches ? 'dark' : 'light'
    }
  }, '*')
})
```

#### SET_IMAGE_UPLOAD_CONFIG - 设置图片上传配置

通过 iframe 通信 API 设置图片上传配置（推荐方式，适用于跨域场景）。

```javascript
// 配置阿里云 OSS
editorFrame.contentWindow.postMessage({
  type: 'SET_IMAGE_UPLOAD_CONFIG',
  payload: {
    imgHost: 'aliOSS',
    config: {
      accessKeyId: 'your-access-key-id',
      accessKeySecret: 'your-access-key-secret',
      bucket: 'your-bucket-name',
      region: 'oss-cn-shenzhen',
      useSSL: true,
      cdnHost: 'https://cdn.example.com', // 可选
      path: 'images' // 可选
    }
  }
}, '*')
```

**参数说明：**

- `imgHost`: 图床类型，可选值见下方"支持的图床类型"
- `config`: 图床配置对象，具体参数见下方"各图床配置参数"

**注意事项：**

- 配置会立即生效，无需刷新编辑器
- 配置会持久化保存到编辑器的 localStorage 中
- 如果配置参数无效，编辑器会发送 `ERROR` 消息

#### 配置图片上传 OSS（通过 localStorage）

编辑器支持多种图片上传服务（图床），也可以通过直接配置 localStorage 来设置图片上传参数（仅适用于同域场景，且需要在编辑器加载前设置）。

**支持的图床类型：**

- `default`: 默认（GitHub）
- `github`: GitHub 图床
- `aliOSS`: 阿里云 OSS
- `txCOS`: 腾讯云 COS
- `qiniu`: 七牛云
- `minio`: MinIO
- `r2`: Cloudflare R2
- `upyun`: 又拍云
- `telegram`: Telegram Bot
- `cloudinary`: Cloudinary
- `formCustom`: 自定义上传接口

**配置方法：**

有两种配置方式：

##### 方法 1：通过 iframe 通信 API（推荐）

使用 `SET_IMAGE_UPLOAD_CONFIG` 消息类型，适用于跨域场景：

```javascript
editorFrame.contentWindow.postMessage({
  type: 'SET_IMAGE_UPLOAD_CONFIG',
  payload: {
    imgHost: 'aliOSS',
    config: {
      accessKeyId: 'your-access-key-id',
      accessKeySecret: 'your-access-key-secret',
      bucket: 'your-bucket-name',
      region: 'oss-cn-shenzhen',
      useSSL: true,
      cdnHost: 'https://cdn.example.com',
      path: 'images'
    }
  }
}, '*')
```

##### 方法 2：通过 localStorage（仅同域场景）

直接设置 localStorage，**仅适用于父窗口和 iframe 在同一域名的情况**，且需要在编辑器加载前设置：

```javascript
// 1. 设置图床类型
localStorage.setItem('imgHost', 'aliOSS') // 例如：使用阿里云 OSS

// 2. 配置对应图床的参数（以阿里云 OSS 为例）
localStorage.setItem('aliOSSConfig', JSON.stringify({
  accessKeyId: 'your-access-key-id',
  accessKeySecret: 'your-access-key-secret',
  bucket: 'your-bucket-name',
  region: 'oss-cn-shenzhen', // 例如：oss-cn-shenzhen
  useSSL: true, // 是否使用 HTTPS
  cdnHost: '', // 可选：CDN 域名，如 'https://cdn.example.com'
  path: 'images' // 可选：存储路径前缀
}))

// 注意：如果编辑器已加载，需要刷新使配置生效
editorFrame.contentWindow.location.reload()
```

**⚠️ 重要提示：**

- **跨域场景**：必须使用 `SET_IMAGE_UPLOAD_CONFIG` API，因为跨域时 localStorage 是隔离的
- **同域场景**：可以使用 localStorage，但必须在编辑器加载前设置，或设置后刷新编辑器

**各图床配置参数：**

##### 阿里云 OSS (aliOSS)

```javascript
localStorage.setItem('aliOSSConfig', JSON.stringify({
  accessKeyId: 'your-access-key-id', // 必填：AccessKey ID
  accessKeySecret: 'your-access-key-secret', // 必填：AccessKey Secret
  bucket: 'your-bucket-name', // 必填：Bucket 名称
  region: 'oss-cn-shenzhen', // 必填：区域，如 oss-cn-shenzhen
  useSSL: true, // 必填：是否使用 HTTPS
  cdnHost: 'https://cdn.example.com', // 可选：CDN 域名
  path: 'images' // 可选：存储路径前缀
}))
```

##### 腾讯云 COS (txCOS)

```javascript
localStorage.setItem('txCOSConfig', JSON.stringify({
  secretId: 'your-secret-id', // 必填：Secret ID
  secretKey: 'your-secret-key', // 必填：Secret Key
  bucket: 'your-bucket-name', // 必填：Bucket 名称
  region: 'ap-guangzhou', // 必填：区域，如 ap-guangzhou
  cdnHost: 'https://cdn.example.com', // 可选：CDN 域名
  path: 'images' // 可选：存储路径前缀
}))
```

##### 七牛云 (qiniu)

```javascript
localStorage.setItem('qiniuConfig', JSON.stringify({
  accessKey: 'your-access-key', // 必填：AccessKey
  secretKey: 'your-secret-key', // 必填：SecretKey
  bucket: 'your-bucket-name', // 必填：Bucket 名称
  domain: 'https://cdn.example.com', // 必填：Bucket 对应域名
  region: 'z0', // 可选：区域，如 z0（华东）、z1（华北）等
  path: 'images' // 可选：存储路径前缀
}))
```

##### Cloudflare R2 (r2)

```javascript
localStorage.setItem('r2Config', JSON.stringify({
  accountId: 'your-account-id', // 必填：Account ID
  accessKey: 'your-access-key', // 必填：Access Key
  secretKey: 'your-secret-key', // 必填：Secret Key
  bucket: 'your-bucket-name', // 必填：Bucket 名称
  domain: 'https://cdn.example.com', // 必填：自定义域名
  path: 'images' // 可选：存储路径前缀
}))
```

##### GitHub 图床 (github)

```javascript
localStorage.setItem('githubConfig', JSON.stringify({
  repo: 'username/repo-name', // 必填：GitHub 仓库，格式：username/repo
  branch: 'main', // 可选：分支名，默认为 main
  accessToken: 'your-github-token' // 必填：GitHub Personal Access Token
}))
```

##### MinIO (minio)

```javascript
localStorage.setItem('minioConfig', JSON.stringify({
  endpoint: 'https://minio.example.com', // 必填：MinIO 服务地址
  accessKey: 'your-access-key', // 必填：Access Key
  secretKey: 'your-secret-key', // 必填：Secret Key
  bucket: 'your-bucket-name', // 必填：Bucket 名称
  useSSL: true, // 必填：是否使用 HTTPS
  path: 'images' // 可选：存储路径前缀
}))
```

##### 自定义上传接口 (formCustom)

```javascript
localStorage.setItem('formCustomConfig', JSON.stringify({
  // 自定义上传代码（字符串形式）
  // 可以使用以下变量：
  // - file: File 对象
  // - OSS: tiny-oss 库（如果使用 OSS）
  // 必须返回 Promise<string>，resolve 的值为图片 URL
  code: `
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('https://api.example.com/upload', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    return data.url
  `
}))
```

**配置示例：**

##### 示例 1：通过 iframe 通信 API（推荐）

```javascript
// 配置阿里云 OSS
function configureImageUpload() {
  editorFrame.contentWindow.postMessage({
    type: 'SET_IMAGE_UPLOAD_CONFIG',
    payload: {
      imgHost: 'aliOSS',
      config: {
        accessKeyId: 'LTAI5t...',
        accessKeySecret: 'xxx...',
        bucket: 'my-bucket',
        region: 'oss-cn-shenzhen',
        useSSL: true,
        cdnHost: 'https://cdn.example.com',
        path: 'blog/images'
      }
    }
  }, '*')
}

// 等待编辑器准备就绪后配置
window.addEventListener('message', (event) => {
  if (event.data.type === 'READY_RESPONSE') {
    configureImageUpload()
  }
})
```

##### 示例 2：通过 localStorage（仅同域场景）

```javascript
// 完整的配置示例（仅适用于同域场景）
function configureImageUpload() {
  // 选择图床类型
  localStorage.setItem('imgHost', 'aliOSS')

  // 配置阿里云 OSS
  localStorage.setItem('aliOSSConfig', JSON.stringify({
    accessKeyId: 'LTAI5t...',
    accessKeySecret: 'xxx...',
    bucket: 'my-bucket',
    region: 'oss-cn-shenzhen',
    useSSL: true,
    cdnHost: 'https://cdn.example.com',
    path: 'blog/images'
  }))

  console.log('图片上传配置已设置')
}

// 在编辑器加载前调用（重要！）
configureImageUpload()
```

**注意事项：**

1. **推荐使用 API 方式**：使用 `SET_IMAGE_UPLOAD_CONFIG` API 可以避免跨域问题，配置立即生效
2. **跨域场景**：如果父窗口和 iframe 不在同一域名，必须使用 `SET_IMAGE_UPLOAD_CONFIG` API，不能使用 localStorage
3. **同域场景**：如果使用 localStorage，必须在编辑器加载前设置，或设置后刷新编辑器
4. **安全性**：敏感信息（如 AccessKey、SecretKey）存储在 localStorage 中，请确保页面使用 HTTPS，并注意 XSS 防护
5. **配置验证**：上传图片前，编辑器会验证配置是否完整，不完整时会提示错误
6. **默认图床**：如果不配置或配置为 `default`，将使用 GitHub 图床（需要配置 `githubConfig`）

#### COPY_CONTENT - 获取内容（支持多种格式）

获取编辑器内容，支持五种格式，返回内容字符串供父窗口使用。与编辑器内置的复制功能格式保持一致。

```javascript
const messageId = `msg_${Date.now()}`
editorFrame.contentWindow.postMessage({
  type: 'COPY_CONTENT',
  id: messageId,
  payload: {
    format: 'txt' // 可选：'txt' | 'html' | 'html-without-style' | 'html-and-style' | 'md'
  }
}, '*')

// 监听响应
window.addEventListener('message', (event) => {
  if (event.data.type === 'COPY_CONTENT_RESPONSE' && event.data.id === messageId) {
    if (event.data.payload.success) {
      const content = event.data.payload.content
      const format = event.data.payload.format
      console.log(`获取成功 (${format}):`, content)

      // 可以自行处理内容，例如复制到剪贴板
      navigator.clipboard.writeText(content).then(() => {
        console.log('内容已复制到剪贴板')
      })
    }
    else {
      console.error('获取失败:', event.data.payload.message)
    }
  }
})
```

**参数说明：**

- `format`: 内容格式，可选值：
  - `'txt'`（默认）：公众号格式，处理后的 HTML，可直接粘贴到微信公众号后台
  - `'html'`：HTML 源码格式，渲染后的 HTML
  - `'html-without-style'`：无样式 HTML 格式，纯 HTML 结构
  - `'html-and-style'`：兼容样式 HTML 格式，包含内联样式
  - `'md'`：Markdown 源码格式，原始 Markdown 文本

**响应数据：**

- `success`: 是否成功
- `content`: 内容字符串（成功时）
- `format`: 内容格式（成功时）
- `message`: 错误消息（失败时）

**使用示例：**

```javascript
// 获取公众号格式内容
function getWeChatContent() {
  const messageId = `msg_${Date.now()}`
  editorFrame.contentWindow.postMessage({
    type: 'COPY_CONTENT',
    id: messageId,
    payload: { format: 'txt' }
  }, '*')

  window.addEventListener('message', function handler(event) {
    if (event.data.type === 'COPY_CONTENT_RESPONSE' && event.data.id === messageId) {
      window.removeEventListener('message', handler)
      if (event.data.payload.success) {
        const content = event.data.payload.content
        // 自行处理内容
        console.log('公众号格式内容:', content)
      }
    }
  })
}

// 获取 Markdown 格式内容
function getMarkdownContent() {
  const messageId = `msg_${Date.now()}`
  editorFrame.contentWindow.postMessage({
    type: 'COPY_CONTENT',
    id: messageId,
    payload: { format: 'md' }
  }, '*')

  window.addEventListener('message', function handler(event) {
    if (event.data.type === 'COPY_CONTENT_RESPONSE' && event.data.id === messageId) {
      window.removeEventListener('message', handler)
      if (event.data.payload.success) {
        const mdContent = event.data.payload.content
        // 自行处理内容
        console.log('Markdown 内容:', mdContent)
      }
    }
  })
}
```

**注意事项：**

- API 只返回内容字符串，不会自动复制到剪贴板
- 父窗口可以根据需要自行处理内容（复制、保存、显示等）
- 不同格式的内容已针对目标平台优化（如公众号格式已处理样式兼容性）
- 如果获取失败，会通过 `COPY_CONTENT_RESPONSE` 消息返回错误信息

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

#### COPY_CONTENT_RESPONSE - 获取内容响应

响应 `COPY_CONTENT` 请求。

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'COPY_CONTENT_RESPONSE') {
    if (event.data.payload.success) {
      const content = event.data.payload.content
      const format = event.data.payload.format
      console.log(`获取成功 (${format}):`, content)

      // 可以自行处理内容
      // 例如：复制到剪贴板
      navigator.clipboard.writeText(content).then(() => {
        console.log('内容已复制到剪贴板')
      }).catch((err) => {
        console.error('复制失败:', err)
      })

      // 或者：保存到文件
      // downloadFile(content, 'content.html', 'text/html')
    }
    else {
      console.error('获取失败:', event.data.payload.message)
      alert(`获取失败: ${event.data.payload.message}`)
    }
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
        <button onclick="copyContent('txt')">复制（公众号）</button>
        <button onclick="copyContent('html')">复制（HTML）</button>
        <button onclick="copyContent('md')">复制（MD）</button>
      </div>
      <div id="editor-container">
        <iframe id="md-editor" src="http://localhost:5173/md/" allow="clipboard-read; clipboard-write"></iframe>
      </div>
    </div>

    <script>
      const editorFrame = document.getElementById('md-editor')
      let isDark = false
      let messageIdCounter = 0

      // 配置图片上传 OSS（推荐：通过 iframe 通信 API）
      function configureImageUpload() {
        // 示例：配置阿里云 OSS
        sendMessage('SET_IMAGE_UPLOAD_CONFIG', {
          imgHost: 'aliOSS',
          config: {
            accessKeyId: 'your-access-key-id',
            accessKeySecret: 'your-access-key-secret',
            bucket: 'your-bucket-name',
            region: 'oss-cn-shenzhen',
            useSSL: true,
            cdnHost: 'https://cdn.example.com', // 可选
            path: 'images', // 可选
          },
        })
        console.log('✅ 图片上传配置已设置')
      }

      // 如果父窗口和 iframe 在同一域名，也可以使用 localStorage（需在编辑器加载前）
      // function configureImageUploadViaLocalStorage() {
      //   localStorage.setItem('imgHost', 'aliOSS')
      //   localStorage.setItem('aliOSSConfig', JSON.stringify({
      //     accessKeyId: 'your-access-key-id',
      //     accessKeySecret: 'your-access-key-secret',
      //     bucket: 'your-bucket-name',
      //     region: 'oss-cn-shenzhen',
      //     useSSL: true,
      //     cdnHost: 'https://cdn.example.com',
      //     path: 'images'
      //   }))
      // }

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

          case 'COPY_CONTENT_RESPONSE':
            if (payload.success) {
              const content = payload.content
              const format = payload.format
              console.log(`✅ 获取成功 (${format}):`, content)
              console.log('内容长度:', content.length, '字符')

              // 可以自行处理内容，例如复制到剪贴板
              if (navigator.clipboard) {
                navigator.clipboard
                  .writeText(content)
                  .then(() => {
                    alert(`内容已获取并复制到剪贴板 (${format})`)
                  })
                  .catch(() => {
                    alert(`内容已获取 (${format})，请手动复制`)
                  })
              } else {
                alert(`内容已获取 (${format})，请查看控制台`)
              }
            } else {
              console.error('❌ 获取失败:', payload.message)
              alert('获取失败: ' + payload.message)
            }
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
        console.log(`主题已切换为: ${isDark ? '暗色' : '亮色'}`)
      }

      // 根据系统主题自动切换
      function initTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
        isDark = prefersDark.matches
        sendMessage('SET_THEME', {
          theme: isDark ? 'dark' : 'light',
        })

        // 监听系统主题变化
        prefersDark.addEventListener('change', (e) => {
          isDark = e.matches
          sendMessage('SET_THEME', {
            theme: isDark ? 'dark' : 'light',
          })
        })
      }

      function copyContent(format = 'txt') {
        const messageId = sendMessage('COPY_CONTENT', { format })
        if (messageId) {
          updateStatus('📋 正在获取内容...')
        }
      }

      // 等待 iframe 加载完成
      editorFrame.addEventListener('load', () => {
        console.log('iframe 已加载')
        // 发送 READY 消息检查编辑器是否准备就绪
        sendMessage('READY')
        // 初始化主题
        initTheme()
      })

      // 等待编辑器准备就绪后配置图片上传
      window.addEventListener('message', (event) => {
        if (event.data.type === 'READY_RESPONSE') {
          // 编辑器已准备就绪，可以配置图片上传
          // configureImageUpload()
        }
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

**仅支持构建时配置（环境变量）**

为了安全考虑，域名白名单只能在构建时通过环境变量配置，不支持运行时配置。

Vite 会自动读取 `.env` 文件，你只需要创建文件并配置即可，无需在构建命令中指定。

#### 方式 1：使用 .env 文件（推荐）

在 `apps/web/` 目录下创建 `.env` 文件（或 `.env.production` 用于生产环境）：

```bash
# apps/web/.env 或 apps/web/.env.production
VITE_IFRAME_ALLOWED_ORIGINS='["https://example.com","https://*.example.com"]'
```

**文件位置说明：**

- Vite 会自动从 `apps/web/` 目录（vite.config.ts 所在目录）查找 `.env` 文件
- 支持的文件名：
  - `.env` - 所有环境
  - `.env.production` - 仅生产环境（`vite build` 时）
  - `.env.development` - 仅开发环境（`vite dev` 时）
  - `.env.local` - 所有环境（会被 git 忽略，适合本地配置）

**重要提示：**

- 环境变量必须以 `VITE_` 开头才能被 Vite 暴露给客户端代码
- 值必须是有效的 JSON 数组字符串
- 文件创建后，直接运行 `pnpm web build` 即可，Vite 会自动读取

#### 方式 2：在构建命令中设置（临时使用）

如果不想创建 .env 文件，也可以在构建命令中临时指定：

```bash
VITE_IFRAME_ALLOWED_ORIGINS='["https://example.com"]' pnpm web build
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

6. **安全闭包**：域名白名单只能在构建时通过环境变量配置，不支持运行时配置（localStorage），确保只有构建时指定的域名才能使用编辑器。

### 故障排查

#### 问题：配置了环境变量但仍然提示 UNAUTHORIZED_ORIGIN

**可能原因和解决方案：**

1. **创建 .env 文件**
   - ✅ 正确：在 `apps/web/` 目录下创建 `.env` 文件（或 `.env.production`）
   - Vite 会自动读取，无需在构建命令中指定

   ```bash
   # 在 apps/web/.env 文件中添加：
   VITE_IFRAME_ALLOWED_ORIGINS='["http://localhost:3001","https://your-domain.com"]'

   # 然后直接运行构建命令即可
   pnpm web build
   ```

   **文件位置：**
   - ✅ `apps/web/.env` - 正确位置
   - ✅ `apps/web/.env.production` - 生产环境专用
   - ❌ 项目根目录 `.env` - 不会被读取（除非 vite.config.ts 在根目录）

2. **配置格式错误**
   - ❌ 错误：`VITE_IFRAME_ALLOWED_ORIGINS=http://localhost:3001`
   - ✅ 正确：`VITE_IFRAME_ALLOWED_ORIGINS='["http://localhost:3001"]'`
   - 必须是有效的 JSON 数组字符串

3. **已部署的版本需要重新构建**
   - 如果已经部署，修改环境变量后必须重新构建和部署才能生效
   - 环境变量是在构建时注入到代码中的，运行时修改不会生效
   - ⚠️ **注意**：为了安全考虑，不支持运行时配置（localStorage），只能通过构建时环境变量配置

4. **检查控制台日志**
   - 打开浏览器开发者工具，查看控制台日志
   - 查找 `[IframeSecurity]` 开头的日志，确认：
     - 是否读取到了环境变量
     - 允许的域名列表是什么
     - 验证的 origin 是什么

   示例日志：

   ```
   [IframeSecurity] Using environment variable origins: ["http://localhost:3001"]
   [IframeSecurity] Checking origin: http://localhost:3001 against allowed origins: ["http://localhost:3001"]
   ```

5. **确认 origin 格式**
   - 确保配置的域名格式正确，包含协议和端口（如果有）
   - `http://localhost:3001` ✅
   - `localhost:3001` ❌（缺少协议）
   - `http://localhost` ❌（缺少端口，如果实际使用 3001 端口）

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

### Q: 如何配置图片上传 OSS？

A: 有两种方式：

**方式 1：通过 iframe 通信 API（推荐，适用于跨域场景）**

```javascript
editorFrame.contentWindow.postMessage({
  type: 'SET_IMAGE_UPLOAD_CONFIG',
  payload: {
    imgHost: 'aliOSS',
    config: {
      accessKeyId: 'your-access-key-id',
      accessKeySecret: 'your-access-key-secret',
      bucket: 'your-bucket-name',
      region: 'oss-cn-shenzhen',
      useSSL: true,
      cdnHost: 'https://cdn.example.com',
      path: 'images'
    }
  }
}, '*')
```

**方式 2：通过 localStorage（仅适用于同域场景，需在编辑器加载前设置）**

```javascript
// 设置图床类型
localStorage.setItem('imgHost', 'aliOSS')

// 配置对应图床的参数
localStorage.setItem('aliOSSConfig', JSON.stringify({
  accessKeyId: 'your-access-key-id',
  accessKeySecret: 'your-access-key-secret',
  bucket: 'your-bucket-name',
  region: 'oss-cn-shenzhen',
  useSSL: true,
  cdnHost: 'https://cdn.example.com',
  path: 'images'
}))
```

详细配置参数请参考文档中的"配置图片上传 OSS"章节。

### Q: 如何切换主题（暗色/亮色）？

A: 使用 `SET_THEME` 消息：

```javascript
// 切换到暗色主题
editorFrame.contentWindow.postMessage({
  type: 'SET_THEME',
  payload: { theme: 'dark' }
}, '*')

// 切换到亮色主题
editorFrame.contentWindow.postMessage({
  type: 'SET_THEME',
  payload: { theme: 'light' }
}, '*')
```

也可以根据系统主题自动切换，参考文档中的"SET_THEME"章节。

### Q: 主题切换后如何持久化？

A: 编辑器会自动将主题设置保存到 localStorage 中，下次加载时会自动恢复。你无需手动处理持久化。

### Q: 配置了环境变量但仍然提示 UNAUTHORIZED_ORIGIN？

A: 请按以下步骤排查：

1. **确认环境变量格式**：必须是有效的 JSON 数组字符串

   ```bash
   # ✅ 正确
   VITE_IFRAME_ALLOWED_ORIGINS='["http://localhost:3001"]'

   # ❌ 错误
   VITE_IFRAME_ALLOWED_ORIGINS=http://localhost:3001
   ```

2. **确认 .env 文件位置和格式**
   - 文件必须在 `apps/web/` 目录下
   - 环境变量必须以 `VITE_` 开头
   - 值必须是有效的 JSON 数组字符串

   ```bash
   # 检查文件是否存在
   ls apps/web/.env

   # 文件内容示例
   VITE_IFRAME_ALLOWED_ORIGINS='["http://localhost:3001"]'
   ```

3. **必须重新构建**：如果已经部署，修改环境变量后必须重新构建和部署才能生效
   - ⚠️ **注意**：为了安全考虑，不支持运行时配置，只能通过构建时环境变量配置

4. **检查控制台日志**：查看 `[IframeSecurity]` 开头的日志，确认配置是否被正确读取

5. **确认域名格式**：必须包含协议和端口（如果有），例如：`http://localhost:3001`

### Q: 图片上传配置后不生效怎么办？

A: 请检查以下几点：

1. **配置方式**：
   - 如果父窗口和 iframe 不在同一域名，必须使用 `SET_IMAGE_UPLOAD_CONFIG` API
   - 如果使用 localStorage，确保在编辑器加载前设置，或设置后刷新编辑器
2. **配置格式**：确保配置参数是有效的 JSON 格式
3. **必填参数**：确保所有必填参数都已正确配置
4. **权限问题**：检查 OSS 的访问权限配置是否正确
5. **网络问题**：检查是否能正常访问 OSS 服务
6. **跨域问题**：如果跨域，localStorage 是隔离的，必须使用 API 方式

### Q: 编辑器支持哪些功能？

A: 编辑器支持完整的 Markdown 语法、代码高亮、数学公式、Mermaid 图表、PlantUML、主题切换、图片上传等功能。详细功能列表请参考主 README。

### Q: 可以在生产环境使用吗？

A: 可以，但请确保：

1. 使用 HTTPS
2. 验证消息来源
3. 处理错误情况
4. 测试所有功能
5. 妥善保管 OSS 配置信息（AccessKey、SecretKey 等）

## 更多信息

- 项目主页: https://github.com/doocs/md
- 在线演示: https://md.doocs.org
- 问题反馈: https://github.com/doocs/md/issues
