import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete messages older than 30 days where BOTH sender and receiver are non-premium
    const deleted = await db.message.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        },
        sender: {
          isPremium: false
        },
        receiver: {
          isPremium: false
        }
      }
    });

    return NextResponse.json({ success: true, deletedCount: deleted.count });
  } catch (error) {
    console.error('Cleanup messages error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
