import { useEffect } from 'react'

/**
 * Injects security-related meta tags into the document head.
 * Helps mitigate XSS, clickjacking, and MIME-type sniffing.
 */
export function SecurityHeaders() {
  useEffect(() => {
    const meta: Array<{ name: string; content: string }> = [
      { name: 'referrer-policy', content: 'strict-origin-when-cross-origin' },
      { name: 'x-content-type-options', content: 'nosniff' },
      { name: 'x-frame-options', content: 'DENY' },
      { name: 'x-xss-protection', content: '1; mode=block' },
    ]

    const elements = meta.map(({ name, content }) => {
      const el = document.createElement('meta')
      el.name = name
      el.content = content
      document.head.appendChild(el)
      return el
    })

    // Content-Security-Policy via meta tag
    const csp = document.createElement('meta')
    csp.httpEquiv = 'Content-Security-Policy'
    csp.content =
      "default-src 'self'; " +
      "script-src 'self' https://unpkg.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' http://localhost:8000 https://sandbox.sslcommerz.com https://securepay.sslcommerz.com; " +
      "frame-ancestors 'none';"
    document.head.appendChild(csp)
    elements.push(csp)

    return () => {
      elements.forEach(el => el.remove())
    }
  }, [])

  return null
}