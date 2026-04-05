import { authenticateRequest } from '../user/_utils'
import { getPayPalAccessToken, PAYPAL_API_BASE } from './_utils'

interface Env {
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  BGREMOVER_KV: KVNamespace
}

interface PlanConfig {
  name: string
  priceUSD: string
  interval: 'MONTH' | 'YEAR'
  tier: 'pro' | 'enterprise'
}

const PLAN_CONFIGS: Record<string, PlanConfig> = {
  pro_monthly: { name: 'BgRemover Pro Monthly', priceUSD: '3.00', interval: 'MONTH', tier: 'pro' },
  pro_yearly: { name: 'BgRemover Pro Yearly', priceUSD: '24.00', interval: 'YEAR', tier: 'pro' },
  enterprise_monthly: { name: 'BgRemover Enterprise Monthly', priceUSD: '15.00', interval: 'MONTH', tier: 'enterprise' },
  enterprise_yearly: { name: 'BgRemover Enterprise Yearly', priceUSD: '120.00', interval: 'YEAR', tier: 'enterprise' },
}

async function getOrCreateProduct(accessToken: string, kv: KVNamespace): Promise<string> {
  const cached = await kv.get('paypal:product_id')
  if (cached) return cached

  const response = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      name: 'BgRemover',
      description: 'BgRemover Image Background Removal Service',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`创建 PayPal 产品失败: ${error}`)
  }

  const product = await response.json() as { id: string }
  await kv.put('paypal:product_id', product.id)
  return product.id
}

async function getOrCreatePlan(
  accessToken: string,
  kv: KVNamespace,
  planKey: string,
  productId: string
): Promise<string> {
  const cached = await kv.get(`paypal:plan:${planKey}`)
  if (cached) return cached

  const config = PLAN_CONFIGS[planKey]
  if (!config) throw new Error('无效的套餐')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      product_id: productId,
      name: config.name,
      billing_cycles: [{
        frequency: {
          interval_unit: config.interval,
          interval_count: 1,
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            currency_code: 'USD',
            value: config.priceUSD,
          },
        },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`创建订阅计划失败: ${error}`)
  }

  const plan = await response.json() as { id: string }
  await kv.put(`paypal:plan:${planKey}`, plan.id)
  return plan.id
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
    if (!auth) {
      return Response.json({ error: '请先登录' }, { status: 401 })
    }

    const { plan, billing } = await context.request.json() as {
      plan: 'pro' | 'enterprise'
      billing: 'monthly' | 'yearly'
    }

    const planKey = `${plan}_${billing}`
    if (!PLAN_CONFIGS[planKey]) {
      return Response.json({ error: '无效的套餐' }, { status: 400 })
    }

    const accessToken = await getPayPalAccessToken(
      context.env.PAYPAL_CLIENT_ID,
      context.env.PAYPAL_CLIENT_SECRET
    )

    const productId = await getOrCreateProduct(accessToken, context.env.BGREMOVER_KV)
    const planId = await getOrCreatePlan(accessToken, context.env.BGREMOVER_KV, planKey, productId)

    // Create subscription
    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: `${auth.userId}:${planKey}`,
        application_context: {
          brand_name: 'BgRemover',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('PayPal create subscription error:', error)
      return Response.json({ error: '创建订阅失败' }, { status: 500 })
    }

    const subscription = await response.json() as { id: string }
    return Response.json({ subscriptionId: subscription.id })
  } catch (error) {
    console.error('Create subscription error:', error)
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
