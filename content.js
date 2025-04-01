// 创建UI元素
function createUI() {
  // 创建全文翻译容器
  const fullPageContainer = document.createElement('div');
  fullPageContainer.id = 'translator-full-page';
  fullPageContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px;
    background: #333;
    color: white;
    border-radius: 4px;
    font-size: 14px;
    max-width: 300px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    display: none;
  `;

  // 创建进度提示容器
  const progressContainer = document.createElement('div');
  progressContainer.id = 'translator-progress';
  progressContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 15px;
    background: #333;
    color: white;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    display: none;
  `;
  document.body.appendChild(progressContainer);

  // 添加全局样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes loading-dots {
      0%, 20% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
      80%, 100% { transform: translateY(0); }
    }
    .loading-dots::after {
      content: '...';
      display: inline-block;
      animation: loading-dots 1.5s infinite;
    }
    .translation-result {
      display: block;
      margin: 12px 0;
      padding: 16px 20px;
      border: 2px dashed #4a90e2;
      border-radius: 8px;
      font-size: 15px;
      line-height: 1.6;
      background: #f8f9fa;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      position: relative;
      z-index: 1000;
      transition: all 0.2s ease;
    }
    .translation-result .original-text {
      color: #2c3e50;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #e0e0e0;
    }
    .translation-result .translated-text {
      color: #4a90e2;
      font-weight: 500;
    }
    .translation-error {
      color: #ff6b6b;
      background: rgba(255,107,107,0.1);
      border: 2px dashed #ff6b6b;
    }
    #translator-progress {
      display: flex !important;
      flex-direction: column;
      align-items: center;
      min-width: 200px;
      background: linear-gradient(135deg, #4a90e2, #357abd) !important;
      color: white;
      font-weight: 500;
      opacity: 0.95;
      padding: 15px 20px;
      border-radius: 8px;
    }
    .progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.3);
      border-radius: 3px;
      margin-top: 10px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #2ecc71;
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 3px;
    }
    .loading-paragraph {
      position: relative;
      padding: 16px 20px 16px 50px;
      background: #f0f7ff;
      border: 2px dashed #4a90e2;
      border-radius: 8px;
      color: #4a90e2;
      font-weight: 500;
      margin: 12px 0;
    }
    .loading-paragraph::before {
      content: '';
      position: absolute;
      left: 20px;
      top: 50%;
      width: 20px;
      height: 20px;
      margin-top: -10px;
      border: 3px solid #4a90e2;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(fullPageContainer);
  return { fullPageContainer, progressContainer };
}

// 显示翻译结果
function showTranslation(text, isFullPage) {
  if (isFullPage) {
    // 获取所有文本节点
    const mainContent = document.querySelector('main, article') || document.body;
    const textNodes = [];
    const walk = document.createTreeWalker(
      mainContent,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (node.parentElement.tagName === 'SCRIPT' || 
              node.parentElement.tagName === 'STYLE' ||
              node.parentElement.classList.contains('translation-result')) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.textContent.trim() === '') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    // 移除现有的翻译结果
    const existingTranslations = mainContent.querySelectorAll('.translation-result');
    existingTranslations.forEach(el => el.remove());

    // 分割翻译结果
    const translations = text.split('\n');
    let translationIndex = 0;

    // 隐藏进度提示
    const progressContainer = document.getElementById('translator-progress');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }

    // 分批处理文本节点
    const batchSize = 10; // 每批处理10个节点
    let currentBatch = [];
    let node;

    const processBatch = () => {
      if (currentBatch.length > 0 && translationIndex < translations.length) {
        currentBatch.forEach(node => {
          if (node.textContent.trim()) {
            const translationDiv = document.createElement('div');
            translationDiv.className = 'translation-result';
            translationDiv.textContent = translations[translationIndex++];
            node.parentNode.insertBefore(translationDiv, node.nextSibling);
          }
        });
        currentBatch = [];
      }
    };

    const processNextBatch = () => {
      while ((node = walk.nextNode()) && currentBatch.length < batchSize) {
        if (node.textContent.trim()) {
          currentBatch.push(node);
        }
      }

      if (currentBatch.length > 0) {
        processBatch();
        // 使用setTimeout实现异步处理，避免页面卡顿
        setTimeout(processNextBatch, 100);
      }
    };

    processNextBatch();
  } else {
    // 查找并移除加载状态容器
    const loadingContainer = document.getElementById('translator-loading');
    if (loadingContainer) {
      // 创建翻译结果容器
      const translationContainer = document.createElement('div');
      translationContainer.className = 'translation-result';
      translationContainer.textContent = text;
      
      // 替换加载状态为翻译结果
      loadingContainer.parentNode.replaceChild(translationContainer, loadingContainer);
    }
  }
}

