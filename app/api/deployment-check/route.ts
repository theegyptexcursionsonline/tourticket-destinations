import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    deployed: true,
    timestamp: new Date().toISOString(),
    buildTime: '2024-12-19T20:00:00Z', // Manually set to current time
    message: 'If you see this, the latest code is deployed',
  });
}
