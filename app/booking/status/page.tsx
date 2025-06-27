'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'

interface Room {
  id: string
  name: string
  capacity: number
  location: string
}

interface Booking {
  id: string
  roomId: string
  date: string
  startTime: string
  endTime: string
  title: string
  bookerName: string
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

  // 오늘 날짜 계산 (한국 시간 기준)
  const getTodayString = () => {
    const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)) // UTC+9 한국 시간
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
      const response = await fetch(`/api/bookings?roomId=${selectedRoom}&date=${selectedDate}`)
      const data = await response.json()
      
      if (data.success) {
        setBookings(data.data || [])
      }
    } catch (error) {
      console.error('예약 정보 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 시간대별 예약 여부 확인
  const isTimeSlotBooked = (time: string) => {
    return bookings.some(booking => {
      const bookingStart = booking.startTime
      const bookingEnd = booking.endTime
      return time >= bookingStart && time < bookingEnd
    })
  }

  // 시간 클릭 핸들러
  const handleTimeSlotClick = (time: string) => {
    if (isTimeSlotBooked(time)) return
    
    // 예약 페이지로 이동하면서 선택된 정보 전달
    const params = new URLSearchParams({
      roomId: selectedRoom,
      date: selectedDate,
      startTime: time
    })
    
    router.push(`/booking/new?${params.toString()}`)
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
            <h1 className="text-lg font-semibold text-gray-900">예약 현황</h1>
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
                <div className="text-sm text-gray-500">{room.location} • {room.capacity}명</div>
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
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
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
                        ${!isPast && !isSelected && !isCurrentDay ? 'text-gray-700' : ''}
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
                  const isBooked = isTimeSlotBooked(time)
                  const endTime = `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`
                  
                  return (
                    <button
                      key={time}
                      onClick={() => handleTimeSlotClick(time)}
                      disabled={isBooked}
                      className={`
                        p-3 rounded-lg text-sm font-medium transition-colors
                        ${isBooked 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200'
                        }
                      `}
                    >
                      {time} - {endTime}
                      {isBooked && (
                        <div className="text-xs text-gray-500 mt-1">예약됨</div>
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