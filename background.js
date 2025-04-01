// 创建上下文菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translateSelection',
    title: '翻译选中文本',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'translatePage',
    title: '翻译全文',
    contexts: ['page']
  });
});

// 处理上下文菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateSelection') {
    translateText(info.selectionText, tab.id, false);
  } else if (info.menuItemId === 'translatePage') {
    chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'pageContent') {
    translateText(message.content, sender.tab.id, true);
  }
});

// 检查tab是否存在且可用
async function isTabValid(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab && tab.status === 'complete';
  } catch {
    return false;
  }
}

// 发送消息到content script，带重试机制
async function sendMessageToTab(tabId, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (await isTabValid(tabId)) {
        // 确保content script已经加载
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => true
          });
        } catch (e) {
          // 如果脚本执行失败，等待后重试
          if (i === maxRetries - 1) throw e;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        await chrome.tabs.sendMessage(tabId, message);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('无法连接到目标页面');
}

// 翻译文本函数
async function translateText(text, tabId, isFullPage) {
  try {
    // 获取存储的设置
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'targetLang']);
    if (!settings.apiUrl || !settings.apiKey) {
      throw new Error('请先配置API设置');
    }

    // 如果是全文翻译，将文本分段
    const textSegments = isFullPage ? splitTextIntoSegments(text) : [text];
    let translations = [];

    // 发送开始翻译的消息
    await sendMessageToTab(tabId, {
      action: 'translationStart',
      isFullPage
    });

    // 逐段翻译
    for (let segment of textSegments) {
      // 准备API请求
      // 测试API连接
      try {
        await fetch(settings.apiUrl, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`
          }
        });
      } catch (error) {
        console.error('API连接测试失败:', error);
        throw new Error('无法连接到API服务器，请检查API地址和网络连接');
      }

      // 发送翻译请求
      const response = await fetch(`${settings.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
          'X-Title': 'Browser Translator'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a precise translator. Your task is to translate the given text accurately while following these rules strictly:

1. Translate the input text to ${settings.targetLang}
2. You MUST return ONLY a valid, parseable JSON object with this exact structure:
   {
     "original": "<original text>",
     "translation": "<translated text>"
   }
3. JSON formatting rules you MUST follow:
   - Use double quotes for all strings
   - Escape all double quotes inside strings with backslash
   - Escape all special characters (\n, \r, \t, etc.)
   - No comments, trailing commas, or extra whitespace
   - No text or explanations outside the JSON object
   - No additional fields in the JSON object
   - No nested objects or arrays
4. Content rules you MUST follow:
   - Preserve all formatting (newlines, spaces) in both fields
   - Do not add any HTML, markdown, or other formatting
   - Both "original" and "translation" fields MUST be strings
   - Do not modify or omit any part of the original text
   - Translate text only, do not add any explanations or notes

Example of correct response:
{
  "original": "Hello\nWorld",
  "translation": "你好\n世界"
}

Example of incorrect response:
{
  "text": "Hello",
  "translated": "你好"
}

Any deviation from these rules will cause the translation to fail and the request will be rejected.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          model: settings.model || 'featherless/qwerky-72b:free'
        })
      });

      if (!response.ok) {
        console.error('API响应状态码:', response.status);
        const errorText = await response.text();
        console.error('API错误响应:', errorText);
        throw new Error(`API请求失败: ${response.status} ${errorText}`);
      }

    const data = await response.json().catch(error => {
      console.error('解析API响应JSON失败:', error);
      throw new Error('无法解析API响应');
    });

    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('API响应格式错误:', data);
      throw new Error('API响应格式不正确');
    }

    const contentStr = data.choices[0].message?.content;
    if (!contentStr) {
      console.error('API响应缺少content字段:', data.choices[0]);
      throw new Error('API响应缺少必要字段');
    }

    let translationResponse;
    try {
      translationResponse = JSON.parse(contentStr.trim());
    } catch (e) {
      console.error('解析翻译结果JSON失败:', contentStr);
      throw new Error('翻译结果格式无效，返回内容不是合法的JSON格式');
    }

    // 验证JSON结构
    if (!translationResponse || typeof translationResponse !== 'object') {
      console.error('翻译结果格式错误: 不是一个对象', translationResponse);
      throw new Error('翻译结果格式错误：返回内容必须是一个JSON对象');
    }

    // 验证必要字段
    if (!('original' in translationResponse) || !('translation' in translationResponse)) {
      console.error('翻译结果缺少必要字段:', translationResponse);
      throw new Error('翻译结果缺少必要字段：必须包含original和translation字段');
    }

    // 验证字段类型
    if (typeof translationResponse.original !== 'string' || 
        typeof translationResponse.translation !== 'string') {
      console.error('翻译结果字段类型错误:', translationResponse);
      throw new Error('翻译结果字段类型错误：original和translation必须是字符串');
    }

    // 验证是否包含额外字段
    const allowedFields = ['original', 'translation'];
    const extraFields = Object.keys(translationResponse).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      console.error('翻译结果包含额外字段:', extraFields);
      throw new Error('翻译结果格式错误：不允许包含额外字段');
    }
    const translation = translationResponse.translation;
    translations.push(translation);
    }

    // 发送翻译结果到content script
    await sendMessageToTab(tabId, {
      action: 'showTranslation',
      translation: isFullPage ? translations.join('\n') : translations[0],
      isFullPage
    });
  } catch (error) {
    await sendMessageToTab(tabId, {
      action: 'showError',
      error: error.message,
      isFullPage
    });
  }
}

// 将长文本分段
function splitTextIntoSegments(text, maxLength = 1500) {
  const segments = [];
  const sentences = text.split(/(?<=[.!?。！？]\s)/g);
  let currentSegment = '';

  for (const sentence of sentences) {
    if ((currentSegment + sentence).length <= maxLength) {
      currentSegment += sentence;
    } else {
      if (currentSegment) segments.push(currentSegment.trim());
      currentSegment = sentence;
    }
  }

  if (currentSegment) segments.push(currentSegment.trim());
  return segments;
}