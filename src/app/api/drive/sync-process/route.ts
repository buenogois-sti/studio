'use server';

import { NextResponse } from 'next/server';
import { syncProcessToDrive } from '@/lib/drive';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const processId = body?.processId as string | undefined;

    if (!processId) {
      return NextResponse.json({ success: false, error: 'processId obrigatório.' }, { status: 400 });
    }

    await syncProcessToDrive(processId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro ao sincronizar processo.' },
      { status: 500 }
    );
  }
}