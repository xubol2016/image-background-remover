import {
  authenticateRequest,
  getUserQuota,
  incrementQuotaUsage,
  QUOTA_CONFIG,
  type UserQuota,
} from './user/_utils'
import { getCreditBalance, deductCredits } from './credits/balance'

interface Env {
  REMOVE_BG_API_KEY: string
  BGREMOVER_KV: KVNamespace
}

// 获取游客配额（终身2张）
async function getGuestQuota(kv: KVNamespace, clientIP: string): Promise<UserQuota | null> {
  const guestKey = `guest:${clientIP}`
  const data = await kv.get(guestKey)
  
  if (!data) {
    // 初始化新游客配额（终身2张）
    const quota: UserQuota = {
      total: QUOTA_CONFIG.guest.lifetime,
      used: 0,
      resetAt: '', // 终身配额，无重置时间
    }
    await kv.put(guestKey, JSON.stringify(quota), { expirationTtl: 60 * 60 * 24 * 30 })
    return quota
  }
  
  return JSON.parse(data)
}

// 增加游客使用量
async function incrementGuestQuota(kv: KVNamespace, clientIP: string): Promise<UserQuota | null> {
  const guestKey = `guest:${clientIP}`
  const quota = await getGuestQuota(kv, clientIP)
  if (!quota) return null
  
  quota.used += 1
  await kv.put(guestKey, JSON.stringify(quota), { expirationTtl: 60 * 60 * 24 * 30 })
  return quota
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const formData = await context.request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return Response.json({ error: '请上传图片' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(image.type)) {
      return Response.json({ error: '仅支持 JPG 和 PNG 格式' }, { status: 400 })
    }

    // 检查用户配额
    const authHeader = context.request.headers.get('Authorization')
    const clientIP = context.request.headers.get('CF-Connecting-IP') || 'unknown'
    
    let quota: UserQuota | null = null
    let isGuest = false
    let userId: string | null = null
    let useCredit = false
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // 已登录用户
      const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
      if (!auth) {
        return Response.json({ error: '登录已过期，请重新登录' }, { status: 401 })
      }
      
      userId = auth.userId
      quota = await getUserQuota(context.env.BGREMOVER_KV, auth.userId)
      
      // 检查订阅额度
      const hasSubscriptionQuota = quota && quota.used < quota.total
      
      // 检查积分余额
      const creditBalance = await getCreditBalance(context.env.BGREMOVER_KV, auth.userId)
      const hasCredits = creditBalance.credits > 0
      
      if (!hasSubscriptionQuota && !hasCredits) {
        return Response.json({
          error: '额度已用完，请购买积分包或订阅套餐',
          code: 'QUOTA_EXCEEDED',
          quota: quota ? { used: quota.used, total: quota.total } : null,
          credits: creditBalance.credits,
        }, { status: 403 })
      }
      
      // 优先使用订阅额度，没有则使用积分
      useCredit = !hasSubscriptionQuota && hasCredits
    } else {
      // 游客用户
      isGuest = true
      quota = await getGuestQuota(context.env.BGREMOVER_KV, clientIP)
      
      if (!quota || quota.used >= quota.total) {
        return Response.json({
          error: '免费体验额度已用完，登录即送3张额度',
          code: 'GUEST_QUOTA_EXCEEDED',
          quota: quota ? { used: quota.used, total: quota.total } : null,
          isLifetime: true,
        }, { status: 403 })
      }
    }

    const maxSize = 10 * 1024 * 1024
    if (image.size > maxSize) {
      return Response.json({ error: '图片大小不能超过 10MB' }, { status: 400 })
    }

    const apiKey = context.env.REMOVE_BG_API_KEY
    if (!apiKey) {
      return Response.json({ error: '服务器配置错误，请联系管理员' }, { status: 500 })
    }

    const removeBgFormData = new FormData()
    removeBgFormData.append('image_file', image)
    removeBgFormData.append('size', 'auto')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: removeBgFormData,
    })

    if (!response.ok) {
      if (response.status === 402) {
        return Response.json({ error: 'API 额度已用完，请联系管理员' }, { status: 429 })
      }
      if (response.status === 429) {
        return Response.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
      }
      return Response.json({ error: '背景移除服务暂时不可用，请稍后再试' }, { status: 502 })
    }

    // 扣除配额
    if (isGuest) {
      await incrementGuestQuota(context.env.BGREMOVER_KV, clientIP)
    } else if (userId) {
      if (useCredit) {
        // 扣除积分
        await deductCredits(context.env.BGREMOVER_KV, userId)
      } else {
        // 扣除订阅额度
        await incrementQuotaUsage(context.env.BGREMOVER_KV, userId)
      }
    }

    const processedImageBuffer = await response.arrayBuffer()

    return new Response(processedImageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error processing image:', error)
    return Response.json({ error: '处理失败，请重试' }, { status: 500 })
  }
}
