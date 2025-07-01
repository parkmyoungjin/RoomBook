import { NextRequest, NextResponse } from 'next/server'
import { checkOutBooking, getBookingById } from '@/lib/googleSheets'

// POST /api/reservations/[id]/checkout - 회의실 체크아웃
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { employeeId, isAutoCheckout = false } = body
    
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

    // 사번 필수 검증
    if (!employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: '사번이 필요합니다.',
          message: '체크아웃을 위해 사번을 입력해주세요.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 사번 형식 검증 (7자리 숫자)
    const employeeIdRegex = /^\d{7}$/
    if (!employeeIdRegex.test(employeeId)) {
      return NextResponse.json(
        {
          success: false,
          error: '사번 형식이 올바르지 않습니다.',
          message: '사번은 7자리 숫자여야 합니다.',
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

    // 권한 확인: 예약자 사번 또는 관리자 PIN
    const ADMIN_PIN = process.env.ADMIN_PIN || '1234567'
    
    if (employeeId !== booking.employeeId && employeeId !== ADMIN_PIN) {
      return NextResponse.json(
        {
          success: false,
          error: '권한이 없습니다.',
          message: '예약자만 체크아웃할 수 있습니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      )
    }

    // 체크아웃 처리
    await checkOutBooking(id)

    // 업데이트된 예약 정보를 직접 구성 (캐싱 문제 해결)
    const currentTime = new Date().toISOString()
    const updatedBooking = {
      ...booking,
      checkOutTime: currentTime,
      actualEndTime: currentTime,
      updatedAt: currentTime
    }

    return NextResponse.json({
      success: true,
      message: '체크아웃이 완료되었습니다.',
      checkOutTime: currentTime,
      timestamp: currentTime,
      booking: updatedBooking, // 캐싱 문제 없이 정확한 데이터 반환
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