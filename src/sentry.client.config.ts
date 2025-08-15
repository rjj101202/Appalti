import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
		replaysSessionSampleRate: Number(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE || 0),
		replaysOnErrorSampleRate: Number(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || 0),
		env: process.env.VERCEL_ENV || process.env.NODE_ENV,
	});
}