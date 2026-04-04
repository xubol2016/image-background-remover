interface Env {
  STRIPE_SECRET_KEY: string
  BGREMOVER_KV: KVNamespace
}

// Stripe 价格 ID 配置（沙盒环境）
const PRICE_IDS = {
  pro_monthly: 'price_test_pro_monthly',    // 需要替换为实际的 Stripe 价格 ID
  pro_yearly: 'price_test_pro_yearly',
  enterprise_monthly: 'price_test_enterprise_monthly',
  enterprise_yearly: 'price_test_enterprise_yearly',
}

// 创建 Checkout Session
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: '未登录' }, { status: 401 })
    }

    const { plan, billing } = await context.request.json() as {
      plan: 'pro' | 'enterprise'
      billing: 'monthly' | 'yearly'
    }

    if (!plan || !billing) {
      return Response.json({ error: '缺少参数' }, { status: 400 })
    }

    const token = authHeader.substring(7)
    const sessionData = await context.env.BGREMOVER_KV.get(`session:${token}`)
    if (!sessionData) {
      return Response.json({ error: '会话已过期' }, { status: 401 })
    }

    const user = JSON.parse(sessionData)
    const priceKey = `${plan}_${billing}` as keyof typeof PRICE_IDS
    const priceId = PRICE_IDS[priceKey]

    if (!priceId) {
      return Response.json({ error: '无效的套餐' }, { status: 400 })
    }

    // 创建 Stripe Checkout Session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'payment_method_types[]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': `${context.request.headers.get('origin')}/profile?payment=success`,
        'cancel_url': `${context.request.headers.get('origin')}/pricing?payment=cancelled`,
        'client_reference_id': user.id,
        'customer_email': user.email,
        'metadata[user_id]': user.id,
        'metadata[plan]': plan,
      }),
    })

    if (!stripeResponse.ok) {
      const error = await stripeResponse.json()
      console.error('Stripe error:', error)
      return Response.json({ error: '创建支付会话失败' }, { status: 500 })
    }

    const checkoutSession = await stripeResponse.json()

    return Response.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Create checkout error:', error)
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
