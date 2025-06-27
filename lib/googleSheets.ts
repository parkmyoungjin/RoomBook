import { google } from 'googleapis'

// 한국 시간대 유틸리티 함수
const getKoreanTime = (): Date => {
  const now = new Date()
  // UTC에서 한국 시간(UTC+9)로 변환
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  return koreanTime
}

const formatKoreanDateTime = (): string => {
  const koreanTime = getKoreanTime()
  return koreanTime.toISOString()
}

// 환경변수 검증
const validateEnvironmentVariables = () => {
  const requiredVars = [
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_SHEETS_SPREADSHEET_ID'
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(`환경변수가 누락되었습니다: ${missingVars.join(', ')}`)
  }
}

// Google Sheets API 인증 설정
const getAuthClient = () => {
  validateEnvironmentVariables()
  
  const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }

  return new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  )
}

// Google Sheets 클라이언트 생성
const getSheetsClient = async () => {
  const authClient = getAuthClient()
  await authClient.authorize()
  
  return google.sheets({
    version: 'v4',
    auth: authClient,
  })
}

// 타입 정의
export interface MeetingRoom {
  id: string
  name: string
  capacity: number
  location: string
  equipment: string[]
  status: 'active' | 'inactive'
}

export interface Booking {
  id: string
  roomId: string
  roomName?: string
  title: string
  bookerName: string
  bookerEmail: string
  startTime: string
  endTime: string
  date: string
  status: 'confirmed' | 'pending' | 'cancelled'
  purpose: string
  participants: number
  createdAt: string
  updatedAt: string
  checkInTime?: string
  checkOutTime?: string
  actualStartTime?: string
  actualEndTime?: string
  isCheckedIn: boolean
  isNoShow: boolean
  autoReleaseTime?: string
}

export interface BookingRequest {
  roomId: string
  title: string
  bookerName: string
  bookerEmail: string
  startTime: string
  endTime: string
  date: string
  purpose: string
  participants: number
}

// 회의실 목록 가져오기
export const getMeetingRooms = async (): Promise<MeetingRoom[]> => {
  try {
    const sheets = await getSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.')
    }
    
    const sheetName = process.env.GOOGLE_SHEETS_ROOMS_SHEET_NAME || 'rooms'
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:G1000`, // 헤더 제외하고 데이터만
    })

    const rows = response.data.values || []
    
    return rows
      .filter(row => row && row.length > 0 && row[0]) // 빈 행 필터링
      .map((row) => ({
        id: row[0] || '',
        name: row[1] || '',
        capacity: isNaN(parseInt(row[2], 10)) ? 0 : parseInt(row[2], 10),
        location: row[3] || '',
        equipment: row[4] ? row[4].split(',').map((item: string) => item.trim()).filter(Boolean) : [],
        status: row[5] === 'active' ? 'active' : 'inactive',
      }))
  } catch (error) {
    console.error('회의실 목록 가져오기 실패:', error)
    throw new Error('회의실 목록을 가져올 수 없습니다.')
  }
}

// 예약 목록 가져오기
export const getBookings = async (date?: string): Promise<Booking[]> => {
  try {
    const sheets = await getSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.')
    }
    
    const sheetName = process.env.GOOGLE_SHEETS_BOOKINGS_SHEET_NAME || 'bookings'
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:U1000`, // 헤더 제외하고 데이터만, U까지 확장 (체크인/체크아웃 필드 포함)
    })

    const rows = response.data.values || []
    let bookings = rows
      .filter(row => row && row.length > 0 && row[0]) // 빈 행 필터링
      .map((row) => ({
        id: row[0] || '',
        roomId: row[1] || '',
        roomName: row[2] || '',
        title: row[3] || '',
        bookerName: row[4] || '',
        bookerEmail: row[5] || '',
        startTime: row[6] || '',
        endTime: row[7] || '',
        date: row[8] || '',
        status: (row[9] as 'confirmed' | 'pending' | 'cancelled') || 'pending',
        purpose: row[10] || '',
        participants: isNaN(parseInt(row[11], 10)) ? 1 : parseInt(row[11], 10),
        createdAt: row[12] || '',
        updatedAt: row[13] || '',
        checkInTime: row[14] || '',
        checkOutTime: row[15] || '',
        actualStartTime: row[16] || '',
        actualEndTime: row[17] || '',
        isCheckedIn: row[18] === 'true',
        isNoShow: row[19] === 'true',
        autoReleaseTime: row[20] || '',
      }))

    // 날짜 필터링
    if (date) {
      bookings = bookings.filter(booking => booking.date === date)
    }

    return bookings
  } catch (error) {
    console.error('예약 목록 가져오기 실패:', error)
    throw new Error('예약 목록을 가져올 수 없습니다.')
  }
}

