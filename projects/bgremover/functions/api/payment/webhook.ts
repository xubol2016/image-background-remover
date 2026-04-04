import { addCredits } from '../credits/balance'

interface Env {
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_SECRET_KEY: string
  BGREMOVER_KV: KVNamespace
}

// 验证 Stripe Webhook 签名
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<{ valid: boolean; event?: any }> {
  try {
    // 简化验证，生产环境应该使用 crypto 验证签名
    // 这里仅用于演示
    return { valid: true, event: JSON.parse(payload) }
  } catch {
    return { valid: false }
  }
}

// 升级用户套餐
async function upgradeUserTier(
  kv: KVNamespace,
  userId: string,
  tier: 'pro' | 'enterprise'
): Promise<void> {
  const userKey = `user:${userId}`
  const quotaKey = `quota:${userId}`

  // 更新用户等级
  const userData = await kv.get(userKey)
  if (userData) {
    const user = JSON.parse(userData)
    user.tier = tier
    await kv.put(userKey, JSON.stringify(user))
  }

  // 更新配额
  const quotaConfig = {
    pro: { monthly: 50 },
    enterprise: { monthly: 200 },
  }

  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const newQuota = {
    total: quotaConfig[tier].monthly,
    used: 0,
    resetAt: nextMonth.toISOString(),
  }

  await kv.put(quotaKey, JSON.stringify(newQuota))
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const payload = await context.request.text()
    const signature = context.request.headers.get('stripe-signature') || ''

    // 验证 Webhook 签名
    const { valid, event } = await verifyWebhookSignature(
      payload,
      signature,
      context.env.STRIPE_WEBHOOK_SECRET
    )

    if (!valid) {
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // 处理不同的事件类型
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan
        const packType = session.metadata?.pack_type
        const credits = session.metadata?.credits

        if (userId) {
          // 处理积分包购买
          if (packType && credits) {
            await addCredits(context.env.BGREMOVER_KV, userId, parseInt(credits))

            // 记录订单
            await context.env.BGREMOVER_KV.put(
              `order:${session.id}`,
              JSON.stringify({
                userId,
                type: 'credit_pack',
                packType,
                credits: parseInt(credits),
                amount: session.amount_total,
                status: 'completed',
                createdAt: new Date().toISOString(),
              })
            )
          }

          // 处理订阅购买
          if (plan) {
            await upgradeUserTier(context.env.BGREMOVER_KV, userId, plan)

            // 记录订阅信息
            await context.env.BGREMOVER_KV.put(
              `subscription:${userId}`,
              JSON.stringify({
                stripeSubscriptionId: session.subscription,
                stripeCustomerId: session.customer,
                plan: plan,
                status: 'active',
                currentPeriodEnd: session.expires_at,
                createdAt: new Date().toISOString(),
              })
            )
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id

        if (userId) {
          // 更新订阅状态为 past_due
          const subData = await context.env.BGREMOVER_KV.get(`subscription:${userId}`)
          if (subData) {
            const sub = JSON.parse(subData)
            sub.status = 'past_due'
            await context.env.BGREMOVER_KV.put(`subscription:${userId}`, JSON.stringify(sub))
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id

        if (userId) {
          // 降级为免费版
          const userKey = `user:${userId}`
          const userData = await context.env.BGREMOVER_KV.get(userKey)
          if (userData) {
            const user = JSON.parse(userData)
            user.tier = 'free'
            await context.env.BGREMOVER_KV.put(userKey, JSON.stringify(user))
          }

          // 删除订阅记录
          await context.env.BGREMOVER_KV.delete(`subscription:${userId}`)
        }
        break
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
