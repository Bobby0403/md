/**
 * iframe 安全配置工具
 * 用于管理允许嵌入编辑器的域名白名单
 */

/**
 * 获取允许的域名列表
 * 仅从环境变量读取（构建时配置），不支持的运行时配置以确保安全
 */
export async function getAllowedOrigins(): Promise<string[]> {
  // 从环境变量读取（构建时配置）
  const envOrigins = import.meta.env.VITE_IFRAME_ALLOWED_ORIGINS
  if (envOrigins) {
    try {
      const origins = JSON.parse(envOrigins)
      if (Array.isArray(origins) && origins.length > 0) {
        console.log('[IframeSecurity] Using environment variable origins:', origins)
        return origins
      }
    }
    catch (error) {
      console.warn('[IframeSecurity] Failed to parse VITE_IFRAME_ALLOWED_ORIGINS:', error, 'Raw value:', envOrigins)
    }
  }
  else {
    console.log('[IframeSecurity] No VITE_IFRAME_ALLOWED_ORIGINS found in environment variables')
  }

  // 默认值：开发环境允许所有，生产环境为空数组（需要显式配置）
  if (import.meta.env.DEV) {
    console.log('[IframeSecurity] Using default DEV origins: ["*"] (allow all)')
    return ['*'] // 开发环境允许所有域名
  }

  console.log('[IframeSecurity] Using default PROD origins: [] (deny all)')
  return [] // 生产环境默认不允许任何域名
}

/**
 * 设置允许的域名列表（已废弃，不再支持运行时配置）
 * 为了安全考虑，域名白名单只能在构建时通过环境变量配置
 * @deprecated 此函数已废弃，不会产生任何效果。请使用环境变量 VITE_IFRAME_ALLOWED_ORIGINS 在构建时配置
 */
export function setAllowedOrigins(_origins: string[]): void {
  console.warn('[IframeSecurity] setAllowedOrigins is deprecated. Domain whitelist can only be configured via VITE_IFRAME_ALLOWED_ORIGINS environment variable at build time.')
  // 不再支持运行时配置，直接返回
}

/**
 * 验证 origin 是否被允许
 * @param origin 要验证的 origin（例如：'https://example.com'）
 * @returns 是否允许
 */
export async function isOriginAllowed(origin: string): Promise<boolean> {
  const allowedOrigins = await getAllowedOrigins()

  console.log('[IframeSecurity] Checking origin:', origin, 'against allowed origins:', allowedOrigins)

  // 如果白名单为空，不允许任何域名
  if (allowedOrigins.length === 0) {
    console.log('[IframeSecurity] Origin denied: empty whitelist')
    return false
  }

  // 如果包含 '*'，允许所有域名
  if (allowedOrigins.includes('*')) {
    console.log('[IframeSecurity] Origin allowed: wildcard (*) in whitelist')
    return true
  }

  // 精确匹配
  if (allowedOrigins.includes(origin)) {
    console.log('[IframeSecurity] Origin allowed: exact match')
    return true
  }

  // 支持通配符匹配（例如：'*.example.com'）
  for (const allowed of allowedOrigins) {
    if (allowed.includes('*')) {
      const pattern = allowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
        .replace(/\*/g, '.*') // 将 * 转换为 .*
      const regex = new RegExp(`^${pattern}$`)
      if (regex.test(origin)) {
        console.log('[IframeSecurity] Origin allowed: wildcard pattern match', allowed)
        return true
      }
    }
  }

  console.log('[IframeSecurity] Origin denied: no match found')
  return false
}

/**
 * 获取父窗口的 origin
 * 如果不在 iframe 中，返回 null
 */
export function getParentOrigin(): string | null {
  try {
    if (window.parent && window.parent !== window) {
      // 尝试通过 postMessage 获取父窗口 origin
      // 注意：这需要父窗口配合，否则无法直接获取
      // 实际使用中，我们通过 message event 的 origin 来验证
      return null
    }
    return null
  }
  catch {
    // 跨域情况下访问 window.parent 会抛出错误
    return null
  }
}

/**
 * 验证消息来源
 * @param event MessageEvent
 * @returns 是否允许
 */
export async function validateMessageOrigin(event: MessageEvent): Promise<boolean> {
  // 如果消息来自自身，允许（用于调试）
  if (event.source === window) {
    console.log('[IframeSecurity] Message from self (window), allowing')
    return true
  }

  // 验证 origin
  const origin = event.origin

  // 处理 origin 为 null 的情况
  if (!origin || origin === 'null' || origin === 'file://') {
    // origin 为 null 的情况：
    // 1. file:// 协议（本地文件打开）
    // 2. 某些特殊协议
    // 3. 同源消息（但 event.source !== window，可能是 iframe 同源）

    // 检查当前页面是否也是 file:// 协议
    if (window.location.protocol === 'file:') {
      console.warn('[IframeSecurity] Origin is null (file:// protocol). For security, this is denied in production. In development, check environment variable.')
      // 开发环境：如果环境变量未配置，允许（方便本地测试）
      // 生产环境：拒绝（安全考虑）
      if (import.meta.env.DEV) {
        const allowedOrigins = await getAllowedOrigins()
        // 如果环境变量未配置（使用默认值 *），允许 file://
        // 如果环境变量已配置，拒绝 file://（需要显式配置）
        if (allowedOrigins.includes('*') && allowedOrigins.length === 1) {
          console.log('[IframeSecurity] Allowing file:// in DEV mode (no env var configured)')
          return true
        }
      }
      console.warn('[IframeSecurity] Denying file:// protocol for security')
      return false
    }

    // 其他 origin 为 null 的情况，拒绝
    console.warn('[IframeSecurity] Origin is null or empty, denying for security')
    return false
  }

  return await isOriginAllowed(origin)
}

/**
 * 获取当前页面的 origin
 */
export function getCurrentOrigin(): string {
  return window.location.origin
}

/**
 * 检查是否在 iframe 中
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top
  }
  catch {
    // 跨域情况下访问 window.top 会抛出错误
    return true
  }
}

/**
 * 安全地发送消息到父窗口
 * 只有在 origin 被允许时才发送
 */
export async function safePostMessageToParent(
  message: any,
  targetOrigin: string = '*',
): Promise<boolean> {
  if (!isInIframe()) {
    return false
  }

  try {
    // 如果指定了具体 origin，验证是否允许
    if (targetOrigin !== '*') {
      const allowed = await isOriginAllowed(targetOrigin)
      if (!allowed) {
        console.warn('[IframeSecurity] Blocked message to unauthorized origin:', targetOrigin)
        return false
      }
    }

    window.parent.postMessage(message, targetOrigin)
    return true
  }
  catch (error) {
    console.error('[IframeSecurity] Failed to post message:', error)
    return false
  }
}
