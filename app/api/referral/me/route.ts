import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        referralCode: true,
        referralRewardsCount: true,
        referrals: {
          select: {
            id: true,
            name: true,
            puzzlesSolvedTotal: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      referralCode: user.referralCode,
      referralRewardsCount: user.referralRewardsCount,
      referrals: user.referrals
    })

  } catch (error) {
    console.error('Error fetching referral info:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
