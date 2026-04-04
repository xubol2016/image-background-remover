import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import type { UploadZoneProps } from '../types';
import './UploadZone.css';

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, isLoading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件 (JPG 或 PNG)');
      return;
    }
    
    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    setSelectedFile(file);
    
    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    onFileSelect(file);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  if (selectedFile && previewUrl) {
    return (
      <div className="upload-zone selected">
        <div className="selected-file">
          <img src={previewUrl} alt="预览" className="preview-image" />
          {!isLoading && (
            <button className="clear-btn" onClick={clearSelection}>
              <X size={20} />
            </button>
          )}
        </div>
        <p className="file-name">{selectedFile.name}</p>
      </div>
    );
  }

  return (
    <div
      className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-input"
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleFileInput}
        className="file-input"
      />
      <label htmlFor="file-input" className="upload-label">
        <div className="upload-icon">
          {isDragOver ? <ImageIcon size={48} /> : <Upload size={48} />}
        </div>
        <p className="upload-text">
          {isDragOver ? '松开以上传图片' : '拖拽图片到这里'}
        </p>
        <p className="upload-subtext">或点击选择文件</p>
        <p className="upload-hint">支持 JPG、PNG 格式，最大 10MB</p>
      </label>
    </div>
  );
};
