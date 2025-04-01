document.addEventListener('DOMContentLoaded', async () => {
  // 加载保存的设置
  chrome.storage.sync.get(['apiUrl', 'apiKey', 'targetLang', 'model'], (result) => {
    if (result.apiUrl) document.getElementById('apiUrl').value = result.apiUrl;
    if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
    if (result.targetLang) document.getElementById('targetLang').value = result.targetLang;
  });

  // 获取模型列表
  async function fetchModels() {
    try {
      const apiUrl = document.getElementById('apiUrl').value.trim();
      const apiKey = document.getElementById('apiKey').value.trim();
      const modelsUrl = `${apiUrl}/models`;

      const response = await fetch(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Title': 'Browser Translator'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const modelSelect = document.getElementById('model');
      modelSelect.innerHTML = ''; // 清空现有选项

      data.data.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = `${model.name} (${model.pricing.prompt}/1K tokens)`;
        modelSelect.appendChild(option);
      });

      // 在获取模型列表后设置保存的model值
      chrome.storage.sync.get(['model'], (result) => {
        if (result.model) {
          // 检查保存的model是否在当前可用的模型列表中
          const modelExists = data.data.some(model => model.id === result.model);
          if (modelExists) {
            modelSelect.value = result.model;
          }
        }
      });
    } catch (error) {
      showStatus('获取模型列表失败: ' + error.message, 'error');
    }
  }

  // 在页面加载和API Key变更时获取模型列表
  document.getElementById('apiKey').addEventListener('change', fetchModels);
  fetchModels();

  // 保存设置
  document.getElementById('saveButton').addEventListener('click', () => {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const targetLang = document.getElementById('targetLang').value;
    const model = document.getElementById('model').value;
    const status = document.getElementById('status');

    // 验证输入
    if (!apiUrl || !apiKey) {
      showStatus('请填写所有必填字段', 'error');
      return;
    }

    // 验证API URL格式
    try {
      new URL(apiUrl);
    } catch (e) {
      showStatus('请输入有效的API URL', 'error');
      return;
    }

    // 保存到Chrome存储
    chrome.storage.sync.set({
      apiUrl,
      apiKey,
      targetLang,
      model
    }, () => {
      showStatus('设置已保存', 'success');
    });
  });

  function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';

    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
});