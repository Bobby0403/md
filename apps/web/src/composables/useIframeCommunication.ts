import type { IframeMessage } from '@/types/iframe-message'
import { nextTick, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useExportStore } from '@/stores/export'
import { usePostStore } from '@/stores/post'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'
import { IframeMessageType } from '@/types/iframe-message'
import { generatePureHTML, processClipboardContent, store } from '@/utils'
import {
  isInIframe,
  safePostMessageToParent,
  validateMessageOrigin,
} from '@/utils/iframeSecurity'

/**
 * iframe 通信 Composable
 * 处理与父窗口的 postMessage 通信
 */
export function useIframeCommunication() {
  const editorStore = useEditorStore()
  const renderStore = useRenderStore()
  const uiStore = useUIStore()
  const postStore = usePostStore()
  const exportStore = useExportStore()
  const themeStore = useThemeStore()

  // 生成唯一消息 ID
  function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 发送消息到父窗口（带安全检查）
  async function sendToParent(message: IframeMessage) {
    if (!isInIframe()) {
      return
    }

    const messageWithId = {
      ...message,
      id: message.id || generateMessageId(),
      timestamp: Date.now(),
    }

    // 使用安全的消息发送函数
    // 注意：这里使用 '*' 是为了兼容性，实际验证在 validateMessageOrigin 中进行
    await safePostMessageToParent(messageWithId, '*')
  }

  // 处理来自父窗口的消息
  async function handleMessage(event: MessageEvent<IframeMessage>) {
    // 安全检查：验证消息来源（开发环境跳过验证）
    if (import.meta.env.PROD) {
      const isAllowed = await validateMessageOrigin(event)
      if (!isAllowed) {
        console.warn('[IframeCommunication] Blocked message from unauthorized origin:', event.origin)
        // 发送错误消息告知父窗口
        const originDisplay = event.origin || 'null'
        await sendToParent({
          type: IframeMessageType.ERROR,
          payload: {
            error: 'UNAUTHORIZED_ORIGIN',
            message: `未授权的来源：${originDisplay} 不在允许的域名白名单中`,
          },
        })
        return
      }
    }
    else {
      // 开发环境：跳过验证，允许所有来源
      console.log('[IframeCommunication] DEV mode: skipping origin validation for:', event.origin)
    }

    const message = event.data

    if (!message || !message.type) {
      return
    }

    try {
      switch (message.type) {
        case IframeMessageType.SET_CONTENT: {
          const { content } = (message as any).payload || {}
          if (typeof content === 'string') {
            editorStore.importContent(content)
            // 通知父窗口内容已更新
            await sendToParent({
              type: IframeMessageType.CONTENT_CHANGED,
              payload: { content },
            })
          }
          break
        }

        case IframeMessageType.GET_CONTENT: {
          const content = editorStore.getContent()
          await sendToParent({
            type: IframeMessageType.CONTENT_RESPONSE,
            id: message.id,
            payload: { content },
          })
          break
        }

        case IframeMessageType.CLEAR_CONTENT: {
          editorStore.clearContent()
          await sendToParent({
            type: IframeMessageType.CONTENT_CHANGED,
            payload: { content: '' },
          })
          break
        }

        case IframeMessageType.INSERT_TEXT: {
          const { text } = (message as any).payload || {}
          if (typeof text === 'string') {
            editorStore.replaceSelection(text)
            const newContent = editorStore.getContent()
            await sendToParent({
              type: IframeMessageType.CONTENT_CHANGED,
              payload: { content: newContent },
            })
          }
          break
        }

        case IframeMessageType.REPLACE_SELECTION: {
          const { text } = (message as any).payload || {}
          if (typeof text === 'string') {
            editorStore.replaceSelection(text)
            const newContent = editorStore.getContent()
            await sendToParent({
              type: IframeMessageType.CONTENT_CHANGED,
              payload: { content: newContent },
            })
          }
          break
        }

        case IframeMessageType.FORMAT_CONTENT: {
          editorStore.formatContent().then(async () => {
            const content = editorStore.getContent()
            await sendToParent({
              type: IframeMessageType.CONTENT_CHANGED,
              payload: { content },
            })
          }).catch(async (error) => {
            await sendToParent({
              type: IframeMessageType.ERROR,
              id: message.id,
              payload: {
                error: 'FORMAT_ERROR',
                message: error.message || '内容格式化失败',
              },
            })
          })
          break
        }

        case IframeMessageType.SET_THEME: {
          const { theme } = (message as any).payload || {}
          if (theme === 'light' || theme === 'dark') {
            // 如果当前主题与目标主题不一致，则切换
            if ((theme === 'dark' && !uiStore.isDark) || (theme === 'light' && uiStore.isDark)) {
              uiStore.toggleDark()
            }
          }
          break
        }

        case IframeMessageType.SET_IMAGE_UPLOAD_CONFIG: {
          const { imgHost, config } = (message as any).payload || {}
          if (imgHost && config && typeof config === 'object') {
            try {
              // 设置图床类型
              await store.set('imgHost', imgHost)
              // 设置图床配置
              await store.setJSON(`${imgHost}Config`, config)
              console.log(`[IframeCommunication] 图片上传配置已设置: ${imgHost}`)
            }
            catch (error: any) {
              await sendToParent({
                type: IframeMessageType.ERROR,
                id: message.id,
                payload: {
                  error: 'CONFIG_ERROR',
                  message: error.message || '设置图片上传配置失败',
                },
              })
            }
          }
          else {
            await sendToParent({
              type: IframeMessageType.ERROR,
              id: message.id,
              payload: {
                error: 'INVALID_CONFIG',
                message: '图片上传配置参数无效，需要提供 imgHost 和 config',
              },
            })
          }
          break
        }

        case IframeMessageType.COPY_CONTENT: {
          const { format = 'txt' } = (message as any).payload || {}

          try {
            // MD 格式：直接返回 Markdown 源码
            if (format === 'md') {
              const mdContent = editorStore.getContent()
              await sendToParent({
                type: IframeMessageType.COPY_CONTENT_RESPONSE,
                id: message.id,
                payload: {
                  success: true,
                  content: mdContent,
                  format: 'md',
                },
              })
              break
            }

            // 其他格式需要处理 HTML
            // 先刷新渲染
            const raw = editorStore.getContent()
            renderStore.render(raw, {
              isCiteStatus: themeStore.isCiteStatus,
              legend: themeStore.legend,
              isUseIndent: themeStore.isUseIndent,
              isUseJustify: themeStore.isUseJustify,
              isCountStatus: themeStore.isCountStatus,
              isMacCodeBlock: themeStore.isMacCodeBlock,
              isShowLineNumber: themeStore.isShowLineNumber,
            })

            // 等待渲染完成
            await nextTick()
            await new Promise(resolve => setTimeout(resolve, 350))

            const clipboardDiv = document.getElementById('output')
            if (!clipboardDiv) {
              await sendToParent({
                type: IframeMessageType.COPY_CONTENT_RESPONSE,
                id: message.id,
                payload: {
                  success: false,
                  message: '未找到输出区域',
                },
              })
              break
            }

            // 处理剪贴板内容
            await processClipboardContent(themeStore.primaryColor)

            const temp = clipboardDiv.innerHTML

            let content = ''

            // txt 格式：公众号格式（HTML）
            if (format === 'txt') {
              content = temp
            }
            // html 格式：HTML 源码
            else if (format === 'html') {
              content = temp
            }
            // html-without-style 格式：无样式 HTML
            else if (format === 'html-without-style') {
              content = await generatePureHTML(raw)
            }
            // html-and-style 格式：兼容样式 HTML
            else if (format === 'html-and-style') {
              content = exportStore.editorContent2HTML()
            }
            else {
              await sendToParent({
                type: IframeMessageType.COPY_CONTENT_RESPONSE,
                id: message.id,
                payload: {
                  success: false,
                  message: `不支持的格式: ${format}`,
                },
              })
              // 恢复输出区域
              clipboardDiv.innerHTML = renderStore.output
              break
            }

            // 恢复输出区域
            clipboardDiv.innerHTML = renderStore.output

            // 返回内容
            await sendToParent({
              type: IframeMessageType.COPY_CONTENT_RESPONSE,
              id: message.id,
              payload: {
                success: true,
                content,
                format,
              },
            })
          }
          catch (error: any) {
            await sendToParent({
              type: IframeMessageType.COPY_CONTENT_RESPONSE,
              id: message.id,
              payload: {
                success: false,
                message: error.message || '获取内容失败',
              },
            })
          }
          break
        }

        case IframeMessageType.READY: {
          // 父窗口询问是否准备就绪
          await sendToParent({
            type: IframeMessageType.READY_RESPONSE,
            id: message.id,
          })
          break
        }

        default:
          console.warn('Unknown message type:', message.type)
      }
    }
    catch (error: any) {
      await sendToParent({
        type: IframeMessageType.ERROR,
        id: message.id,
        payload: {
          error: 'HANDLER_ERROR',
          message: error.message || '处理消息时发生错误，请检查消息格式',
        },
      })
    }
  }

  // 监听编辑器内容变化，自动通知父窗口
  let contentChangeTimer: ReturnType<typeof setTimeout> | null = null
  function setupContentChangeListener() {
    // 使用 watch 监听当前文章内容变化
    watch(
      () => postStore.currentPost?.content,
      (newContent) => {
        if (newContent !== undefined) {
          // 防抖处理，避免频繁发送消息
          if (contentChangeTimer) {
            clearTimeout(contentChangeTimer)
          }
          contentChangeTimer = setTimeout(async () => {
            await sendToParent({
              type: IframeMessageType.CONTENT_CHANGED,
              payload: { content: newContent },
            })
          }, 500) // 500ms 防抖
        }
      },
      { deep: true },
    )
  }

  // 初始化通信
  function init() {
    // 监听来自父窗口的消息
    window.addEventListener('message', handleMessage)

    // 设置内容变化监听
    setupContentChangeListener()

    // 通知父窗口已准备就绪
    nextTick(async () => {
      await sendToParent({
        type: IframeMessageType.READY_RESPONSE,
      })
    })
  }

  // 清理
  function cleanup() {
    window.removeEventListener('message', handleMessage)
    if (contentChangeTimer) {
      clearTimeout(contentChangeTimer)
    }
  }

  return {
    init,
    cleanup,
    sendToParent,
  }
}
