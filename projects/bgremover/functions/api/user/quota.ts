import { authenticateRequest, getUserQuota, type UserQuota } from './_utils'

interface Env {
  BGREMOVER_KV: KVNamespace
}

// GET /api/user/quota - 获取用户配额
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
    if (!auth) {
      return Response.json({ error: '未登录或会话已过期' }, { status: 401 })
    }

    const quota = await getUserQuota(context.env.BGREMOVER_KV, auth.userId)
    if (!quota) {
      return Response.json({ error: '配额信息不存在' }, { status: 404 })
    }

    // 计算剩余配额
    const remaining = Math.max(0, quota.total - quota.used)
    const usagePercent = Math.round((quota.used / quota.total) * 100)

    return Response.json({
      quota,
      remaining,
      usagePercent,
    })
  } catch (error) {
    console.error('Get quota error:', error)
    return Response.json({ error: '获取配额信息失败' }, { status: 500 })
  }
}
