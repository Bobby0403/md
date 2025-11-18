/**
 * iframe 通信消息类型定义
 */

/**
 * 消息类型枚举
 */
export enum IframeMessageType {
  // 从父窗口到 iframe 的消息
  SET_CONTENT = 'SET_CONTENT', // 设置编辑器内容
  GET_CONTENT = 'GET_CONTENT', // 获取编辑器内容
  CLEAR_CONTENT = 'CLEAR_CONTENT', // 清空编辑器内容
  INSERT_TEXT = 'INSERT_TEXT', // 在光标位置插入文本
  REPLACE_SELECTION = 'REPLACE_SELECTION', // 替换选中的文本
  FORMAT_CONTENT = 'FORMAT_CONTENT', // 格式化内容
  SET_THEME = 'SET_THEME', // 设置主题（light/dark）
  SET_IMAGE_UPLOAD_CONFIG = 'SET_IMAGE_UPLOAD_CONFIG', // 设置图片上传配置
  GET_RENDERED_HTML = 'GET_RENDERED_HTML', // 获取渲染后的 HTML
  READY = 'READY', // iframe 准备就绪

  // 从 iframe 到父窗口的消息
  CONTENT_CHANGED = 'CONTENT_CHANGED', // 内容已更改
  CONTENT_RESPONSE = 'CONTENT_RESPONSE', // 内容响应
  RENDERED_HTML_RESPONSE = 'RENDERED_HTML_RESPONSE', // 渲染后的 HTML 响应
  ERROR = 'ERROR', // 错误消息
  READY_RESPONSE = 'READY_RESPONSE', // 准备就绪响应
}

/**
 * 基础消息接口
 */
export interface BaseIframeMessage {
  type: IframeMessageType
  id?: string // 消息 ID，用于请求-响应匹配
  timestamp?: number
}

/**
 * 设置内容消息
 */
export interface SetContentMessage extends BaseIframeMessage {
  type: IframeMessageType.SET_CONTENT
  payload: {
    content: string
  }
}

/**
 * 获取内容消息
 */
export interface GetContentMessage extends BaseIframeMessage {
  type: IframeMessageType.GET_CONTENT
}

/**
 * 插入文本消息
 */
export interface InsertTextMessage extends BaseIframeMessage {
  type: IframeMessageType.INSERT_TEXT
  payload: {
    text: string
  }
}

/**
 * 替换选中文本消息
 */
export interface ReplaceSelectionMessage extends BaseIframeMessage {
  type: IframeMessageType.REPLACE_SELECTION
  payload: {
    text: string
  }
}

/**
 * 设置主题消息
 */
export interface SetThemeMessage extends BaseIframeMessage {
  type: IframeMessageType.SET_THEME
  payload: {
    theme: 'light' | 'dark'
  }
}

/**
 * 设置图片上传配置消息
 */
export interface SetImageUploadConfigMessage extends BaseIframeMessage {
  type: IframeMessageType.SET_IMAGE_UPLOAD_CONFIG
  payload: {
    imgHost: string // 图床类型，如 'aliOSS', 'txCOS', 'qiniu' 等
    config: Record<string, any> // 图床配置参数
  }
}

/**
 * 内容响应消息
 */
export interface ContentResponseMessage extends BaseIframeMessage {
  type: IframeMessageType.CONTENT_RESPONSE
  payload: {
    content: string
  }
}

/**
 * 内容更改消息
 */
export interface ContentChangedMessage extends BaseIframeMessage {
  type: IframeMessageType.CONTENT_CHANGED
  payload: {
    content: string
  }
}

/**
 * 渲染 HTML 响应消息
 */
export interface RenderedHtmlResponseMessage extends BaseIframeMessage {
  type: IframeMessageType.RENDERED_HTML_RESPONSE
  payload: {
    html: string
  }
}

/**
 * 错误消息
 */
export interface ErrorMessage extends BaseIframeMessage {
  type: IframeMessageType.ERROR
  payload: {
    error: string
    message?: string
  }
}

/**
 * 准备就绪消息
 */
export interface ReadyMessage extends BaseIframeMessage {
  type: IframeMessageType.READY | IframeMessageType.READY_RESPONSE
}

/**
 * 所有消息类型的联合
 */
export type IframeMessage
  = | SetContentMessage
    | GetContentMessage
    | InsertTextMessage
    | ReplaceSelectionMessage
    | SetThemeMessage
    | SetImageUploadConfigMessage
    | ContentResponseMessage
    | ContentChangedMessage
    | RenderedHtmlResponseMessage
    | ErrorMessage
    | ReadyMessage
    | BaseIframeMessage

/**
 * 消息验证函数
 */
export function isValidIframeMessage(message: any): message is IframeMessage {
  return message && typeof message === 'object' && 'type' in message
}
