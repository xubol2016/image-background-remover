'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'

interface PricingPlan {
  name: string
  tier: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features: string[]
  notIncluded?: string[]
  popular?: boolean
  buttonText: string
  buttonStyle: string
}

// 积分包配置
interface CreditPack {
  name: string
  credits: number
  price: number
  popular?: boolean
}

const creditPacks: CreditPack[] = [
  { name: '小额度', credits: 10, price: 9 },
  { name: '常用包', credits: 50, price: 29, popular: true },
  { name: '大额度', credits: 200, price: 99 },
]

const plans: PricingPlan[] = [
  {
    name: '免费版',
    tier: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: '注册即送 3 张，用完可购买积分包',
    features: [
      '注册赠送 3 张（一次性）',
      '游客仅 2 张终身',
      '标准质量输出',
      '基础支持',
      '可购买积分包补充',
    ],
    notIncluded: ['月订阅', '批量处理', 'API 接入'],
    buttonText: '免费开始',
    buttonStyle: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  },
  {
    name: 'Pro 版',
    tier: 'pro',
    monthlyPrice: 19,
    yearlyPrice: 149,
    description: '按月订阅，适合定期使用的用户',
    features: [
      '每月 50 张图片处理',
      '高清质量输出',
      '无水印下载',
      '优先处理队列',
      '保存 30 天历史记录',
      '邮件支持',
    ],
    popular: true,
    buttonText: '立即订阅',
    buttonStyle: 'bg-primary-600 text-white hover:bg-primary-700',
  },
  {
    name: '企业版',
    tier: 'enterprise',
    monthlyPrice: 99,
    yearlyPrice: 799,
    description: '适合团队和企业用户',
    features: [
      '每月 200 张图片处理',
      '超高清质量输出',
      '批量处理功能',
      'API 接入权限',
      '无限历史记录',
      '专属客服支持',
    ],
    buttonText: '联系销售',
    buttonStyle: 'bg-slate-800 text-white hover:bg-slate-900',
  },
]

const faqs = [
  {
    question: '免费版和付费版有什么区别？',
    answer: '免费版注册即送 3 张一次性额度，用完后可购买积分包。Pro 版每月 50 张订阅额度，提供高清输出和无水印下载。企业版每月 200 张，支持批量处理和 API 接入。',
  },
  {
    question: '积分包和订阅有什么区别？',
    answer: '积分包是一次性购买，永不过期，适合偶尔使用的用户。订阅是按月/年付费，额度每月重置，适合定期使用的用户。两者可以叠加使用。',
  },
  {
    question: '额度用完后怎么办？',
    answer: '您可以购买积分包补充额度，或者升级到订阅套餐。积分包永不过期，随时可用。订阅额度每月自动重置。',
  },
  {
    question: '可以随时取消订阅吗？',
    answer: '是的，您可以随时在账户设置中取消订阅。取消后，您仍可使用付费功能直到当前计费周期结束，之后自动降级为免费版。',
  },
  {
    question: '年付和月付有什么区别？',
    answer: '年付享受大幅优惠：Pro 版年付 ¥149（相当于 ¥12.4/月，节省 35%），企业版年付 ¥799（相当于 ¥66.6/月，节省 33%）。',
  },
  {
    question: '支持哪些支付方式？',
    answer: '目前支持支付宝、微信支付。PayPal 和国际信用卡支付即将上线。企业版还支持对公转账，可开具增值税专用发票。',
  },
  {
    question: '处理后的图片会保存多久？',
    answer: '免费版保存 7 天，Pro 版保存 30 天，企业版永久保存。建议及时下载处理后的图片到本地。',
  },
  {
    question: '如何申请退款？',
    answer: '订阅购买后 7 天内，如果处理量不超过 5 张，可申请全额退款。积分包购买后未使用可申请退款。请联系客服处理。',
  },
]

