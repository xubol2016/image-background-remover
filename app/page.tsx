'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import GoogleLoginButton from './components/GoogleLoginButton'
import UserAvatar from './components/UserAvatar'
import Link from 'next/link'

interface ProcessedImage {
  original: string
  processed: string
  filename: string
}

interface QuotaInfo {
  total: number
  used: number
  remaining: number
  isGuest: boolean
  isLifetime?: boolean
}

export default function Home() {
  const { user } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null)
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [showQuotaAlert, setShowQuotaAlert] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg']

  // 获取配额信息
  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const headers: HeadersInit = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch('/api/auth/guest', { headers })
        if (response.ok) {
          const data = await response.json()
          setQuota(data)
          // 如果剩余额度少于3张，显示提示
          if (data.remaining <= 3) {
            setShowQuotaAlert(true)
          }
        }
      } catch (error) {
        console.error('Fetch quota error:', error)
      }
    }
    
    fetchQuota()
  }, [user])

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return '请上传 JPG 或 PNG 格式的图片'
    }
    if (file.size > MAX_FILE_SIZE) {
      return '图片大小不能超过 10MB'
    }
    return null
  }

  const processImage = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.code === 'QUOTA_EXCEEDED' || errorData.code === 'GUEST_QUOTA_EXCEEDED') {
          // 更新配额显示
          if (errorData.quota) {
            setQuota(prev => prev ? { ...prev, ...errorData.quota, remaining: 0 } : null)
          }
          setShowQuotaAlert(true)
        }
        throw new Error(errorData.error || '处理失败，请重试')
      }

      // 更新配额
      if (quota) {
        setQuota({ ...quota, used: quota.used + 1, remaining: quota.remaining - 1 })
      }

      const blob = await response.blob()
      const processedUrl = URL.createObjectURL(blob)
      const originalUrl = URL.createObjectURL(file)

      setProcessedImage({
        original: originalUrl,
        processed: processedUrl,
        filename: file.name.replace(/\.[^/.]+$/, '') + '_nobg.png',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processImage(files[0])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processImage(files[0])
    }
  }, [])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleDownload = useCallback(() => {
    if (processedImage) {
      const link = document.createElement('a')
      link.href = processedImage.processed
      link.download = processedImage.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [processedImage])

  const handleReset = useCallback(() => {
    if (processedImage) {
      URL.revokeObjectURL(processedImage.original)
      URL.revokeObjectURL(processedImage.processed)
    }
    setProcessedImage(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [processedImage])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 md:py-16">
        {/* Header with Auth */}
        <div className="flex justify-between items-start mb-8 md:mb-12">
          <div className="text-center flex-1">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-4">
              🖼️ BgRemover
            </h1>
            <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
              一键移除图片背景，快速、简单、免费
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <UserAvatar />
            {!user && <GoogleLoginButton />}
          </div>
        </div>

        {/* Quota Alert */}
        {showQuotaAlert && quota && (
          <div className={`max-w-xl mx-auto mb-6 p-4 rounded-xl ${
            quota.remaining === 0 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                quota.remaining === 0 ? 'text-red-500' : 'text-amber-500'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className={`font-medium ${
                  quota.remaining === 0 ? 'text-red-800' : 'text-amber-800'
                }`}>
                  {quota.remaining === 0 
                    ? '额度已用完' 
                    : `仅剩 ${quota.remaining} 张额度`
                  }
                </p>
                <p className={`text-sm mt-1 ${
                  quota.remaining === 0 ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {quota.isGuest
                    ? '登录即送 3 张，或购买积分包/订阅'
                    : '额度用完可购买积分包或订阅套餐'
                  }
                </p>
                <Link
                  href={quota.isGuest ? "/" : "/pricing"}
                  className={`inline-block mt-2 text-sm font-medium ${
                    quota.remaining === 0 
                      ? 'text-red-700 hover:text-red-800' 
                      : 'text-amber-700 hover:text-amber-800'
                  }`}
                  onClick={() => {
                    if (quota.isGuest) {
                      // 滚动到登录按钮
                      document.querySelector('[data-login-area]')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                >
                  {quota.isGuest ? '立即登录 →' : '查看定价方案 →'}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quota Badge */}
        {quota && quota.remaining > 0 && (
          <div className="max-w-xl mx-auto mb-6">
            <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-slate-600">
                  {quota.isGuest ? '体验额度' : '剩余额度'}
                </span>
                {quota.isGuest && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    终身
                  </span>
                )}
                {!quota.isGuest && quota.total <= 5 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    赠送
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      quota.remaining / quota.total < 0.5 ? 'bg-red-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${(quota.remaining / quota.total) * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-medium ${
                  quota.remaining / quota.total < 0.5 ? 'text-red-600' : 'text-slate-700'
                }`}>
                  {quota.remaining}/{quota.total}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Upload Area */}
        {!processedImage && (
          <div className="max-w-2xl mx-auto">
            <div
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-3 border-dashed rounded-2xl p-8 md:p-16
                flex flex-col items-center justify-center
                cursor-pointer transition-all duration-300
                ${isDragging 
                  ? 'border-primary-500 bg-primary-50 scale-[1.02]' 
                  : 'border-slate-300 bg-white hover:border-primary-400 hover:bg-slate-50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {isProcessing ? (
                <div className="text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4">
                    <div className="w-full h-full border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-slate-600 text-lg font-medium">正在处理中...</p>
                  <p className="text-slate-400 text-sm mt-2">预计需要 3-5 秒</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 md:w-20 md:h-20 mb-4 text-primary-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                  </div>
                  <p className="text-slate-700 text-lg md:text-xl font-medium mb-2">
                    拖拽图片到这里
                  </p>
                  <p className="text-slate-400 text-sm md:text-base mb-4">
                    或点击选择文件
                  </p>
                  <p className="text-slate-400 text-xs md:text-sm">
                    支持 JPG、PNG 格式，最大 10MB
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Result Preview */}
        {processedImage && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-8">
              <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-6 text-center">
                处理结果
              </h2>
              
              {/* Comparison */}
              <div className="grid md:grid-cols-2 gap-4 md:gap-8 mb-8">
                {/* Original */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-500 text-center">原图</p>
                  <div className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={processedImage.original}
                      alt="原图"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Processed */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-500 text-center">处理后</p>
                  <div 
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                        linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                        linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                      `,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                    }}
                  >
                    <img
                      src={processedImage.processed}
                      alt="处理后"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleDownload}
                  className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg shadow-primary-200 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  下载透明背景 PNG
                </button>
                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  处理新图片
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-12 md:mt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: '⚡', title: '快速处理', desc: '5秒内完成' },
              { icon: '🔒', title: '隐私安全', desc: '不存储图片' },
              { icon: '🎨', title: '高清输出', desc: '透明背景 PNG' },
              { icon: '📱', title: '全平台', desc: '支持所有设备' },
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-4 md:p-6 text-center shadow-sm">
                <div className="text-2xl md:text-3xl mb-2">{feature.icon}</div>
                <h3 className="font-semibold text-slate-800 text-sm md:text-base">{feature.title}</h3>
                <p className="text-slate-400 text-xs md:text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 md:p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold mb-2">需要更多额度？</h3>
                <p className="text-primary-100">
                  积分包永不过期 ¥9起，或订阅 Pro 版 ¥19/月
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-8 py-3 bg-white text-primary-600 rounded-xl font-medium hover:bg-primary-50 transition-colors whitespace-nowrap"
              >
                查看定价
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 md:mt-16 text-slate-400 text-sm">
          <p>BgRemover © 2024 - 一键移除图片背景工具</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/pricing" className="hover:text-slate-600 transition-colors">
              定价
            </Link>
            <span>·</span>
            <Link href="/pricing#faq" className="hover:text-slate-600 transition-colors">
              常见问题
            </Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
