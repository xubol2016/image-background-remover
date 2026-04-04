import React from 'react';
import { Download, RefreshCw, Check } from 'lucide-react';
import type { ResultViewProps } from '../types';
import './ResultView.css';

export const ResultView: React.FC<ResultViewProps> = ({
  processedImage,
  onDownload,
  onReset
}) => {
  if (!processedImage) {
    return null;
  }

  return (
    <div className="result-view">
      <div className="success-message">
        <Check size={20} />
        <span>背景移除成功！</span>
      </div>
      
      <div className="action-buttons">
        <button className="btn btn-primary" onClick={onDownload}>
          <Download size={18} />
          <span>下载结果</span>
        </button>
        
        <button className="btn btn-secondary" onClick={onReset}>
          <RefreshCw size={18} />
          <span>处理新图片</span>
        </button>
      </div>
    </div>
  );
};
