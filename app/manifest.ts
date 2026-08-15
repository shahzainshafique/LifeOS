import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LifeOS',
    short_name: 'LifeOS',
    description: 'Your personal reasoning system',
    start_url: '/now',
    display: 'standalone',
    background_color: '#0b0b0c',
    theme_color: '#0b0b0c',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
