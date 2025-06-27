import { NextRequest, NextResponse } from 'next/server'
import { 
  getBookings, 
  createBooking, 
  updateBookingStatus, 
  checkBookingConflict,
  getMeetingRooms,
  type BookingRequest 
} from '@/lib/googleSheets'

// GET /api/bookings - 예약 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD 형식
    const roomId = searchParams.get('roomId')
    const status = searchParams.get('status') as 'confirmed' | 'pending' | 'cancelled' | null

    // 예약 목록 가져오기
    let bookings = await getBookings(date || undefined)

    // 회의실별 필터링
    if (roomId) {
      bookings = bookings.filter(booking => booking.roomId === roomId)
    }

    // 상태별 필터링
    if (status) {
      bookings = bookings.filter(booking => booking.status === status)
    }

    // 시간순 정렬
    bookings.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })

    return NextResponse.json({
      success: true,
      data: bookings,
      count: bookings.length,
      filters: {
        date: date || null,
        roomId: roomId || null,
        status: status || null,
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('예약 목록 조회 API 오류:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '예약 목록을 조회할 수 없습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// POST /api/bookings - 새 예약 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 요청 데이터 검증
    const {
      roomId,
      title,
      bookerName,
      bookerEmail,
      startTime,
      endTime,
      date,
      purpose,
      participants
    } = body

    // 필수 필드 검증
    if (!roomId || !title || !bookerName || !bookerEmail || !startTime || !endTime || !date) {
      return NextResponse.json(
        {
          success: false,
          error: '필수 정보가 누락되었습니다.',
          message: '모든 예약 정보를 입력해주세요.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(bookerEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: '이메일 형식이 올바르지 않습니다.',
          message: '올바른 이메일 주소를 입력해주세요.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 시간 형식 검증 (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        {
          success: false,
          error: '시간 형식이 올바르지 않습니다.',
          message: 'HH:MM 형식으로 입력해주세요.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 종료 시간이 시작 시간보다 늦은지 검증
    if (startTime >= endTime) {
      return NextResponse.json(
        {
          success: false,
          error: '시간 설정이 올바르지 않습니다.',
          message: '종료 시간은 시작 시간보다 늦어야 합니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        {
          success: false,
          error: '날짜 형식이 올바르지 않습니다.',
          message: 'YYYY-MM-DD 형식으로 입력해주세요.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 과거 날짜 예약 방지
    const bookingDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (bookingDate < today) {
      return NextResponse.json(
        {
          success: false,
          error: '과거 날짜는 예약할 수 없습니다.',
          message: '오늘 이후의 날짜를 선택해주세요.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 회의실 존재 여부 확인
    const rooms = await getMeetingRooms()
    const room = rooms.find(r => r.id === roomId && r.status === 'active')
    
    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error: '존재하지 않는 회의실입니다.',
          message: '유효한 회의실을 선택해주세요.',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // 예약 시간 충돌 검사
    const hasConflict = await checkBookingConflict(roomId, date, startTime, endTime)
    
    if (hasConflict) {
      return NextResponse.json(
        {
          success: false,
          error: '선택한 시간에 이미 예약이 있습니다.',
          message: '다른 시간을 선택해주세요.',
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      )
    }

    // 예약 생성
    const bookingData: BookingRequest = {
      roomId,
      title: title.trim(),
      bookerName: bookerName.trim(),
      bookerEmail: bookerEmail.toLowerCase().trim(),
      startTime,
      endTime,
      date,
      purpose: purpose?.trim() || '',
      participants: parseInt(participants) || 1,
    }

    const newBooking = await createBooking(bookingData)

    return NextResponse.json({
      success: true,
      message: '예약이 성공적으로 생성되었습니다.',
      data: newBooking,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('예약 생성 API 오류:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '예약을 생성할 수 없습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// PATCH /api/bookings - 예약 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, status } = body

    // 필수 필드 검증
    if (!bookingId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: '필수 정보가 누락되었습니다.',
          message: '예약 ID와 상태를 입력해주세요.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 상태 값 검증
    const validStatuses = ['confirmed', 'pending', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: '올바르지 않은 상태값입니다.',
          message: '상태는 confirmed, pending, cancelled 중 하나여야 합니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 예약 상태 업데이트
    const success = await updateBookingStatus(bookingId, status)

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: '예약을 찾을 수 없습니다.',
          message: '존재하지 않는 예약입니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `예약 상태가 ${status}로 변경되었습니다.`,
      data: {
        bookingId,
        newStatus: status,
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('예약 상태 업데이트 API 오류:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '예약 상태를 업데이트할 수 없습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// OPTIONS - CORS 헤더 설정
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 