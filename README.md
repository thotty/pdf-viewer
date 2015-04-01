# PDF-Viewer

A idéia é usar como visualizador de PDF's tendo como base o fantástico [PDF.js](http://mozilla.github.io/pdf.js) e usar em sistemas e afins…

## Exemplo
```javascript
var pdfViewer = PDFViewer({
  pdfViewerContainer: '#container-id',
  debugNoise: true // {boolean} default: false
  style: 'bootstrap-v2.1.1', // {string} default: bootstrap-v2.1.1
  i18n: 'pt-BR' // {string} en-US or pt-BR default: pt-BR
});
pdfViewer.error(function () {
  console.warn('Erro!', arguments);
});
pdfViewer.load('url.pdf');
```
