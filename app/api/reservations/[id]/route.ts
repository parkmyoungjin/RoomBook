import { NextRequest, NextResponse } from 'next/server'
import { getBookingById } from '@/lib/googleSheets'

// GET /api/reservations/[id] - 개별 예약 조회
export async function GET(
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

    // 해당 예약 정보 가져오기
    const booking = await getBookingById(id)
    
    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: '예약을 찾을 수 없습니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      booking: booking,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('예약 조회 API 오류:', error)
    
    const errorMessage = error instanceof Error ? error.message : '예약 조회 중 오류가 발생했습니다.'
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
} 