// 새 예약 추가
export const createBooking = async (bookingData: BookingRequest): Promise<Booking> => {
  try {
    const sheets = await getSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.')
    }
    
    const sheetName = process.env.GOOGLE_SHEETS_BOOKINGS_SHEET_NAME || 'bookings'
    
    // 새 예약 ID 생성
    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const now = formatKoreanDateTime() // 한국 시간 사용
    
    // 회의실 이름 가져오기
    const rooms = await getMeetingRooms()
    const room = rooms.find(r => r.id === bookingData.roomId)
    const roomName = room?.name || ''

    const newBooking: Booking = {
      id: bookingId,
      roomId: bookingData.roomId,
      roomName,
      title: bookingData.title,
      bookerName: bookingData.bookerName,
      bookerEmail: bookingData.bookerEmail,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      date: bookingData.date,
      status: 'confirmed',
      purpose: bookingData.purpose,
      participants: bookingData.participants,
      createdAt: now,
      updatedAt: now,
      checkInTime: '',
      checkOutTime: '',
      actualStartTime: '',
      actualEndTime: '',
      isCheckedIn: false,
      isNoShow: false,
      autoReleaseTime: '',
    }

    // 스프레드시트에 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:U`, // U까지 확장 (체크인/체크아웃 필드 포함)
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          newBooking.id,
          newBooking.roomId,
          newBooking.roomName,
          newBooking.title,
          newBooking.bookerName,
          newBooking.bookerEmail,
          newBooking.startTime,
          newBooking.endTime,
          newBooking.date,
          newBooking.status,
          newBooking.purpose,
          newBooking.participants,
          newBooking.createdAt,
          newBooking.updatedAt,
          newBooking.checkInTime,
          newBooking.checkOutTime,
          newBooking.actualStartTime,
          newBooking.actualEndTime,
          newBooking.isCheckedIn,
          newBooking.isNoShow,
          newBooking.autoReleaseTime,
        ]],
      },
    })

    return newBooking
  } catch (error) {
    console.error('예약 생성 실패:', error)
    throw new Error('예약을 생성할 수 없습니다.')
  }
}

// 예약 상태 업데이트
export const updateBookingStatus = async (
  bookingId: string, 
  status: 'confirmed' | 'pending' | 'cancelled'
): Promise<boolean> => {
  try {
    const sheets = await getSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.')
    }
    
    const sheetName = process.env.GOOGLE_SHEETS_BOOKINGS_SHEET_NAME || 'bookings'
    
    // 예약 찾기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:U`, // U까지 확장 (체크인/체크아웃 필드 포함)
    })

    const rows = response.data.values || []
    const rowIndex = rows.findIndex(row => row[0] === bookingId)
    
    if (rowIndex === -1) {
      throw new Error('예약을 찾을 수 없습니다.')
    }

    // 상태와 업데이트 시간만 변경
    const updatedAt = formatKoreanDateTime() // 한국 시간 사용
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!J${rowIndex + 1}`, // 상태 컬럼 (J)
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status]],
      },
    })

    // 업데이트 시간 변경
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!N${rowIndex + 1}`, // 업데이트 시간 컬럼 (N)
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[updatedAt]],
      },
    })

    return true
  } catch (error) {
    console.error('예약 상태 업데이트 실패:', error)
    throw new Error('예약 상태를 업데이트할 수 없습니다.')
  }
}

