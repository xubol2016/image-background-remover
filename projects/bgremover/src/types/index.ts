export interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export interface ImagePreviewProps {
  originalImage: string | null;
  processedImage: string | null;
  isLoading: boolean;
}

export interface ResultViewProps {
  processedImage: string | null;
  onDownload: () => void;
  onReset: () => void;
}

export interface RemoveBgResponse {
  success: boolean;
  data?: {
    image: string;
  };
  error?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}
