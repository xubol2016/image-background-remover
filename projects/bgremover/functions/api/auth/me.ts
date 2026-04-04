interface Env {
  BGREMOVER_KV: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: '未登录' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const sessionData = await context.env.BGREMOVER_KV.get(`session:${token}`)
    
    if (!sessionData) {
      return Response.json({ error: '会话已过期' }, { status: 401 })
    }

    const user = JSON.parse(sessionData)
    return Response.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return Response.json({ error: '获取用户信息失败' }, { status: 500 })
  }
}
