import { jwtVerify, createRemoteJWKSet } from 'jose'

interface Env {
  GOOGLE_CLIENT_ID: string
  BGREMOVER_KV: KVNamespace
}

const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { credential } = await context.request.json() as { credential: string }
    
    if (!credential) {
      return Response.json({ error: '缺少凭证' }, { status: 400 })
    }

    const clientId = context.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return Response.json({ error: '服务器配置错误' }, { status: 500 })
    }

    // 验证 Google ID Token
    const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI))
    
    const { payload } = await jwtVerify(credential, JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    })

    // 提取用户信息
    const user = {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      picture: payload.picture as string,
    }

    // 生成会话 token
    const sessionToken = crypto.randomUUID()
    
    // 存储会话到 KV (7天过期)
    await context.env.BGREMOVER_KV.put(
      `session:${sessionToken}`,
      JSON.stringify(user),
      { expirationTtl: 60 * 60 * 24 * 7 }
    )

    // 返回用户信息 + 会话 token
    return Response.json({
      success: true,
      user,
      token: sessionToken,
    })
  } catch (error) {
    console.error('Auth error:', error)
    return Response.json({ error: '验证失败' }, { status: 401 })
  }
}
