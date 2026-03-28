interface Env {
  REMOVE_BG_API_KEY: string
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
