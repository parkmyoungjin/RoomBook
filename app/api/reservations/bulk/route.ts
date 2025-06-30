import { NextRequest, NextResponse } from 'next/server'
import { 
  createBulkBookings, 
  cancelBulkBookings,
  updateBulkBookings,
  type BulkBookingRequest 
} from '@/lib/googleSheets'

// POST /api/reservations/bulk - 일괄 예약 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 필수 필드 검증
    const requiredFields = ['dates', 'roomId', 'title', 'bookerName', 'employeeId', 'startTime', 'endTime']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '필수 필드가 누락되었습니다.',
          missingFields,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 날짜 배열 검증
    if (!Array.isArray(body.dates) || body.dates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '최소 하나 이상의 날짜를 선택해야 합니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 시간 형식 검증
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(body.startTime) || !timeRegex.test(body.endTime)) {
      return NextResponse.json(
        {
          success: false,
          error: '올바른 시간 형식이 아닙니다. (HH:MM)',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // 일괄 예약 데이터 준비
    const bulkData: BulkBookingRequest = {
      dates: body.dates,
      roomId: body.roomId.trim(),
      title: body.title.trim(),
      bookerName: body.bookerName.trim(),
      employeeId: body.employeeId.trim(),
      startTime: body.startTime,
      endTime: body.endTime,
      purpose: body.purpose?.trim() || '',
      participants: parseInt(body.participants) || 1,
      template: body.template ? {
        name: body.template.name?.trim() || '',
        description: body.template.description?.trim() || ''
      } : undefined
    }

    // 일괄 예약 생성
    const result = await createBulkBookings(bulkData)

    return NextResponse.json({
      success: result.created.length > 0,
      message: result.created.length > 0 
        ? `${result.created.length}개의 예약이 성공적으로 생성되었습니다.`
        : '모든 예약 생성에 실패했습니다.',
      data: result,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('일괄 예약 생성 API 오류:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '일괄 예약을 생성할 수 없습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// DELETE /api/reservations/bulk - 일괄 예약 취소
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.bookingIds || !Array.isArray(body.bookingIds) || body.bookingIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '취소할 예약 ID 목록이 필요합니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const result = await cancelBulkBookings(body.bookingIds)

    return NextResponse.json({
      success: result.success > 0,
      message: `${result.success}개의 예약이 취소되었습니다.`,
      data: result,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('일괄 예약 취소 API 오류:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '일괄 예약을 취소할 수 없습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// PATCH /api/reservations/bulk - 일괄 예약 수정
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.bookingIds || !Array.isArray(body.bookingIds) || body.bookingIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '수정할 예약 ID 목록이 필요합니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    if (!body.updates || Object.keys(body.updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '수정할 내용이 필요합니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const result = await updateBulkBookings(body.bookingIds, body.updates)

    return NextResponse.json({
      success: result.success > 0,
      message: `${result.success}개의 예약이 수정되었습니다.`,
      data: result,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('일괄 예약 수정 API 오류:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '일괄 예약을 수정할 수 없습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
} 