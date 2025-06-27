import { NextRequest, NextResponse } from 'next/server'
import { checkInBooking } from '@/lib/googleSheets'

// POST /api/bookings/[id]/checkin - 회의실 체크인
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '예약 ID가 필요합니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 체크인 처리
    await checkInBooking(id)

    return NextResponse.json({
      success: true,
      message: '체크인이 완료되었습니다.',
      checkInTime: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('체크인 API 오류:', error)
    
    const errorMessage = error instanceof Error ? error.message : '체크인 처리 중 오류가 발생했습니다.'
    const statusCode = errorMessage.includes('찾을 수 없습니다') ? 404 :
                      errorMessage.includes('15분 전부터') || errorMessage.includes('이미 체크인') ? 400 : 500
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    )
  }
} 