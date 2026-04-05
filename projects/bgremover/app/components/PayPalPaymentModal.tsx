'use client'

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { useState } from 'react'

// --- Types ---

interface CreditPaymentProps {
  type: 'credit'
  packType: string
  packName: string
  credits: number
  priceUSD: string
  onClose: () => void
  onSuccess: (result: { creditsAdded: number; totalCredits: number }) => void
}

interface SubscriptionPaymentProps {
  type: 'subscription'
  plan: 'pro' | 'enterprise'
  billing: 'monthly' | 'yearly'
  planName: string
  priceUSD: string
  onClose: () => void
  onSuccess: (result: { tier: string; quota: number }) => void
}

export type PaymentModalProps = CreditPaymentProps | SubscriptionPaymentProps

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''

function getAuthToken(): string {
  return localStorage.getItem('auth_token') || ''
}

// --- Credit Pack Buttons (one-time payment) ---

function CreditButtons({ packType, onSuccess, onError }: {
  packType: string
  onSuccess: (result: any) => void
  onError: (msg: string) => void
}) {
  return (
    <PayPalButtons
      style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
      createOrder={async () => {
        const token = getAuthToken()
        const response = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ packType }),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || '创建订单失败')
        }
        const { orderId } = await response.json()
        return orderId
      }}
      onApprove={async (data) => {
        const token = getAuthToken()
        const response = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId: data.orderID }),
        })
        if (!response.ok) {
          const errorData = await response.json()
          onError(errorData.error || '支付确认失败')
          return
        }
        const result = await response.json()
        onSuccess(result)
      }}
      onError={(err) => {
        console.error('PayPal error:', err)
        onError('PayPal 支付出错，请重试')
      }}
    />
  )
}

// --- Subscription Buttons ---

function SubscriptionButtons({ plan, billing, onSuccess, onError }: {
  plan: string
  billing: string
  onSuccess: (result: any) => void
  onError: (msg: string) => void
}) {
  return (
    <PayPalButtons
      style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe' }}
      createSubscription={async () => {
        const token = getAuthToken()
        const response = await fetch('/api/paypal/create-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ plan, billing }),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || '创建订阅失败')
        }
        const { subscriptionId } = await response.json()
        return subscriptionId
      }}
      onApprove={async (data) => {
        if (!data.subscriptionID) {
          onError('未获取到订阅ID')
          return
        }
        const token = getAuthToken()
        const response = await fetch('/api/paypal/activate-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ subscriptionId: data.subscriptionID }),
        })
        if (!response.ok) {
          const errorData = await response.json()
          onError(errorData.error || '订阅激活失败')
          return
        }
        const result = await response.json()
        onSuccess(result)
      }}
      onError={(err) => {
        console.error('PayPal error:', err)
        onError('PayPal 支付出错，请重试')
      }}
    />
  )
}

// --- Main Modal ---

export function PayPalPaymentModal(props: PaymentModalProps) {
  const { type, onClose, onSuccess } = props
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successResult, setSuccessResult] = useState<any>(null)

  const scriptOptions = type === 'credit'
    ? {
        clientId: PAYPAL_CLIENT_ID,
        currency: 'USD',
        intent: 'capture' as const,
        components: 'buttons',
      }
    : {
        clientId: PAYPAL_CLIENT_ID,
        currency: 'USD',
        intent: 'subscription' as any,
        vault: true,
        components: 'buttons',
      }

  const handleSuccess = (result: any) => {
    setSuccess(true)
    setSuccessResult(result)
  }

  const handleError = (msg: string) => {
    setError(msg)
  }

  const handleDone = () => {
    onSuccess(successResult)
    onClose()
  }

  const title = type === 'credit' ? '购买积分包' : '订阅套餐'
  const description = type === 'credit'
    ? `${(props as CreditPaymentProps).packName} - ${(props as CreditPaymentProps).credits}张额度`
    : (props as SubscriptionPaymentProps).planName
  const price = type === 'credit'
    ? `$${(props as CreditPaymentProps).priceUSD}`
    : `$${(props as SubscriptionPaymentProps).priceUSD}/${(props as SubscriptionPaymentProps).billing === 'monthly' ? '月' : '年'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">支付成功！</h4>
              <p className="text-slate-600 mb-6">
                {type === 'credit'
                  ? `已成功添加 ${successResult?.creditsAdded || 0} 张额度`
                  : `已成功升级为 ${successResult?.tier === 'pro' ? 'Pro' : '企业'}版`}
              </p>
              <button
                onClick={handleDone}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
              >
                完成
              </button>
            </div>
          ) : (
            <>
              {/* Order info */}
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{description}</span>
                  <span className="text-xl font-bold text-slate-800">{price}</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4 flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-2 underline text-xs">
                    关闭
                  </button>
                </div>
              )}

              {/* PayPal Buttons */}
              <PayPalScriptProvider options={scriptOptions}>
                {type === 'credit' ? (
                  <CreditButtons
                    packType={(props as CreditPaymentProps).packType}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  />
                ) : (
                  <SubscriptionButtons
                    plan={(props as SubscriptionPaymentProps).plan}
                    billing={(props as SubscriptionPaymentProps).billing}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  />
                )}
              </PayPalScriptProvider>

              <p className="text-xs text-slate-400 text-center mt-4">
                PayPal 安全支付 · 沙箱测试环境
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
