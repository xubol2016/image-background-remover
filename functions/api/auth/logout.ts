interface Env {
  BGREMOVER_KV: KVNamespace
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      await context.env.BGREMOVER_KV.delete(`session:${token}`)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return Response.json({ error: '登出失败' }, { status: 500 })
  }
}
