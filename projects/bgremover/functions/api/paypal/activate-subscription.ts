import { authenticateRequest } from '../user/_utils'
import { getPayPalAccessToken, PAYPAL_API_BASE } from './_utils'

interface Env {
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  BGREMOVER_KV: KVNamespace
}

const TIER_CONFIG: Record<string, { tier: 'pro' | 'enterprise'; monthly: number }> = {
  pro_monthly: { tier: 'pro', monthly: 50 },
  pro_yearly: { tier: 'pro', monthly: 50 },
  enterprise_monthly: { tier: 'enterprise', monthly: 200 },
  enterprise_yearly: { tier: 'enterprise', monthly: 200 },
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
    if (!auth) {
      return Response.json({ error: '请先登录' }, { status: 401 })
    }

    const { subscriptionId } = await context.request.json() as { subscriptionId: string }
    if (!subscriptionId) {
      return Response.json({ error: '缺少订阅ID' }, { status: 400 })
    }

    const accessToken = await getPayPalAccessToken(
      context.env.PAYPAL_CLIENT_ID,
      context.env.PAYPAL_CLIENT_SECRET
    )

    // Verify subscription with PayPal
    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      return Response.json({ error: '订阅验证失败' }, { status: 400 })
    }

    const subscription = await response.json() as {
      id: string
      status: string
      plan_id: string
      custom_id: string
      billing_info?: { next_billing_time: string }
    }

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'APPROVED') {
      return Response.json({ error: `订阅状态异常: ${subscription.status}` }, { status: 400 })
    }

    const [userId, planKey] = (subscription.custom_id || '').split(':')
    if (userId !== auth.userId) {
      return Response.json({ error: '订阅用户不匹配' }, { status: 403 })
    }

    const tierInfo = TIER_CONFIG[planKey]
    if (!tierInfo) {
      return Response.json({ error: '无法识别订阅计划' }, { status: 400 })
    }

    // Upgrade user tier
    const userKey = `user:${auth.userId}`
    const userData = await context.env.BGREMOVER_KV.get(userKey)
    if (userData) {
      const user = JSON.parse(userData)
      user.tier = tierInfo.tier
      await context.env.BGREMOVER_KV.put(userKey, JSON.stringify(user))
    }

    // Set quota
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    await context.env.BGREMOVER_KV.put(
      `quota:${auth.userId}`,
      JSON.stringify({
        total: tierInfo.monthly,
        used: 0,
        resetAt: nextMonth.toISOString(),
      })
    )

    // Record subscription
    await context.env.BGREMOVER_KV.put(
      `subscription:${auth.userId}`,
      JSON.stringify({
        paypalSubscriptionId: subscription.id,
        planId: subscription.plan_id,
        plan: tierInfo.tier,
        planKey,
        status: 'active',
        nextBillingTime: subscription.billing_info?.next_billing_time,
        createdAt: new Date().toISOString(),
      })
    )

    return Response.json({
      success: true,
      tier: tierInfo.tier,
      quota: tierInfo.monthly,
    })
  } catch (error) {
    console.error('Activate subscription error:', error)
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
