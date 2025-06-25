import { NextRequest, NextResponse } from 'next/server';
import { executeExternalCall } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { network, calls, address, hashedPk } = body;

    if (!network || !calls || !address || !hashedPk) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await executeExternalCall({ network, calls, address, hashedPk });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
} 