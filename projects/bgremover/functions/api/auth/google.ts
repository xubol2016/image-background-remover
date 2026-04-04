import { jwtVerify, createRemoteJWKSet } from 'jose'
import { initUserData, getGuestQuota, QUOTA_CONFIG } from '../user/_utils'

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

    // 初始化或更新用户数据和配额
    const { profile, quota } = await initUserData(context.env.BGREMOVER_KV, user)

    // 生成会话 token
    const sessionToken = crypto.randomUUID()

    // 存储会话到 KV (7天过期)
    await context.env.BGREMOVER_KV.put(
      `session:${sessionToken}`,
      JSON.stringify(user),
      { expirationTtl: 60 * 60 * 24 * 7 }
    )

    // 返回用户信息 + 会话 token + 配额信息
    return Response.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      token: sessionToken,
      quota: {
        total: quota.total,
        used: quota.used,
        remaining: quota.total - quota.used,
      },
      tier: profile.tier,
    })
  } catch (error) {
    console.error('Auth error:', error)
    return Response.json({ error: '验证失败' }, { status: 401 })
  }
}

// GET /api/auth/guest - 获取游客配额信息
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // 获取客户端 IP 作为游客标识
    const clientIP = context.request.headers.get('CF-Connecting-IP') || 'unknown'
    const guestKey = `guest:${clientIP}`
    
    // 获取或初始化游客配额
    let guestData = await context.env.BGREMOVER_KV.get(guestKey)
    let quota = getGuestQuota()
    
    if (guestData) {
      // 已存在游客配额，继续使用（终身配额，不重置）
      const existing = JSON.parse(guestData)
      quota = {
        total: existing.total,
        used: existing.used,
        resetAt: '', // 终身配额，无重置时间
      }
    }
    
    // 保存游客配额（30天过期，防止KV无限增长）
    await context.env.BGREMOVER_KV.put(
      guestKey,
      JSON.stringify(quota),
      { expirationTtl: 60 * 60 * 24 * 30 }
    )
    
    return Response.json({
      quota: {
        total: quota.total,
        used: quota.used,
        remaining: Math.max(0, quota.total - quota.used),
      },
      isGuest: true,
      isLifetime: true, // 标记为终身配额
    })
  } catch (error) {
    console.error('Guest auth error:', error)
    return Response.json({ error: '获取游客配额失败' }, { status: 500 })
  }
}
