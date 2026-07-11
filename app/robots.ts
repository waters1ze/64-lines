import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://64-lines.vercel.app'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/invite/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
