import { getTCMBRates } from '@/lib/currency';
import { NextResponse } from 'next/server';

export async function GET() {
  const data = await getTCMBRates();
  if (!data) {
    return NextResponse.json({ error: 'Döviz kurları alınamadı' }, { status: 500 });
  }
  return NextResponse.json(data);
}
