import { authenticateRequest, getUserQuota } from '../user/_utils'

interface Env {
  BGREMOVER_KV: KVNamespace
}

interface CreditBalance {
  credits: number        // 剩余积分
  totalPurchased: number // 总购买积分
  lastUpdated: string
}

// 获取用户积分余额
export async function getCreditBalance(
  kv: KVNamespace,
  userId: string
): Promise<CreditBalance> {
  const key = `credits:${userId}`
  const data = await kv.get(key)
  
  if (!data) {
    return {
      credits: 0,
      totalPurchased: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
  
  return JSON.parse(data)
}

// 增加用户积分
export async function addCredits(
  kv: KVNamespace,
  userId: string,
  amount: number
): Promise<CreditBalance> {
  const key = `credits:${userId}`
  const balance = await getCreditBalance(kv, userId)
  
  balance.credits += amount
  balance.totalPurchased += amount
  balance.lastUpdated = new Date().toISOString()
  
  await kv.put(key, JSON.stringify(balance))
  return balance
}

// 扣除用户积分
export async function deductCredits(
  kv: KVNamespace,
  userId: string
): Promise<{ success: boolean; balance?: CreditBalance; error?: string }> {
  const key = `credits:${userId}`
  const balance = await getCreditBalance(kv, userId)
  
  if (balance.credits <= 0) {
    return { success: false, error: '积分不足' }
  }
  
  balance.credits -= 1
  balance.lastUpdated = new Date().toISOString()
  
  await kv.put(key, JSON.stringify(balance))
  return { success: true, balance }
}

// GET /api/credits/balance - 获取用户积分余额
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
    if (!auth) {
      return Response.json({ error: '请先登录' }, { status: 401 })
    }

    const balance = await getCreditBalance(context.env.BGREMOVER_KV, auth.userId)
    const quota = await getUserQuota(context.env.BGREMOVER_KV, auth.userId)
    
    return Response.json({
      credits: balance.credits,
      totalPurchased: balance.totalPurchased,
      subscriptionQuota: quota ? {
        total: quota.total,
        used: quota.used,
        remaining: quota.total - quota.used,
      } : null,
    })
  } catch (error) {
    console.error('Get credit balance error:', error)
    return Response.json({ error: '获取积分余额失败' }, { status: 500 })
  }
}
