function generateContent(text) {
  const container = document.getElementById('content');
  const newElement = document.createElement('h1');
  newElement.textContent = text || '這是來自外部 JS 檔案的內容 🎉';
  container.appendChild(newElement);
}