// 예약 시간 충돌 검사
export const checkBookingConflict = async (
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<boolean> => {
  try {
    const bookings = await getBookings(date)
    
    const conflictingBookings = bookings.filter(booking => {
      if (booking.roomId !== roomId) return false
      if (booking.status === 'cancelled') return false
      if (excludeBookingId && booking.id === excludeBookingId) return false
      
      const bookingStart = new Date(`${date}T${booking.startTime}`)
      const bookingEnd = new Date(`${date}T${booking.endTime}`)
      const requestStart = new Date(`${date}T${startTime}`)
      const requestEnd = new Date(`${date}T${endTime}`)
      
      // 시간 겹침 검사
      return requestStart < bookingEnd && requestEnd > bookingStart
    })

    return conflictingBookings.length > 0
  } catch (error) {
    console.error('예약 충돌 검사 실패:', error)
    return true // 에러 시 안전하게 충돌로 판단
  }
}

// 특정 회의실의 오늘 예약 현황 가져오기
export const getTodayBookingsForRoom = async (roomId: string): Promise<Booking[]> => {
  const today = getKoreanTime().toISOString().split('T')[0] // 한국 시간 기준 YYYY-MM-DD 형식
  const allBookings = await getBookings(today)
  
  return allBookings.filter(booking => 
    booking.roomId === roomId && 
    booking.status !== 'cancelled'
  ).sort((a, b) => a.startTime.localeCompare(b.startTime))
}

// 특정 예약 ID로 예약 정보 가져오기
export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
  try {
    const sheets = await getSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.')
    }
    
    const sheetName = process.env.GOOGLE_SHEETS_BOOKINGS_SHEET_NAME || 'bookings'
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:U1000`,
    })

    const rows = response.data.values || []
    const row = rows.find(r => r[0] === bookingId)
    
    if (!row) {
      return null
    }

    return {
      id: row[0] || '',
      roomId: row[1] || '',
      roomName: row[2] || '',
      title: row[3] || '',
      bookerName: row[4] || '',
      bookerEmail: row[5] || '',
      startTime: row[6] || '',
      endTime: row[7] || '',
      date: row[8] || '',
      status: (row[9] as 'confirmed' | 'pending' | 'cancelled') || 'pending',
      purpose: row[10] || '',
      participants: isNaN(parseInt(row[11], 10)) ? 1 : parseInt(row[11], 10),
      createdAt: row[12] || '',
      updatedAt: row[13] || '',
      checkInTime: row[14] || '',
      checkOutTime: row[15] || '',
      actualStartTime: row[16] || '',
      actualEndTime: row[17] || '',
      isCheckedIn: row[18] === 'true',
      isNoShow: row[19] === 'true',
      autoReleaseTime: row[20] || '',
    }
  } catch (error) {
    console.error('예약 조회 실패:', error)
    return null
  }
}

// 예약 정보 업데이트 (체크인/체크아웃용)
export const updateBooking = async (
  bookingId: string, 
  updates: Partial<Booking>
): Promise<boolean> => {
  try {
    const sheets = await getSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID 환경변수가 설정되지 않았습니다.')
    }
    
    const sheetName = process.env.GOOGLE_SHEETS_BOOKINGS_SHEET_NAME || 'bookings'
    
    // 전체 예약 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:U1000`,
    })

    const rows = response.data.values || []
    const rowIndex = rows.findIndex(row => row[0] === bookingId)
    
    if (rowIndex === -1) {
      throw new Error('예약을 찾을 수 없습니다.')
    }

    // 현재 데이터 가져오기
    const currentRow = rows[rowIndex]
    const updatedAt = formatKoreanDateTime() // 한국 시간 사용

    // 업데이트할 데이터 준비
    const updatedRow = [
      currentRow[0], // id
      currentRow[1], // roomId
      currentRow[2], // roomName
      currentRow[3], // title
      currentRow[4], // bookerName
      currentRow[5], // bookerEmail
      currentRow[6], // startTime
      currentRow[7], // endTime
      currentRow[8], // date
      updates.status || currentRow[9], // status
      currentRow[10], // purpose
      currentRow[11], // participants
      currentRow[12], // createdAt
      updatedAt, // updatedAt
      updates.checkInTime !== undefined ? updates.checkInTime : currentRow[14], // checkInTime
      updates.checkOutTime !== undefined ? updates.checkOutTime : currentRow[15], // checkOutTime
      updates.actualStartTime !== undefined ? updates.actualStartTime : currentRow[16], // actualStartTime
      updates.actualEndTime !== undefined ? updates.actualEndTime : currentRow[17], // actualEndTime
      updates.isCheckedIn !== undefined ? updates.isCheckedIn.toString() : currentRow[18], // isCheckedIn
      updates.isNoShow !== undefined ? updates.isNoShow.toString() : currentRow[19], // isNoShow
      updates.autoReleaseTime !== undefined ? updates.autoReleaseTime : currentRow[20], // autoReleaseTime
    ]

    // 스프레드시트 업데이트
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex + 2}:U${rowIndex + 2}`, // +2는 헤더 때문
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
    })

    return true
  } catch (error) {
    console.error('예약 업데이트 실패:', error)
    throw new Error('예약 정보를 업데이트할 수 없습니다.')
  }
}

// 체크인 처리
export const checkInBooking = async (bookingId: string): Promise<boolean> => {
  const now = getKoreanTime() // 한국 시간 사용
  
  const booking = await getBookingById(bookingId)
  if (!booking) {
    throw new Error('예약을 찾을 수 없습니다.')
  }
  
  // 체크인 시간 검증 (예약 시간 15분 전부터 가능)
  const bookingStart = new Date(`${booking.date} ${booking.startTime}`)
  const checkInAllowedTime = new Date(bookingStart.getTime() - 15 * 60 * 1000)
  
  if (now < checkInAllowedTime) {
    throw new Error('체크인은 예약 시간 15분 전부터 가능합니다.')
  }
  
  // 이미 체크인된 경우
  if (booking.isCheckedIn) {
    throw new Error('이미 체크인된 예약입니다.')
  }
  
  // 체크인 처리
  return await updateBooking(bookingId, {
    isCheckedIn: true,
    checkInTime: formatKoreanDateTime(), // 한국 시간 사용
    actualStartTime: formatKoreanDateTime(), // 한국 시간 사용
    isNoShow: false,
  })
}

// 체크아웃 처리
export const checkOutBooking = async (bookingId: string): Promise<boolean> => {
  const now = getKoreanTime() // 한국 시간 사용
  
  const booking = await getBookingById(bookingId)
  if (!booking) {
    throw new Error('예약을 찾을 수 없습니다.')
  }
  
  // 체크인되지 않은 경우
  if (!booking.isCheckedIn) {
    throw new Error('체크인되지 않은 예약입니다.')
  }
  
  // 이미 체크아웃된 경우
  if (booking.checkOutTime) {
    throw new Error('이미 체크아웃된 예약입니다.')
  }
  
  // 체크아웃 처리
  return await updateBooking(bookingId, {
    checkOutTime: formatKoreanDateTime(), // 한국 시간 사용
    actualEndTime: formatKoreanDateTime(), // 한국 시간 사용
  })
}

// 노쇼 처리 (15분 후 자동 처리용)
export const markAsNoShow = async (bookingId: string): Promise<boolean> => {
  return await updateBooking(bookingId, {
    isNoShow: true,
    status: 'cancelled',
  })
} 