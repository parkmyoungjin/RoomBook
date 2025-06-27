import { NextRequest, NextResponse } from 'next/server'
import { checkOutBooking } from '@/lib/googleSheets'

// POST /api/bookings/[id]/checkout - 회의실 체크아웃
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

    // 체크아웃 처리
    await checkOutBooking(id)

    return NextResponse.json({
      success: true,
      message: '체크아웃이 완료되었습니다.',
      checkOutTime: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('체크아웃 API 오류:', error)
    
    const errorMessage = error instanceof Error ? error.message : '체크아웃 처리 중 오류가 발생했습니다.'
    const statusCode = errorMessage.includes('찾을 수 없습니다') ? 404 :
                      errorMessage.includes('체크인되지 않은') || errorMessage.includes('이미 체크아웃') ? 400 : 500
    
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