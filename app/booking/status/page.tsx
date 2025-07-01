'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, LogIn, Calendar as CalendarIcon } from 'lucide-react'
import { useUser } from '@/app/contexts/UserContext'

interface Room {
  id: string
  name: string
  capacity: number
  location: string
  equipment: string
  status?: 'active' | 'inactive'
}

interface Booking {
  id: string
  roomId: string
  roomName?: string
  date: string
  startTime: string
  endTime: string
  title: string
  bookerName: string
  employeeId?: string
  participants?: number
  purpose?: string
  status: 'confirmed' | 'pending' | 'cancelled'
}

export default function BookingStatusPage() {
  const router = useRouter()
  const { isLoggedIn, user } = useUser()
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)

  // 다중 예약 관련 상태
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState<'individual' | 'range'>('individual')
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [bulkFormData, setBulkFormData] = useState({
    title: '',
    bookerName: '',
    employeeId: '',
    startTime: '',
    endTime: '',
    purpose: '',
    participants: 1,
  })
  // 새로운 상태 추가: 예약 불가능한 날짜들
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // 시간 슬롯 생성 (1시간 단위) - 기존 단일 예약용
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 18; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      slots.push(time)
    }
    return slots
  }

  // 30분 단위 시간 슬롯 생성 - 다중 예약용
  const generateBulkTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()
  const bulkTimeSlots = generateBulkTimeSlots()

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

  // 🎯 깔끔한 날짜 선택 로직 (드래그 제거)
  const handleDateClick = (date: Date) => {
    if (!isBulkMode || isPastDate(date) || !isCurrentMonth(date)) return
    
    const dateString = formatDate(date)
    
    // 다중 예약 모드에서 시간이 선택되지 않았으면 날짜 선택 불가
    if (isBulkMode && (!bulkFormData.startTime || !bulkFormData.endTime)) {
      alert('먼저 시간을 선택해주세요.')
      return
    }
    
    // 예약 불가능한 날짜는 선택 불가
    if (unavailableDates.includes(dateString)) {
      alert('선택한 시간에 이미 예약이 있어 선택할 수 없습니다.')
      return
    }
    
    if (selectionMode === 'individual') {
      // 개별 선택: 단순 토글
      if (selectedDates.includes(dateString)) {
        setSelectedDates(prev => prev.filter(d => d !== dateString))
      } else {
        setSelectedDates(prev => [...prev, dateString])
      }
    } else {
      // 범위 선택: 시작일-종료일
      if (!rangeStart) {
        setRangeStart(dateString)
        setSelectedDates([dateString])
      } else {
        const start = new Date(rangeStart)
        const end = new Date(dateString)
        const [from, to] = start <= end ? [start, end] : [end, start]
        
        const newSelectedDates = []
        const current = new Date(from)
        
        while (current <= to) {
          const currentDateString = formatDate(current)
          if (isCurrentMonth(current) && !isPastDate(current) && !unavailableDates.includes(currentDateString)) {
            newSelectedDates.push(currentDateString)
          }
          current.setDate(current.getDate() + 1)
        }
        
        setSelectedDates(newSelectedDates)
        setRangeStart(null)
      }
    }
  }

  // 선택 모드 변경
  const toggleSelectionMode = () => {
    setSelectionMode(prev => prev === 'individual' ? 'range' : 'individual')
    setRangeStart(null)
    setSelectedDates([])
  }

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedDates.length > 0) {
      setSelectedDates([])
    } else {
      const allAvailableDates: string[] = []
      const calendar = generateCalendar()
      
      calendar.forEach(week => {
        week.forEach(date => {
          if (isCurrentMonth(date) && !isPastDate(date)) {
            allAvailableDates.push(formatDate(date))
          }
        })
      })
      
      setSelectedDates(allAvailableDates)
    }
  }

  // 모드 변경 시 상태 초기화
  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode)
    setSelectedDates([])
    setSelectedDate('')
    setRangeStart(null)
    setSelectionMode('individual')
    setUnavailableDates([])
    setBulkFormData({
      title: '',
      bookerName: '',
      employeeId: '',
      startTime: '',
      endTime: '',
      purpose: '',
      participants: 1,
    })
  }

  // 월 변경 시 다중 예약 모드의 선택 날짜도 초기화
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    if (isBulkMode) {
      setSelectedDates([])
      setRangeStart(null)
      setUnavailableDates([])
    } else {
      setSelectedDate('')
    }
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    if (isBulkMode) {
      setSelectedDates([])
      setRangeStart(null)
      setUnavailableDates([])
    } else {
      setSelectedDate('')
    }
  }

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

  // 선택된 날짜의 예약 정보 가져오기 (단일 예약 모드에서만)
  useEffect(() => {
    if (!isBulkMode && selectedRoom && selectedDate) {
      fetchBookings()
    }
  }, [selectedRoom, selectedDate, isBulkMode])

  // 다중 예약 모드에서 시간이 변경될 때 예약 가능성 확인
  useEffect(() => {
    if (isBulkMode && selectedRoom && bulkFormData.startTime && bulkFormData.endTime) {
      checkTimeAvailability()
    }
  }, [isBulkMode, selectedRoom, bulkFormData.startTime, bulkFormData.endTime, currentMonth])

  // 다중 예약 모드에서 로그인된 사용자 정보 자동 입력
  useEffect(() => {
    if (isBulkMode && user && isLoggedIn) {
      setBulkFormData(prev => ({
        ...prev,
        bookerName: user.name || '',
        employeeId: user.employeeId || ''
      }))
    }
  }, [isBulkMode, user, isLoggedIn])

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

  // 일괄 예약 함수
  const handleBulkBooking = async () => {
    if (selectedDates.length === 0) {
      alert('날짜를 선택해주세요.')
      return
    }

    if (!selectedRoom || !bulkFormData.title || !bulkFormData.bookerName || !bulkFormData.employeeId) {
      alert('필수 정보를 입력해주세요.')
      return
    }

    if (!bulkFormData.startTime || !bulkFormData.endTime) {
      alert('시작 시간과 종료 시간을 선택해주세요.')
      return
    }

    if (bulkFormData.startTime >= bulkFormData.endTime) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.')
      return
    }

    const selectedRoomData = rooms.find(room => room.id === selectedRoom)
    if (selectedRoomData && bulkFormData.participants > selectedRoomData.capacity) {
      alert(`참석자 수는 최대 ${selectedRoomData.capacity}명까지 가능합니다.`)
      return
    }

    const employeeIdRegex = /^\d{7}$/
    if (!employeeIdRegex.test(bulkFormData.employeeId)) {
      alert('사번은 7자리 숫자여야 합니다.')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/reservations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dates: selectedDates,
          roomId: selectedRoom,
          ...bulkFormData,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`${data.data.created.length}개의 예약이 생성되었습니다!`)
        if (data.data.failed.length > 0) {
          alert(`${data.data.failed.length}개의 예약 생성에 실패했습니다.`)
        }
        setSelectedDates([])
        setBulkFormData({
          title: '',
          bookerName: '',
          employeeId: '',
          startTime: '',
          endTime: '',
          purpose: '',
          participants: 1,
        })
      } else {
        alert(data.message || '예약 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('일괄 예약 실패:', error)
      alert('예약 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
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

  // 선택한 시간에 예약 불가능한 날짜 조회
  const checkTimeAvailability = async () => {
    if (!selectedRoom || !bulkFormData.startTime || !bulkFormData.endTime) {
      setUnavailableDates([])
      return
    }

    setLoadingAvailability(true)
    
    try {
      const calendar = generateCalendar()
      const allDates: string[] = []
      
      // 현재 달의 모든 날짜 수집
      calendar.forEach(week => {
        week.forEach(date => {
          if (isCurrentMonth(date) && !isPastDate(date)) {
            allDates.push(formatDate(date))
          }
        })
      })

      // 각 날짜에 대해 예약 상태 확인
      const checkPromises = allDates.map(async (date) => {
        try {
          const response = await fetch(`/api/reservations?date=${date}&roomId=${selectedRoom}`)
          const data = await response.json()
          
          if (data.success) {
            // 선택한 시간과 겹치는 예약이 있는지 확인
            const hasConflict = data.data.some((booking: Booking) => {
              if (booking.status === 'cancelled') return false
              
              const bookingStart = booking.startTime
              const bookingEnd = booking.endTime
              const selectedStart = bulkFormData.startTime
              const selectedEnd = bulkFormData.endTime
              
              // 시간 겹침 검사
              return (selectedStart < bookingEnd && selectedEnd > bookingStart)
            })
            
            return hasConflict ? date : null
          }
          return null
        } catch (error) {
          console.error(`날짜 ${date} 예약 상태 확인 실패:`, error)
          return null
        }
      })

      const results = await Promise.all(checkPromises)
      const unavailable = results.filter(date => date !== null) as string[]
      
      setUnavailableDates(unavailable)
    } catch (error) {
      console.error('예약 가능성 확인 중 오류:', error)
      setUnavailableDates([])
    } finally {
      setLoadingAvailability(false)
    }
  }

  // 로그인 필요 화면
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-soft p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인 필요</h2>
          <p className="text-gray-600 mb-6">예약 현황을 확인하려면 먼저 로그인해주세요.</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700"
            >
              <LogIn className="w-4 h-4" />
              홈으로 가서 로그인
            </button>
            <button
              onClick={() => router.back()}
              className="w-full text-gray-600 py-2 px-4 rounded-xl hover:bg-gray-100"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    )
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
        {/* 안내 메시지 */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mb-4">
          <p className="text-gray-600 text-sm">
            {isBulkMode 
              ? '1️⃣ 시간을 먼저 선택하고 2️⃣ 여러 날짜를 선택해서 한 번에 예약하세요! 🎯'
              : '날짜와 시간을 선택해서 회의실을 예약하세요! 📅'
            }
          </p>
        </div>

        {/* 회의실 선택 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">회의실 선택</h3>
            <button
              onClick={toggleBulkMode}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isBulkMode 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isBulkMode ? '다중 예약' : '단일 예약'}
            </button>
          </div>
          <div className="space-y-2">
            {rooms.filter(room => room.status !== 'inactive').map((room) => (
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

        {/* 다중 예약 모드 - 시간 선택 */}
        {isBulkMode && selectedRoom && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">1️⃣ 시간 선택</h3>
              {loadingAvailability && (
                <div className="text-xs text-blue-600">예약 가능성 확인중...</div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작 시간 *
                </label>
                <select
                  value={bulkFormData.startTime}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">선택</option>
                  {bulkTimeSlots.map(time => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료 시간 *
                </label>
                <select
                  value={bulkFormData.endTime}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">선택</option>
                  {bulkTimeSlots.map(time => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {(!bulkFormData.startTime || !bulkFormData.endTime) && (
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                💡 시간을 선택하면 달력에서 예약 가능한 날짜만 표시됩니다
              </div>
            )}
            
            {(bulkFormData.startTime && bulkFormData.endTime && unavailableDates.length > 0) && (
              <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">
                🚫 {unavailableDates.length}개 날짜가 선택한 시간에 예약이 있어 선택할 수 없습니다
              </div>
            )}
          </div>
        )}

        {/* 달력 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold">
              {isBulkMode ? '2️⃣ ' : ''}{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h3>
            <button
              onClick={goToNextMonth}
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
          <div className={`space-y-1 ${isBulkMode ? 'select-none' : ''}`}>
            {calendar.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((date, dayIndex) => {
                  const dateString = formatDate(date)
                  const isSelected = isBulkMode 
                    ? selectedDates.includes(dateString)
                    : selectedDate === dateString
                  const isCurrentDay = isToday(date)
                  const isPast = isPastDate(date)
                  const isThisMonth = isCurrentMonth(date)
                  const isRangeStart = rangeStart === dateString
                  const isUnavailable = isBulkMode && unavailableDates.includes(dateString)

                  return (
                    <button
                      key={`${weekIndex}-${dayIndex}`}
                      onClick={() => {
                        if (isBulkMode) {
                          handleDateClick(date)
                        } else {
                          !isPast && setSelectedDate(dateString)
                        }
                      }}
                      disabled={isPast || isUnavailable}
                      className={`
                        aspect-square flex items-center justify-center text-sm rounded-lg 
                        transition-all duration-200 ease-in-out cursor-pointer relative
                        ${isSelected && isBulkMode ? 
                          'bg-blue-500 text-white shadow-md transform-gpu' : 
                          ''}
                        ${isSelected && !isBulkMode ? 'bg-blue-500 text-white' : ''}
                        ${isRangeStart ? 'ring-2 ring-blue-300 bg-blue-100' : ''}
                        ${isCurrentDay && !isSelected && !isUnavailable ? 'bg-blue-100 text-blue-600' : ''}
                        ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${isUnavailable ? 'bg-red-100 text-red-400 cursor-not-allowed opacity-50' : ''}
                        ${!isPast && !isUnavailable && !isSelected && !isCurrentDay ? 'hover:bg-gray-100 active:scale-95' : ''}
                        ${!isThisMonth ? 'text-gray-300' : ''}
                        ${!isPast && !isSelected && !isCurrentDay && !isUnavailable && isThisMonth && dayIndex === 0 ? 'text-red-500' : ''}
                        ${!isPast && !isSelected && !isCurrentDay && !isUnavailable && isThisMonth && dayIndex === 6 ? 'text-blue-500' : ''}
                        ${!isPast && !isSelected && !isCurrentDay && !isUnavailable && isThisMonth && dayIndex !== 0 && dayIndex !== 6 ? 'text-gray-700' : ''}
                      `}
                    >
                      {date.getDate()}
                      {isSelected && isBulkMode && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                      {isRangeStart && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">
                          S
                        </div>
                      )}
                      {isUnavailable && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                          ✕
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 🛠️ 다중 예약 컨트롤 패널 */}
        {isBulkMode && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">선택 모드</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectionMode}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectionMode === 'individual' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {selectionMode === 'individual' ? '개별 선택' : '범위 선택'}
                </button>
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {selectedDates.length > 0 ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              {!bulkFormData.startTime || !bulkFormData.endTime
                ? '⚠️ 먼저 시간을 선택해주세요'
                : selectionMode === 'individual' 
                  ? '📍 원하는 날짜를 클릭해서 개별 선택하세요 (❌ 빨간 표시: 예약 불가)'
                  : rangeStart 
                    ? '📅 종료일을 클릭해서 범위를 완성하세요'
                    : '📅 시작일을 클릭해서 범위 선택을 시작하세요'
              }
            </div>
          </div>
        )}

        {/* 다중 예약 모드 - 선택된 날짜 표시 */}
        {isBulkMode && selectedDates.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mb-4">
            <h4 className="text-sm font-medium text-blue-900 mb-3">
              ✨ 선택된 날짜 ({selectedDates.length}개)
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedDates.slice(0, 8).map(date => (
                <span key={date} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              ))}
              {selectedDates.length > 8 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  +{selectedDates.length - 8}개 더
                </span>
              )}
            </div>
          </div>
        )}

        {/* 다중 예약 모드 - 예약 폼 */}
        {isBulkMode && selectedDates.length > 0 && selectedRoom && bulkFormData.startTime && bulkFormData.endTime && (
          <div className="space-y-4 bg-gray-50 rounded-xl p-4 mb-4">
            <h4 className="text-lg font-semibold text-gray-900">3️⃣ 예약 정보 입력</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  부서명 *
                </label>
                <input
                  type="text"
                  value={bulkFormData.title}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="예: 부서명을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {!isLoggedIn && (
                <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mb-3">
                  💡 로그인하시면 예약자 정보가 자동으로 입력됩니다
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    예약자명 * 
                    {user && isLoggedIn && (
                      <span className="text-xs text-blue-600 ml-1">✓ 자동입력</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={bulkFormData.bookerName}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, bookerName: e.target.value }))}
                    placeholder={user?.name || "홍길동"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사번 * (7자리)
                    {user && isLoggedIn && (
                      <span className="text-xs text-blue-600 ml-1">✓ 자동입력</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={bulkFormData.employeeId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 7)
                      setBulkFormData(prev => ({ ...prev, employeeId: value }))
                    }}
                    placeholder={user?.employeeId || "1234567"}
                    maxLength={7}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  참석 인원
                  {selectedRoom && (
                    <span className="text-gray-500 text-xs ml-1">
                      (최대 {rooms.find(room => room.id === selectedRoom)?.capacity || 1}명)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={bulkFormData.participants}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, participants: parseInt(e.target.value) || 1 }))}
                  min="1"
                  max={rooms.find(room => room.id === selectedRoom)?.capacity || 20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회의 목적 (선택)
                </label>
                <textarea
                  value={bulkFormData.purpose}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="회의 목적을 간단히 설명해주세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleBulkBooking}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '예약 중...' : `🚀 ${selectedDates.length}개 날짜 일괄 예약`}
            </button>
          </div>
        )}

        {/* 단일 예약 모드 - 시간 슬롯 */}
        {!isBulkMode && selectedDate && selectedRoom && (
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

        {/* 안내 메시지들 */}
        {!isBulkMode && !selectedDate && (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="text-gray-400 text-sm">
              📅
              <div className="mt-2">날짜를 선택해주세요</div>
            </div>
          </div>
        )}

        {isBulkMode && selectedDates.length === 0 && (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="text-gray-400 text-sm">
              🗓️
              <div className="mt-2">여러 날짜를 드래그하여 선택해주세요</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 