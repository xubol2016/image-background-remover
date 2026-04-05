const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com'

export async function getPayPalAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const auth = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('PayPal auth error:', error)
    throw new Error('获取 PayPal 访问令牌失败')
  }

  const data = await response.json() as { access_token: string }
  return data.access_token
}

export { PAYPAL_API_BASE }