export default function PricingPage() {
  const { user } = useAuth()
  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState<string | null>(null)

  // 购买积分包
  const handleBuyCredits = async (packType: string) => {
    if (!user) {
      alert('请先登录')
      return
    }

    setIsLoading(packType)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/credits/packs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packType }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '购买失败')
      }

      const data = await response.json()
      // 跳转到 Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      alert(error instanceof Error ? error.message : '购买失败，请重试')
    } finally {
      setIsLoading(null)
    }
  }

  // 订阅套餐
  const handleSubscribe = async (plan: string) => {
    if (!user) {
      alert('请先登录')
      return
    }

    if (plan === 'free') {
      return
    }

    setIsLoading(plan)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan,
          billing: isYearly ? 'yearly' : 'monthly',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '订阅失败')
      }

      const data = await response.json()
      window.location.href = data.url
    } catch (error) {
      alert(error instanceof Error ? error.message : '订阅失败，请重试')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            选择适合你的方案
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            从免费版开始，随时升级解锁更多功能
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-full p-1 shadow-sm border border-slate-200 inline-flex">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              月付
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              年付
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                省 43%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                plan.popular
                  ? 'border-primary-500 shadow-lg shadow-primary-100 scale-105'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              {plan.popular && (
                <div className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full w-fit mb-4">
                  最受欢迎
                </div>
              )}
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
              <p className="text-slate-500 text-sm mb-4">{plan.description}</p>
              
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-800">
                  ¥{isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice}
                </span>
                <span className="text-slate-500">/月</span>
                {isYearly && plan.yearlyPrice > 0 && (
                  <p className="text-sm text-slate-400 mt-1">
                    年付 ¥{plan.yearlyPrice}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSubscribe(plan.tier)}
                disabled={isLoading === plan.tier}
                className={`w-full py-3 rounded-xl font-medium transition-all mb-6 ${plan.buttonStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading === plan.tier ? '处理中...' : plan.buttonText}
              </button>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">包含功能：</p>
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-600">{feature}</span>
                  </div>
                ))}
                {plan.notIncluded?.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 opacity-50">
                    <svg className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-slate-400">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Credit Packs Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">积分包</h2>
            <p className="text-slate-600">不想订阅？购买一次性积分包，永不过期</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {creditPacks.map((pack) => (
              <div
                key={pack.name}
                className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                  pack.popular
                    ? 'border-primary-500 shadow-lg shadow-primary-100'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                {pack.popular && (
                  <div className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full w-fit mb-4">
                    最划算
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-800 mb-1">{pack.name}</h3>
                <p className="text-3xl font-bold text-slate-800 mb-4">
                  ¥{pack.price}
                  <span className="text-lg text-slate-400 font-normal"> / {pack.credits}张</span>
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  约 ¥{(pack.price / pack.credits).toFixed(2)}/张
                </p>
                <button
                  onClick={() => handleBuyCredits(pack.name === '小额度' ? 'small' : pack.name === '常用包' ? 'medium' : 'large')}
                  disabled={isLoading === (pack.name === '小额度' ? 'small' : pack.name === '常用包' ? 'medium' : 'large')}
                  className={`w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    pack.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isLoading === (pack.name === '小额度' ? 'small' : pack.name === '常用包' ? 'medium' : 'large') ? '处理中...' : '购买'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-4">
            积分包永不过期，可随时使用 · 后续将支持 PayPal 支付
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-16">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800">功能对比</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-600">功能</th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-slate-600">免费版</th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-primary-600">Pro 版</th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-slate-600">企业版</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { feature: '处理额度', free: '注册送3张', pro: '50张/月', enterprise: '200张/月' },
                  { feature: '额度重置', free: '一次性', pro: '每月重置', enterprise: '每月重置' },
                  { feature: '积分包', free: '✓ 可购买', pro: '✓ 可购买', enterprise: '✓ 可购买' },
                  { feature: '输出质量', free: '标准', pro: '高清', enterprise: '超高清' },
                  { feature: '水印', free: '有', pro: '无', enterprise: '无' },
                  { feature: '批量处理', free: '—', pro: '—', enterprise: '✓' },
                  { feature: 'API 接入', free: '—', pro: '—', enterprise: '✓' },
                  { feature: '处理优先级', free: '标准', pro: '优先', enterprise: '最高' },
                  { feature: '历史记录保存', free: '7天', pro: '30天', enterprise: '永久' },
                ].map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-4 px-6 text-sm text-slate-700">{row.feature}</td>
                    <td className="py-4 px-6 text-center text-sm text-slate-600">{row.free}</td>
                    <td className="py-4 px-6 text-center text-sm text-primary-600 font-medium">{row.pro}</td>
                    <td className="py-4 px-6 text-center text-sm text-slate-600">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">常见问题</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-100 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-800">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-slate-600 text-sm leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">还有疑问？</h2>
          <p className="text-primary-100 mb-6 max-w-xl mx-auto">
            我们的团队随时准备为您解答任何问题，帮助您选择最适合的方案
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-primary-600 rounded-xl font-medium hover:bg-primary-50 transition-colors">
              联系客服
            </button>
            <Link
              href="/"
              className="px-8 py-3 bg-primary-700 text-white rounded-xl font-medium hover:bg-primary-800 transition-colors"
            >
              免费试用
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-slate-400 text-sm">
          <p>BgRemover © 2024 - 一键移除图片背景工具</p>
        </footer>
      </div>
    </div>
  )
}
