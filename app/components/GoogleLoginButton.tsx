'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              width?: number
            }
          ) => void
        }
      }
    }
  }
}

export default function GoogleLoginButton() {
  const buttonRef = useRef<HTMLDivElement>(null)
  const { login, user, isLoading } = useAuth()

  useEffect(() => {
    // 加载 Google Identity Services 脚本
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      if (window.google && buttonRef.current) {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        
        if (!clientId) {
          console.error('Google Client ID not configured')
          return
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 200,
        })
      }
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleCredentialResponse = async (response: { credential: string }) => {
    try {
      await login(response.credential)
    } catch (error) {
      console.error('Login failed:', error)
      alert('登录失败，请重试')
    }
  }

  if (isLoading) {
    return <div className="w-[200px] h-[40px] bg-slate-200 rounded-full animate-pulse" />
  }

  if (user) {
    return null // 已登录时不显示按钮
  }

  return <div ref={buttonRef} />
}
