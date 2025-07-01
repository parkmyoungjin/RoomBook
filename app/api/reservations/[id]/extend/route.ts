import { NextRequest, NextResponse } from 'next/server'
import { getBookingById, updateBooking, checkBookingConflict } from '@/lib/googleSheets'

// POST /api/reservations/[id]/extend - 예약 연장
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { employeeId, extendMinutes = 30 } = body
    
    console.log('=== 예약 연장 API 시작 ===')
    console.log('연장 요청:', { id, employeeId, extendMinutes })
    
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
          message: '연장을 위해 사번을 입력해주세요.',
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

    // 연장 시간 검증 (30분 또는 60분)
    if (extendMinutes !== 30 && extendMinutes !== 60) {
      return NextResponse.json(
        {
          success: false,
          error: '연장 시간이 올바르지 않습니다.',
          message: '30분 또는 60분 단위로만 연장 가능합니다.',
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
      checkOutTime: booking?.checkOutTime,
      employeeId: booking?.employeeId,
      endTime: booking?.endTime
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
          message: '예약자만 연장할 수 있습니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      )
    }

    // 체크인 상태 확인
    if (!booking.isCheckedIn) {
      return NextResponse.json(
        {
          success: false,
          error: '체크인되지 않은 예약입니다.',
          message: '체크인 후에만 연장이 가능합니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 이미 체크아웃된 경우
    if (booking.checkOutTime) {
      return NextResponse.json(
        {
          success: false,
          error: '이미 체크아웃된 예약입니다.',
          message: '체크아웃된 예약은 연장할 수 없습니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 새로운 종료 시간 계산
    const currentEndTime = new Date(`${booking.date}T${booking.endTime}`)
    const newEndTime = new Date(currentEndTime.getTime() + extendMinutes * 60 * 1000)
    const newEndTimeString = newEndTime.toTimeString().substring(0, 5) // HH:MM 형식

    console.log('연장 시간 계산:', {
      현재종료시간: booking.endTime,
      연장분: extendMinutes,
      새종료시간: newEndTimeString
    })

    // 연장 시간에 다른 예약과 충돌이 있는지 확인
    const hasConflict = await checkBookingConflict(
      booking.roomId,
      booking.date,
      booking.endTime, // 현재 종료 시간부터
      newEndTimeString, // 새 종료 시간까지
      booking.id // 현재 예약은 제외
    )

    if (hasConflict) {
      return NextResponse.json(
        {
          success: false,
          error: '연장하려는 시간에 다른 예약이 있습니다.',
          message: '다른 예약과 시간이 겹쳐서 연장할 수 없습니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      )
    }

    // 예약 연장 처리
    console.log('예약 연장 처리 시작...')
    const extendResult = await updateBooking(id, {
      endTime: newEndTimeString
    })
    console.log('예약 연장 처리 완료:', extendResult)

    // 업데이트된 예약 정보를 직접 구성
    const currentTime = new Date().toISOString()
    const updatedBooking = {
      ...booking,
      endTime: newEndTimeString,
      updatedAt: currentTime
    }

    console.log('=== 예약 연장 API 완료 ===')

    return NextResponse.json({
      success: true,
      message: `${extendMinutes}분 연장이 완료되었습니다.`,
      newEndTime: newEndTimeString,
      extendMinutes: extendMinutes,
      timestamp: currentTime,
      booking: updatedBooking,
    })

  } catch (error) {
    console.error('예약 연장 API 오류:', error)
    
    const errorMessage = error instanceof Error ? error.message : '예약 연장 처리 중 오류가 발생했습니다.'
    const statusCode = errorMessage.includes('찾을 수 없습니다') ? 404 :
                      errorMessage.includes('다른 예약이 있습니다') ? 409 : 500
    
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