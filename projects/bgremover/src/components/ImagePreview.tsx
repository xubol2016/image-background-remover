import React from 'react';
import { Loader2 } from 'lucide-react';
import type { ImagePreviewProps } from '../types';
import './ImagePreview.css';

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  originalImage,
  processedImage,
  isLoading
}) => {
  if (!originalImage && !processedImage) {
    return null;
  }

  return (
    <div className="image-preview-container">
      <div className="preview-section">
        <h3 className="preview-title">原图</h3>
        <div className="preview-box">
          {originalImage ? (
            <img src={originalImage} alt="原图" className="preview-img" />
          ) : (
            <div className="preview-placeholder">等待上传...</div>
          )}
        </div>
      </div>

      <div className="preview-divider">
        <div className="arrow">→</div>
      </div>

      <div className="preview-section">
        <h3 className="preview-title">处理后</h3>
        <div className="preview-box">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="spinner" size={48} />
              <p>正在移除背景...</p>
              <span className="loading-hint">预计需要 3-5 秒</span>
            </div>
          ) : processedImage ? (
            <img 
              src={processedImage} 
              alt="处理后" 
              className="preview-img processed"
              style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23e5e7eb\' fill-opacity=\'0.4\'%3E%3Cpath fill-rule=\'evenodd\' d=\'M0 0h10v10H0V0zm10 10h10v10H10V10z\'/%3E%3C/g%3E%3C/svg%3E")' }}
            />
          ) : (
            <div className="preview-placeholder">等待处理...</div>
          )}
        </div>
      </div>
    </div>
  );
};
