'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Link from 'next/link'

interface UserProfile {
  id: string
  email: string
  name: string
  picture: string
  createdAt: string
  lastLoginAt: string
  tier: 'free' | 'pro' | 'enterprise'
  settings: {
    language: 'zh' | 'en'
    notifications: boolean
  }
}

interface UserQuota {
  total: number
  used: number
  resetAt: string
}

interface QuotaInfo {
  quota: UserQuota
  remaining: number
  usagePercent: number
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          setError('未登录')
          return
        }

        // 并行获取用户资料和配额
        const [profileRes, quotaRes] = await Promise.all([
          fetch('/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/user/quota', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (!profileRes.ok || !quotaRes.ok) {
          if (profileRes.status === 401 || quotaRes.status === 401) {
            setError('登录已过期，请重新登录')
            return
          }
          throw new Error('获取数据失败')
        }

        const profileData = await profileRes.json()
        const quotaData = await quotaRes.json()

        setProfile(profileData.profile)
        setQuotaInfo(quotaData)
      } catch (err) {
        setError('加载数据失败，请刷新重试')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // 获取会员等级显示
  const getTierDisplay = (tier: string) => {
    switch (tier) {
      case 'free':
        return { label: '免费版', color: 'bg-slate-100 text-slate-600' }
      case 'pro':
        return { label: 'Pro版', color: 'bg-purple-100 text-purple-600' }
      case 'enterprise':
        return { label: '企业版', color: 'bg-amber-100 text-amber-600' }
      default:
        return { label: '免费版', color: 'bg-slate-100 text-slate-600' }
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">请先登录</p>
          <Link
            href="/"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const tierInfo = profile ? getTierDisplay(profile.tier) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">个人中心</h1>
          <div className="w-20"></div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <img
              src={user.picture}
              alt={user.name}
              className="w-20 h-20 rounded-full border-4 border-primary-100"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
                {tierInfo && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${tierInfo.color}`}>
                    {tierInfo.label}
                  </span>
                )}
              </div>
              <p className="text-slate-500">{user.email}</p>
              {profile && (
                <p className="text-slate-400 text-sm mt-1">
                  注册于 {formatDate(profile.createdAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {quotaInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-slate-600 font-medium">本月已处理</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{quotaInfo.quota.used}</p>
              <p className="text-slate-400 text-sm">张图片</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-slate-600 font-medium">剩余额度</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{quotaInfo.remaining}</p>
              <p className="text-slate-400 text-sm">张图片</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-slate-600 font-medium">使用进度</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{quotaInfo.usagePercent}%</p>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    quotaInfo.usagePercent > 80 ? 'bg-red-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${Math.min(quotaInfo.usagePercent, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Quota Reset Info */}
        {quotaInfo && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                配额将于 <strong>{formatDate(quotaInfo.quota.resetAt)}</strong> 重置
              </span>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            设置
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-800">语言</p>
                <p className="text-sm text-slate-400">当前仅支持中文</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm">
                简体中文
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-800">通知</p>
                <p className="text-sm text-slate-400">接收额度提醒和更新通知</p>
              </div>
              <div className="w-12 h-6 bg-primary-500 rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        {profile?.tier === 'free' && (
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">升级到 Pro 版</h3>
                <p className="text-primary-100 text-sm">每月 100 张高清处理，仅需 ¥29/月</p>
              </div>
              <Link
                href="/pricing"
                className="px-6 py-2 bg-white text-primary-600 rounded-xl font-medium hover:bg-primary-50 transition-colors whitespace-nowrap"
              >
                立即升级
              </Link>
            </div>
          </div>
        )}

        {profile?.tier === 'pro' && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-purple-800">Pro 会员</h3>
                <p className="text-sm text-purple-600">享受高清输出和优先处理</p>
              </div>
            </div>
            <Link
              href="/pricing"
              className="text-sm text-purple-700 hover:text-purple-800 font-medium"
            >
              升级到企业版 →
            </Link>
          </div>
        )}

        {profile?.tier === 'enterprise' && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">企业版会员</h3>
                <p className="text-sm text-amber-600">享受全部高级功能</p>
              </div>
            </div>
            <p className="text-sm text-amber-700">
              专属客服：support@bgremover.com
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 text-slate-400 text-sm">
          <p>BgRemover © 2024 - 一键移除图片背景工具</p>
        </footer>
      </div>
    </div>
  )
}
