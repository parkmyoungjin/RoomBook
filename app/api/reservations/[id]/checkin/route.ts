import { NextRequest, NextResponse } from 'next/server'
import { checkInBooking, getBookingById } from '@/lib/googleSheets'

// POST /api/reservations/[id]/checkin - 회의실 체크인
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { employeeId } = body
    
    console.log('=== 체크인 API 시작 ===')
    console.log('체크인 요청:', { id, employeeId })
    
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
          message: '체크인을 위해 사번을 입력해주세요.',
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
    console.log('예약 정보 조회 중...')
    const booking = await getBookingById(id)
    console.log('조회된 예약 정보:', {
      id: booking?.id, 
      isCheckedIn: booking?.isCheckedIn, 
      checkInTime: booking?.checkInTime,
      employeeId: booking?.employeeId
    })
    
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
      console.log('권한 없음:', { 
        입력사번: employeeId, 
        예약자사번: booking.employeeId, 
        관리자PIN: ADMIN_PIN 
      })
      return NextResponse.json(
        {
          success: false,
          error: '권한이 없습니다.',
          message: '예약자만 체크인할 수 있습니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      )
    }

    // 체크인 처리
    console.log('체크인 처리 시작...')
    const checkInResult = await checkInBooking(id)
    console.log('체크인 처리 완료:', checkInResult)

    // 업데이트된 예약 정보를 직접 구성 (캐싱 문제 해결)
    const currentTime = new Date().toISOString()
    const updatedBooking = {
      ...booking,
      isCheckedIn: true,
      checkInTime: currentTime,
      actualStartTime: currentTime,
      isNoShow: false,
      updatedAt: currentTime
    }

    console.log('=== 체크인 API 완료 ===')

    return NextResponse.json({
      success: true,
      message: '체크인이 완료되었습니다.',
      checkInTime: currentTime,
      timestamp: currentTime,
      booking: updatedBooking, // 캐싱 문제 없이 정확한 데이터 반환
      debug: {
        beforeCheckIn: {
          isCheckedIn: booking.isCheckedIn,
          checkInTime: booking.checkInTime
        },
        afterCheckIn: {
          isCheckedIn: true,
          checkInTime: currentTime
        }
      }
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