// 显示加载状态
function showLoading(isFullPage) {
  if (isFullPage) {
    // 获取主要内容元素
    const mainContent = document.querySelector('main, article') || document.body;
    
    // 移除现有的翻译结果
    const existingTranslations = mainContent.querySelectorAll('.translation-result');
    existingTranslations.forEach(el => el.remove());

    // 为每个段落添加加载状态
    const textNodes = [];
    const walk = document.createTreeWalker(
      mainContent,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (node.parentElement.tagName === 'SCRIPT' || 
              node.parentElement.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.textContent.trim() === '') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    // 计算总段落数
    let totalParagraphs = 0;
    let tempNode = walk.nextNode();
    while (tempNode) {
      if (tempNode.textContent.trim()) {
        totalParagraphs++;
      }
      tempNode = walk.nextNode();
    }

    // 重置TreeWalker
    walk.currentNode = mainContent;

    // 显示进度提示
    const progressContainer = document.getElementById('translator-progress');
    if (progressContainer) {
      progressContainer.style.display = 'block';
      progressContainer.innerHTML = `
        <div>准备翻译</div>
        <div>0/${totalParagraphs} 段落</div>
        <div class="progress-bar">
          <div class="progress-bar-fill"></div>
        </div>
      `;
    }

    let currentParagraph = 0;
    let node;
    while (node = walk.nextNode()) {
      if (node.textContent.trim()) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'translation-result loading-paragraph';
        loadingDiv.textContent = '正在翻译...';
        node.parentNode.insertBefore(loadingDiv, node.nextSibling);
        currentParagraph++;
        if (progressContainer) {
          const percentage = Math.round((currentParagraph / totalParagraphs) * 100);
          progressContainer.innerHTML = `
            <div>正在翻译</div>
            <div>${currentParagraph}/${totalParagraphs} 段落</div>
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            </div>
          `;
        }
      }
    }
  } else {
    // 获取选中的文本范围
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // 清理已存在的翻译结果
    const existingTranslations = document.querySelectorAll('.translation-result');
    existingTranslations.forEach(el => el.remove());
    
    // 创建加载状态容器
    const loadingContainer = document.createElement('div');
    loadingContainer.id = 'translator-loading';
    loadingContainer.className = 'translation-result';
    loadingContainer.innerHTML = '正在翻译<span class="loading-dots"></span>';
    
    // 将加载状态插入到选中文本后面
    range.collapse(false);
    range.insertNode(loadingContainer);
  }
}

// 获取页面主要内容
function getPageContent() {
  // 获取主要内容元素
  const mainContent = document.querySelector('main, article') || document.body;
  
  // 获取所有文本节点
  const textNodes = [];
  const walk = document.createTreeWalker(
    mainContent,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // 过滤掉脚本和样式标签中的文本
        if (node.parentElement.tagName === 'SCRIPT' || 
            node.parentElement.tagName === 'STYLE' ||
            node.parentElement.classList.contains('translation-result')) {
          return NodeFilter.FILTER_REJECT;
        }
        // 过滤掉空白文本
        if (node.textContent.trim() === '') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while (node = walk.nextNode()) {
    textNodes.push(node.textContent.trim());
  }

  return textNodes.join('\n');
}

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageContent') {
    const content = getPageContent();
    chrome.runtime.sendMessage({
      action: 'pageContent',
      content: content
    });
  } else if (message.action === 'translationStart') {
    showLoading(message.isFullPage);
  } else if (message.action === 'showTranslation' || message.action === 'showError') {
    const text = message.action === 'showTranslation' 
      ? message.translation 
      : `错误: ${message.error}`;
    
    showTranslation(text, message.isFullPage);
  }
});
