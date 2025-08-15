import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

let ratelimit: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
	const url = process.env.UPSTASH_REDIS_REST_URL;
	const token = process.env.UPSTASH_REDIS_REST_TOKEN;
	if (!url || !token) return null;
	if (!ratelimit) {
		const redis = new Redis({ url, token });
		ratelimit = new Ratelimit({
			redis,
			limiter: Ratelimit.fixedWindow(50, '1 m'), // 50 req/min per key
			prefix: 'rl'
		});
	}
	return ratelimit;
}

export async function checkRateLimit(req: NextRequest, keySuffix: string): Promise<{ allow: boolean; limit?: number; remaining?: number; reset?: number }>{
	const limiter = getLimiter();
	if (!limiter) return { allow: true };
	const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
	const key = `${keySuffix}:${ip}`;
	const result = await limiter.limit(key);
	return { allow: result.success, limit: result.limit, remaining: result.remaining, reset: result.reset };
}