import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ? '✓ set' : '✗ missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✓ set' : '✗ missing',
      AUTH_URL: process.env.AUTH_URL ?? '✗ missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? '✗ missing',
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? '✗ missing',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `✓ set (${process.env.GOOGLE_CLIENT_ID.slice(0, 10)}...)` : '✗ missing',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✓ set' : '✗ missing',
      DATABASE_URL: process.env.DATABASE_URL ? '✓ set' : '✗ missing',
      NODE_ENV: process.env.NODE_ENV,
      SKIP_AUTH: process.env.SKIP_AUTH ?? 'not set',
    },
  });
}
