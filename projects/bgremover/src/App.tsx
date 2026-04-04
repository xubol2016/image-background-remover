import { useState, useCallback } from 'react';
import { UploadZone } from './components/UploadZone';
import { ImagePreview } from './components/ImagePreview';
import { ResultView } from './components/ResultView';
import type { RemoveBgResponse } from './types';
import './App.css';

function App() {
  const [, setSelectedFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);
    
    // 创建原图预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // 开始处理
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        body: formData,
      });
      
      const result: RemoveBgResponse = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || '处理失败，请重试');
      }
      
      if (result.data?.image) {
        setProcessedImage(`data:image/png;base64,${result.data.image}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败，请重试');
      console.error('Background removal error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `bg-removed-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedImage]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <span className="logo-icon">🖼️</span>
            <span className="logo-text">BgRemover</span>
          </h1>
          <p className="tagline">一键移除图片背景，快速、简单、免费</p>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <UploadZone 
            onFileSelect={handleFileSelect} 
            isLoading={isLoading}
          />
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          <ImagePreview
            originalImage={originalImage}
            processedImage={processedImage}
            isLoading={isLoading}
          />
          
          <ResultView
            processedImage={processedImage}
            onDownload={handleDownload}
            onReset={handleReset}
          />
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>© 2024 BgRemover. 图片仅在内存处理，不存储。</p>
          <p className="footer-hint">支持 JPG、PNG 格式，最大 10MB</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
