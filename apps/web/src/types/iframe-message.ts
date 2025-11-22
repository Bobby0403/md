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
  COPY_CONTENT = 'COPY_CONTENT', // 复制内容到剪贴板（支持多种格式）
  READY = 'READY', // iframe 准备就绪

  // 从 iframe 到父窗口的消息
  CONTENT_CHANGED = 'CONTENT_CHANGED', // 内容已更改
  CONTENT_RESPONSE = 'CONTENT_RESPONSE', // 内容响应
  COPY_CONTENT_RESPONSE = 'COPY_CONTENT_RESPONSE', // 复制内容响应
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
 * 复制内容消息
 */
export interface CopyContentMessage extends BaseIframeMessage {
  type: IframeMessageType.COPY_CONTENT
  payload: {
    format?: 'txt' | 'html' | 'html-without-style' | 'html-and-style' | 'md' // 复制格式，默认为 'txt'
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
 * 复制内容响应消息
 */
export interface CopyContentResponseMessage extends BaseIframeMessage {
  type: IframeMessageType.COPY_CONTENT_RESPONSE
  payload: {
    success: boolean
    content?: string // 返回的内容（根据 format 不同而不同）
    format?: string // 内容格式
    message?: string // 错误消息（仅在失败时）
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
    | CopyContentMessage
    | ContentResponseMessage
    | ContentChangedMessage
    | CopyContentResponseMessage
    | ErrorMessage
    | ReadyMessage
    | BaseIframeMessage

/**
 * 消息验证函数
 */
export function isValidIframeMessage(message: any): message is IframeMessage {
  return message && typeof message === 'object' && 'type' in message
}
