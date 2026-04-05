import { authenticateRequest } from '../user/_utils'
import { getPayPalAccessToken, PAYPAL_API_BASE } from './_utils'

interface Env {
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  BGREMOVER_KV: KVNamespace
}

const CREDIT_PACKS: Record<string, { credits: number; priceUSD: string; name: string }> = {
  small: { credits: 10, priceUSD: '1.50', name: '10张额度包' },
  medium: { credits: 50, priceUSD: '4.50', name: '50张额度包' },
  large: { credits: 200, priceUSD: '15.00', name: '200张额度包' },
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
    if (!auth) {
      return Response.json({ error: '请先登录' }, { status: 401 })
    }

    const { packType } = await context.request.json() as { packType: string }
    const pack = CREDIT_PACKS[packType]
    if (!pack) {
      return Response.json({ error: '无效的积分包类型' }, { status: 400 })
    }

    const accessToken = await getPayPalAccessToken(
      context.env.PAYPAL_CLIENT_ID,
      context.env.PAYPAL_CLIENT_SECRET
    )

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: pack.priceUSD,
          },
          description: `BgRemover ${pack.name}`,
          custom_id: `${auth.userId}:${packType}`,
        }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('PayPal create order error:', error)
      return Response.json({ error: '创建订单失败' }, { status: 500 })
    }

    const order = await response.json() as { id: string }
    return Response.json({ orderId: order.id })
  } catch (error) {
    console.error('PayPal create order error:', error)
    return Response.json({ error: '服务器错误' }, { status: 500 })
  }
}
