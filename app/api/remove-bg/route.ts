import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json(
        { error: '请上传图片' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: '仅支持 JPG 和 PNG 格式' },
        { status: 400 }
      )
    }

    // 验证文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (image.size > maxSize) {
      return NextResponse.json(
        { error: '图片大小不能超过 10MB' },
        { status: 400 }
      )
    }

    // 获取 API Key
    const apiKey = process.env.REMOVE_BG_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: '服务器配置错误，请联系管理员' },
        { status: 500 }
      )
    }

    // 调用 Remove.bg API
    const removeBgFormData = new FormData()
    removeBgFormData.append('image_file', image)
    removeBgFormData.append('size', 'auto')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: removeBgFormData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Remove.bg API error:', errorData)
      
      // 处理特定的错误类型
      if (response.status === 402) {
        return NextResponse.json(
          { error: 'API 额度已用完，请联系管理员' },
          { status: 429 }
        )
      }
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: '请求过于频繁，请稍后再试' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: '背景移除服务暂时不可用，请稍后再试' },
        { status: 502 }
      )
    }

    // 获取处理后的图片
    const processedImageBuffer = await response.arrayBuffer()

    return new NextResponse(processedImageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json(
      { error: '处理失败，请重试' },
      { status: 500 }
    )
  }
}

// 配置路由段配置
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
