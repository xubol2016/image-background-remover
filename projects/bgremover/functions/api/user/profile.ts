import {
  authenticateRequest,
  getUserProfile,
  updateUserProfile,
  type UserProfile,
} from './_utils'

interface Env {
  BGREMOVER_KV: KVNamespace
}

// GET /api/user/profile - 获取用户资料
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
    if (!auth) {
      return Response.json({ error: '未登录或会话已过期' }, { status: 401 })
    }

    const profile = await getUserProfile(context.env.BGREMOVER_KV, auth.userId)
    if (!profile) {
      return Response.json({ error: '用户不存在' }, { status: 404 })
    }

    return Response.json({ profile })
  } catch (error) {
    console.error('Get profile error:', error)
    return Response.json({ error: '获取用户资料失败' }, { status: 500 })
  }
}

// PUT /api/user/profile - 更新用户资料
export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const auth = await authenticateRequest(context.request, context.env.BGREMOVER_KV)
    if (!auth) {
      return Response.json({ error: '未登录或会话已过期' }, { status: 401 })
    }

    const updates = (await context.request.json()) as Partial<
      Pick<UserProfile, 'name' | 'settings'>
    >

    // 只允许更新特定字段
    const allowedUpdates: Partial<UserProfile> = {}
    if (updates.name !== undefined) {
      allowedUpdates.name = updates.name
    }
    if (updates.settings !== undefined) {
      allowedUpdates.settings = {
        ...auth.profile.settings,
        ...updates.settings,
      }
    }

    const updatedProfile = await updateUserProfile(
      context.env.BGREMOVER_KV,
      auth.userId,
      allowedUpdates
    )

    if (!updatedProfile) {
      return Response.json({ error: '用户不存在' }, { status: 404 })
    }

    return Response.json({ profile: updatedProfile })
  } catch (error) {
    console.error('Update profile error:', error)
    return Response.json({ error: '更新用户资料失败' }, { status: 500 })
  }
}
