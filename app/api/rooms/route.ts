import { NextRequest, NextResponse } from 'next/server'
import { getMeetingRooms, getTodayBookingsForRoom } from '@/lib/googleSheets'

// GET /api/rooms - 회의실 목록 조회
export async function GET(request: NextRequest) {
  try {
    // URL 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url)
    const includeBookings = searchParams.get('includeBookings') === 'true'

    // 회의실 목록 가져오기
    const rooms = await getMeetingRooms()

    // 활성화된 회의실만 필터링
    const activeRooms = rooms.filter(room => room.status === 'active')

    // 오늘 예약 정보 포함할지 결정
    if (includeBookings) {
      const roomsWithBookings = await Promise.all(
        activeRooms.map(async (room) => {
          try {
            const todayBookings = await getTodayBookingsForRoom(room.id)
            
            // 현재 시간 기준으로 상태 판단 (한국 시간 사용)
            const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)) // UTC+9 한국 시간
            const currentTime = now.toTimeString().slice(0, 5) // HH:MM 형식
            
            // 현재 사용중인 예약 찾기
            const currentBooking = todayBookings.find(booking => {
              return booking.startTime <= currentTime && booking.endTime > currentTime
            })
            
            // 다음 예약 찾기
            const nextBooking = todayBookings.find(booking => {
              return booking.startTime > currentTime
            })

            return {
              ...room,
              isAvailable: !currentBooking,
              currentBooking: currentBooking ? {
                id: currentBooking.id,
                title: currentBooking.title,
                bookerName: currentBooking.bookerName,
                startTime: currentBooking.startTime,
                endTime: currentBooking.endTime,
              } : null,
              nextBooking: nextBooking ? {
                id: nextBooking.id,
                title: nextBooking.title,
                bookerName: nextBooking.bookerName,
                startTime: nextBooking.startTime,
                endTime: nextBooking.endTime,
              } : null,
              todayBookingsCount: todayBookings.length,
            }
          } catch (error) {
            console.error(`회의실 ${room.id} 예약 정보 조회 실패:`, error)
            
            // 예약 정보 조회 실패 시 기본값 반환
            return {
              ...room,
              isAvailable: true,
              currentBooking: null,
              nextBooking: null,
              todayBookingsCount: 0,
            }
          }
        })
      )

      return NextResponse.json({
        success: true,
        data: roomsWithBookings,
        count: roomsWithBookings.length,
        timestamp: new Date().toISOString(),
      })
    }

    // 기본 회의실 목록만 반환
    return NextResponse.json({
      success: true,
      data: activeRooms,
      count: activeRooms.length,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('회의실 목록 조회 API 오류:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '회의실 목록을 조회할 수 없습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// POST /api/rooms - 새 회의실 추가 (관리자용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 요청 데이터 검증
    const { name, capacity, location, equipment } = body
    
    if (!name || !capacity || !location) {
      return NextResponse.json(
        {
          success: false,
          error: '필수 정보가 누락되었습니다.',
          message: '회의실 이름, 수용인원, 위치는 필수입니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 실제 구현에서는 Google Sheets에 새 회의실 추가
    // 현재는 임시로 성공 응답만 반환
    return NextResponse.json({
      success: true,
      message: '회의실이 성공적으로 추가되었습니다.',
      data: {
        id: `room_${Date.now()}`,
        name,
        capacity: parseInt(capacity),
        location,
        equipment: equipment || [],
        status: 'active',
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('회의실 추가 API 오류:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '회의실을 추가할 수 없습니다.',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 