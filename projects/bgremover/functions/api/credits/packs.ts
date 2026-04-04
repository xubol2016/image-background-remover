import { authenticateRequest, getUserQuota } from '../user/_utils'

interface Env {
  STRIPE_SECRET_KEY: string
  BGREMOVER_KV: KVNamespace
}

// 积分包配置
export const CREDIT_PACKS = {
  small: { credits: 10, price: 900, name: '小额度', priceYuan: 9 },      // ¥9 = 900分
  medium: { credits: 50, price: 2900, name: '常用包', priceYuan: 29 },    // ¥29
  large: { credits: 200, price: 9900, name: '大额度', priceYuan: 99 },    // ¥99
}

export type CreditPackType = keyof typeof CREDIT_PACKS

// 验证积分包类型
export function isValidCreditPack(type: string): type is CreditPackType {
  return type in CREDIT_PACKS
}

// 获取积分包信息
export function getCreditPackInfo(type: CreditPackType) {
  return CREDIT_PACKS[type]
}

// GET /api/credits/packs - 获取积分包列表
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // 返回积分包列表（公开接口）
    const packs = Object.entries(CREDIT_PACKS).map(([key, pack]) => ({
      id: key,
      name: pack.name,
      credits: pack.credits,
      price: pack.priceYuan,
      priceCents: pack.price,
      unitPrice: (pack.priceYuan / pack.credits).toFixed(2),
    }))
    
    return Response.json({ packs })
  } catch (error) {
    console.error('Get credit packs error:', error)
    return Response.json({ error: '获取积分包失败' }, { status: 500 })
  }
}

// POST /api/credits/packs - 创建积分包购买订单
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    // 验证用户登录
    const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
    if (!auth) {
      return Response.json({ error: '请先登录' }, { status: 401 })
    }

    const { packType } = await context.request.json() as { packType: string }
    
    if (!packType || !isValidCreditPack(packType)) {
      return Response.json({ error: '无效的积分包类型' }, { status: 400 })
    }

    const pack = CREDIT_PACKS[packType]
    
    // 创建 Stripe Checkout Session
    const origin = context.request.headers.get('origin') || 'https://bgremover.app'
    
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'payment_method_types[]': 'card',
        'payment_method_types[]': 'alipay',
        'line_items[0][price_data][currency]': 'cny',
        'line_items[0][price_data][product_data][name]': `${pack.name} - ${pack.credits}张图片处理额度`,
        'line_items[0][price_data][product_data][description]': `BgRemover 积分包：${pack.credits}张图片背景移除额度，永不过期`,
        'line_items[0][price_data][unit_amount]': pack.price.toString(),
        'line_items[0][quantity]': '1',
        'success_url': `${origin}/profile?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${origin}/pricing?payment=cancelled`,
        'client_reference_id': auth.userId,
        'metadata[user_id]': auth.userId,
        'metadata[pack_type]': packType,
        'metadata[credits]': pack.credits.toString(),
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
    console.error('Create credit pack order error:', error)
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
