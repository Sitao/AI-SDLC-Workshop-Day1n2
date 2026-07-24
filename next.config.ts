import type { NextConfig } from 'next'

const isDevelopment = process.env.NODE_ENV !== 'production'

const scriptSource = isDevelopment ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'"
const connectSource = isDevelopment ? "'self' ws: wss:" : "'self'"

const securityHeaders = [
	{
		key: 'Content-Security-Policy',
		value: `default-src 'self'; script-src ${scriptSource}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ${connectSource}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
	},
	{
		key: 'Permissions-Policy',
		value: 'camera=(), microphone=(), geolocation=()',
	},
	{
		key: 'X-Frame-Options',
		value: 'DENY',
	},
	{
		key: 'X-Content-Type-Options',
		value: 'nosniff',
	},
	{
		key: 'Referrer-Policy',
		value: 'strict-origin-when-cross-origin',
	},
	{
		key: 'Strict-Transport-Security',
		value: 'max-age=63072000; includeSubDomains; preload',
	},
]

const nextConfig: NextConfig = {
	allowedDevOrigins: ['127.0.0.1', 'localhost'],

	async headers() {
		return [
			{
				source: '/:path*',
				headers: securityHeaders,
			},
		]
	},
}

export default nextConfig
