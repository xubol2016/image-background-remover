import { authenticateRequest } from '../user/_utils'
import { addCredits } from '../credits/balance'
import { getPayPalAccessToken, PAYPAL_API_BASE } from './_utils'

interface Env {
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  BGREMOVER_KV: KVNamespace
}

const CREDIT_AMOUNTS: Record<string, number> = {
  small: 10,
  medium: 50,
  large: 200,
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
    if (!auth) {
      return Response.json({ error: '请先登录' }, { status: 401 })
    }

    const { orderId } = await context.request.json() as { orderId: string }
    if (!orderId) {
      return Response.json({ error: '缺少订单ID' }, { status: 400 })
    }

    const accessToken = await getPayPalAccessToken(
      context.env.PAYPAL_CLIENT_ID,
      context.env.PAYPAL_CLIENT_SECRET
    )

    const response = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('PayPal capture error:', error)
      return Response.json({ error: '支付确认失败' }, { status: 500 })
    }

    const captureData = await response.json() as any

    const customId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id || ''
    const [userId, packType] = customId.split(':')

    if (userId !== auth.userId) {
      return Response.json({ error: '订单用户不匹配' }, { status: 403 })
    }

    const credits = CREDIT_AMOUNTS[packType]
    if (!credits) {
      return Response.json({ error: '无效的积分包' }, { status: 400 })
    }

    const balance = await addCredits(context.env.BGREMOVER_KV, auth.userId, credits)

    await context.env.BGREMOVER_KV.put(
      `order:paypal:${orderId}`,
      JSON.stringify({
        userId: auth.userId,
        type: 'credit_pack',
        packType,
        credits,
        paypalOrderId: orderId,
        status: 'completed',
        createdAt: new Date().toISOString(),
      })
    )

    return Response.json({
      success: true,
      creditsAdded: credits,
      totalCredits: balance.credits,
    })
  } catch (error) {
    console.error('PayPal capture error:', error)
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
