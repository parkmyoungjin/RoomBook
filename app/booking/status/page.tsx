'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'

interface Room {
  id: string
  name: string
  capacity: number
  location: string
  equipment: string
}

interface Booking {
  id: string
  roomId: string
  date: string
  startTime: string
  endTime: string
  title: string
  bookerName: string
  status: 'confirmed' | 'pending' | 'cancelled'
}

export default function BookingStatusPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)

  // 시간 슬롯 생성 (1시간 단위)
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 18; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      slots.push(time)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // 달력 생성
  const generateCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const calendar = []
    const current = new Date(startDate)
    
    for (let week = 0; week < 6; week++) {
      const week_days = []
      for (let day = 0; day < 7; day++) {
        week_days.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      calendar.push(week_days)
      
      if (current > lastDay && week_days[6].getMonth() !== month) break
    }
    
    return calendar
  }

  // 날짜 포맷팅 함수 수정 (시간대 문제 해결)
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 오늘 날짜 계산 (사용자 로컬 시간)
  const getTodayString = () => {
    const now = new Date() // 사용자 로컬 시간 사용
    return formatDate(now)
  }

  const today = getTodayString()

  // 회의실 목록 가져오기
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/rooms')
        const data = await response.json()
        
        if (data.success) {
          setRooms(data.data)
          if (data.data.length > 0) {
            setSelectedRoom(data.data[0].id)
          }
        }
      } catch (error) {
        console.error('회의실 목록 로딩 실패:', error)
      }
    }

    fetchRooms()
  }, [])

  // 선택된 날짜의 예약 정보 가져오기
  useEffect(() => {
    if (selectedRoom && selectedDate) {
      fetchBookings()
    }
  }, [selectedRoom, selectedDate])

  const fetchBookings = async () => {
    if (!selectedRoom || !selectedDate) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/reservations?roomId=${selectedRoom}&date=${selectedDate}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // cancelled 상태인 예약들을 제외하고 active한 예약들만 사용
        const activeBookings = (data.data || []).filter((booking: Booking) => 
          booking.status !== 'cancelled'
        )
        setBookings(activeBookings)
      } else {
        console.error('API 응답 오류:', data.error || data.message)
        setBookings([])
      }
    } catch (error) {
      console.error('예약 정보 로딩 실패:', error)
      // Production 환경에서 네트워크 오류 시 빈 배열로 설정하여 UI 깨짐 방지
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  // 시간대별 예약 상태 확인 (30분 단위로 세분화) - cancelled 예약 제외
  const getTimeSlotStatus = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    const firstHalf = `${hour.toString().padStart(2, '0')}:00`
    const secondHalf = `${hour.toString().padStart(2, '0')}:30`
    
    // active한 예약들만 고려 (cancelled 제외 - 이중 보안)
    const activeBookings = bookings.filter(booking => booking.status !== 'cancelled')
    
    const firstHalfBooked = activeBookings.some(booking => 
      firstHalf >= booking.startTime && firstHalf < booking.endTime
    )
    const secondHalfBooked = activeBookings.some(booking => 
      secondHalf >= booking.startTime && secondHalf < booking.endTime
    )
    
    if (firstHalfBooked && secondHalfBooked) {
      return { status: 'full', available: [] }
    } else if (firstHalfBooked) {
      return { status: 'partial', available: [secondHalf] }
    } else if (secondHalfBooked) {
      return { status: 'partial', available: [firstHalf] }
    } else {
      return { status: 'available', available: [firstHalf, secondHalf] }
    }
  }

  // 시간 클릭 핸들러 (부분 예약 고려)
  const handleTimeSlotClick = (time: string, slotStatus: any) => {
    if (slotStatus.status === 'full') return
    
    // 사용 가능한 시간이 하나만 있으면 그 시간으로 바로 이동
    if (slotStatus.status === 'partial' && slotStatus.available.length === 1) {
      const params = new URLSearchParams({
        roomId: selectedRoom,
        date: selectedDate,
        startTime: slotStatus.available[0]
      })
      router.push(`/booking/new?${params.toString()}`)
    } else {
      // 완전히 사용 가능하면 00분으로 기본 이동
      const params = new URLSearchParams({
        roomId: selectedRoom,
        date: selectedDate,
        startTime: time
      })
      router.push(`/booking/new?${params.toString()}`)
    }
  }

  const calendar = generateCalendar()
  
  const isToday = (date: Date) => {
    return formatDate(date) === today
  }

  const isPastDate = (date: Date) => {
    return formatDate(date) < today
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">예약 하기</h1>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* 회의실 선택 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">회의실 선택</h3>
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedRoom === room.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{room.name}</div>
                <div className="text-sm text-gray-500">{room.capacity}명 • {room.equipment}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 달력 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold">
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h3>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div key={day} className={`text-center text-sm font-medium py-2 ${
                index === 0 ? 'text-red-500' : // 일요일 빨간색
                index === 6 ? 'text-blue-500' : // 토요일 파란색
                'text-gray-500'
              }`}>
                {day}
              </div>
            ))}
          </div>

          {/* 달력 날짜 */}
          <div className="space-y-1">
            {calendar.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((date, dayIndex) => {
                  const dateString = formatDate(date)
                  const isSelected = selectedDate === dateString
                  const isCurrentDay = isToday(date)
                  const isPast = isPastDate(date)
                  const isThisMonth = isCurrentMonth(date)

                  return (
                    <button
                      key={`${weekIndex}-${dayIndex}`}
                      onClick={() => !isPast && setSelectedDate(dateString)}
                      disabled={isPast}
                      className={`
                        aspect-square flex items-center justify-center text-sm rounded-lg transition-colors
                        ${isSelected ? 'bg-blue-500 text-white' : ''}
                        ${isCurrentDay && !isSelected ? 'bg-blue-100 text-blue-600' : ''}
                        ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}
                        ${!isThisMonth ? 'text-gray-300' : ''}
                        ${!isPast && !isSelected && !isCurrentDay && isThisMonth && dayIndex === 0 ? 'text-red-500' : ''}
                        ${!isPast && !isSelected && !isCurrentDay && isThisMonth && dayIndex === 6 ? 'text-blue-500' : ''}
                        ${!isPast && !isSelected && !isCurrentDay && isThisMonth && dayIndex !== 0 && dayIndex !== 6 ? 'text-gray-700' : ''}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 시간 슬롯 */}
        {selectedDate && selectedRoom && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {selectedDate} 예약 가능 시간
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                로딩 중...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((time) => {
                  const slotStatus = getTimeSlotStatus(time)
                  const endTime = `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`
                  
                  return (
                    <button
                      key={time}
                      onClick={() => handleTimeSlotClick(time, slotStatus)}
                      disabled={slotStatus.status === 'full'}
                      className={`
                        p-3 rounded-lg text-sm font-medium transition-colors
                        ${slotStatus.status === 'full' 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : slotStatus.status === 'partial'
                          ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200'
                        }
                      `}
                    >
                      <div>{time} - {endTime}</div>
                      {slotStatus.status === 'full' && (
                        <div className="text-xs text-gray-500 mt-1">완전 예약됨</div>
                      )}
                      {slotStatus.status === 'partial' && (
                        <div className="text-xs text-orange-600 mt-1">
                          {(() => {
                            const availableTime = slotStatus.available[0]
                            const [hour, minute] = availableTime.split(':')
                            
                            if (minute === '00') {
                              // 00분이면 해당 시간의 30분까지 사용가능
                              return `~${hour}:30 사용가능`
                            } else {
                              // 30분이면 해당 시간부터 사용가능  
                              return `${availableTime}~ 사용가능`
                            }
                          })()}
                        </div>
                      )}
                      {slotStatus.status === 'available' && (
                        <div className="text-xs text-blue-500 mt-1">사용가능</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="text-gray-400 text-sm">
              📅
              <div className="mt-2">날짜를 선택해주세요</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 