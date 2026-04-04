interface Env {
  BGREMOVER_KV: KVNamespace
}

export interface UserProfile {
  id: string
  email: string
  name: string
  picture: string
  createdAt: string
  lastLoginAt: string
  tier: 'free' | 'pro' | 'enterprise'
  settings: {
    language: 'zh' | 'en'
    notifications: boolean
  }
}

export interface UserQuota {
  total: number
  used: number
  resetAt: string
}

// 获取下个月1号的时间戳
function getNextMonthResetTime(): string {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth.toISOString()
}

// 配额配置
export const QUOTA_CONFIG = {
  guest: { lifetime: 2 },                // 游客：终身2张
  free: { signupBonus: 3, monthly: 0 },  // 免费用户：注册送3张，无月额度
  pro: { monthly: 50 },                  // Pro：每月50张（控制成本）
  enterprise: { monthly: 200 },          // 企业：每月200张
}

// 获取默认配额（根据用户等级）
export function getDefaultQuota(tier: 'free' | 'pro' | 'enterprise' = 'free'): UserQuota {
  const config = QUOTA_CONFIG[tier]
  
  // 免费用户：使用注册赠送额度（一次性）
  if (tier === 'free') {
    return {
      total: config.signupBonus || 0,
      used: 0,
      resetAt: '', // 一次性额度，不重置
    }
  }
  
  // 付费用户：月额度
  return {
    total: config.monthly,
    used: 0,
    resetAt: getNextMonthResetTime(),
  }
}

// 获取游客初始配额（终身2张，不重置）
export function getGuestQuota(): UserQuota {
  return {
    total: QUOTA_CONFIG.guest.lifetime,
    used: 0,
    resetAt: '', // 空字符串表示不重置
  }
}

// 获取默认用户资料
export function getDefaultUserProfile(user: {
  id: string
  email: string
  name: string
  picture: string
}): UserProfile {
  const now = new Date().toISOString()
  return {
    ...user,
    createdAt: now,
    lastLoginAt: now,
    tier: 'free',
    settings: {
      language: 'zh',
      notifications: true,
    },
  }
}

// 初始化或更新用户数据
export async function initUserData(
  kv: KVNamespace,
  user: { id: string; email: string; name: string; picture: string }
): Promise<{ profile: UserProfile; quota: UserQuota }> {
  const userKey = `user:${user.id}`
  const quotaKey = `quota:${user.id}`

  // 检查是否已存在用户资料
  const existingProfile = await kv.get(userKey)
  const now = new Date().toISOString()

  let profile: UserProfile
  let quota: UserQuota

  if (existingProfile) {
    // 更新现有用户的最后登录时间
    profile = JSON.parse(existingProfile)
    profile.lastLoginAt = now
    // 更新基本信息（可能已更改）
    profile.email = user.email
    profile.name = user.name
    profile.picture = user.picture
  } else {
    // 创建新用户
    profile = getDefaultUserProfile(user)
  }

  // 检查配额是否存在
  const existingQuota = await kv.get(quotaKey)
  if (existingQuota) {
    quota = JSON.parse(existingQuota)
    // 检查是否需要重置配额（新月）
    const resetDate = new Date(quota.resetAt)
    const now = new Date()
    if (now >= resetDate) {
      quota = getDefaultQuota(profile.tier)
    }
  } else {
    quota = getDefaultQuota(profile.tier)
  }

  // 保存到 KV
  await kv.put(userKey, JSON.stringify(profile))
  await kv.put(quotaKey, JSON.stringify(quota))

  return { profile, quota }
}

// 获取用户资料
export async function getUserProfile(
  kv: KVNamespace,
  userId: string
): Promise<UserProfile | null> {
  const data = await kv.get(`user:${userId}`)
  return data ? JSON.parse(data) : null
}

// 获取用户配额
export async function getUserQuota(
  kv: KVNamespace,
  userId: string
): Promise<UserQuota | null> {
  const data = await kv.get(`quota:${userId}`)
  return data ? JSON.parse(data) : null
}

// 更新用户资料
export async function updateUserProfile(
  kv: KVNamespace,
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt'>>
): Promise<UserProfile | null> {
  const profile = await getUserProfile(kv, userId)
  if (!profile) return null

  const updatedProfile = { ...profile, ...updates }
  await kv.put(`user:${userId}`, JSON.stringify(updatedProfile))
  return updatedProfile
}

// 增加配额使用量
export async function incrementQuotaUsage(
  kv: KVNamespace,
  userId: string
): Promise<UserQuota | null> {
  const quota = await getUserQuota(kv, userId)
  if (!quota) return null

  quota.used += 1
  await kv.put(`quota:${userId}`, JSON.stringify(quota))
  return quota
}

// 验证请求并获取用户ID
export async function authenticateRequest(
  request: Request,
  kv: KVNamespace
): Promise<{ userId: string; profile: UserProfile } | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const sessionData = await kv.get(`session:${token}`)
  if (!sessionData) {
    return null
  }

  const session = JSON.parse(sessionData)
  const profile = await getUserProfile(kv, session.id)
  if (!profile) {
    return null
  }

  return { userId: session.id, profile }
}
