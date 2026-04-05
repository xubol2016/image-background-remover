interface Env {
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  BGREMOVER_KV: KVNamespace
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const payload = await context.request.text()
    const event = JSON.parse(payload)

    // TODO: 生产环境需验证 webhook 签名

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const customId = event.resource?.custom_id || ''
        const [userId] = customId.split(':')

        if (userId) {
          const userKey = `user:${userId}`
          const userData = await context.env.BGREMOVER_KV.get(userKey)
          if (userData) {
            const user = JSON.parse(userData)
            user.tier = 'free'
            await context.env.BGREMOVER_KV.put(userKey, JSON.stringify(user))
          }
          await context.env.BGREMOVER_KV.delete(`subscription:${userId}`)
        }
        break
      }

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const customId = event.resource?.custom_id || ''
        const [userId] = customId.split(':')

        if (userId) {
          const subData = await context.env.BGREMOVER_KV.get(`subscription:${userId}`)
          if (subData) {
            const sub = JSON.parse(subData)
            sub.status = 'payment_failed'
            await context.env.BGREMOVER_KV.put(`subscription:${userId}`, JSON.stringify(sub))
          }
        }
        break
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    return Response.json({ error: 'Webhook 处理失败' }, { status: 500 })
  }
}
