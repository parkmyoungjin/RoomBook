'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Filter,
  X,
  Check,
  Ban,
  AlertCircle,
  MoreVertical,
  User,
  Mail,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import CheckInOutButton from '@/app/components/CheckInOutButton'
import { Booking } from '@/lib/googleSheets'

interface Room {
  id: string
  name: string
}

export default function ReservationsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pendingAction, setPendingAction] = useState<{
    type: 'cancel' | 'confirm'
    bookingId: string
    status: 'confirmed' | 'cancelled'
  } | null>(null)

  // 주달력 상태
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - dayOfWeek)
    return weekStart
  })

  // 필터 상태 - 기본값으로 확정된 예약만 표시
  const [filters, setFilters] = useState({
    date: '',
    roomId: '',
    status: 'confirmed' as '' | 'confirmed' | 'pending' | 'cancelled',
  })

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0]

  // 예약 목록 가져오기
  const fetchBookings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      // 선택된 날짜를 기본으로 사용하고, 필터에서 날짜가 지정되면 그것을 우선 사용
      const dateToUse = filters.date || selectedDate
      if (dateToUse) params.append('date', dateToUse)
      if (filters.roomId) params.append('roomId', filters.roomId)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/reservations?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setBookings(data.data)
      }
    } catch (error) {
      console.error('예약 목록 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 회의실 목록 가져오기
  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms')
      const data = await response.json()
      
      if (data.success) {
        setRooms(data.data)
      }
    } catch (error) {
      console.error('회의실 목록 로딩 실패:', error)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [filters, selectedDate])

  // 필터 적용
  const applyFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setShowFilters(false)
  }

  // 필터 초기화 - 확정 상태는 기본값으로 유지
  const clearFilters = () => {
    setFilters({
      date: '',
      roomId: '',
      status: 'confirmed',
    })
  }

  // 주달력 관련 함수들
  const getWeekDays = (weekStart: Date) => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      days.push(day)
    }
    return days
  }

  const formatWeekDay = (date: Date) => {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    return dayNames[date.getDay()]
  }

  const formatDayDate = (date: Date) => {
    return date.getDate()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelectedDate = (date: Date) => {
    return date.toISOString().split('T')[0] === selectedDate
  }

  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(newWeekStart)
  }

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(newWeekStart)
  }

  const selectDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    setSelectedDate(dateString)
  }

  const goToToday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - dayOfWeek)
    setCurrentWeekStart(weekStart)
    setSelectedDate(today.toISOString().split('T')[0])
  }

  // PIN 입력 모달 열기
  const openPinModal = (type: 'cancel' | 'confirm', bookingId: string, status: 'confirmed' | 'cancelled') => {
    setPendingAction({ type, bookingId, status })
    setPinInput('')
    setShowPinModal(true)
  }

  // PIN 검증 및 예약 상태 변경
  const verifyPinAndUpdateStatus = async () => {
    if (!pendingAction) return
    
    // 기본적인 형식 검증만 수행 (보안 검증은 서버에서만)
    if (!/^\d{7}$/.test(pinInput)) {
      alert('사번은 7자리 숫자여야 합니다.')
      return
    }

    setActionLoading(pendingAction.bookingId)
    
    try {
      const response = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: pendingAction.bookingId,
          status: pendingAction.status,
          employeeId: pinInput, // 서버에서 권한 확인
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 로컬 상태 업데이트
        setBookings(prev => 
          prev.map(booking => 
            booking.id === pendingAction.bookingId 
              ? { ...booking, status: pendingAction.status }
              : booking
          )
        )
        setSelectedBooking(null)
        setShowPinModal(false)
        setPendingAction(null)
        setPinInput('')
        
        // 성공 메시지
        alert(`예약이 성공적으로 ${pendingAction.status === 'confirmed' ? '확정' : '취소'}되었습니다.`)
      } else {
        alert(data.message || '상태 변경에 실패했습니다.')
      }
    } catch (error) {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  // PIN 모달 닫기
  const closePinModal = () => {
    setShowPinModal(false)
    setPendingAction(null)
    setPinInput('')
  }



  // 상태 표시 컴포넌트
  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'confirmed':
          return { text: '확정', className: 'status-available' }
        case 'pending':
          return { text: '대기중', className: 'status-pending' }
        case 'cancelled':
          return { text: '취소됨', className: 'status-booked' }
        default:
          return { text: '알 수 없음', className: 'status-pending' }
      }
    }

    const { text, className } = getStatusInfo(status)
    return <span className={className}>{text}</span>
  }

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
  }

  // 체크인/체크아웃 상태 표시 함수
  const getCheckInStatus = (booking: Booking) => {
    if (booking.status !== 'confirmed') return null
    
    if (booking.isNoShow) {
      return <span className="text-xs text-red-600 font-medium">❌ 노쇼</span>
    }
    
    if (booking.checkOutTime) {
      return <span className="text-xs text-gray-600">✅ 사용 완료</span>
    }
    
    if (booking.isCheckedIn) {
      return <span className="text-xs text-green-600">🟢 사용 중</span>
    }
    
    const now = new Date()
    const bookingStart = new Date(`${booking.date} ${booking.startTime}`)
    const checkInAllowedTime = new Date(bookingStart.getTime() - 15 * 60 * 1000)
    
    if (now >= checkInAllowedTime) {
      return <span className="text-xs text-orange-600">⭕ 체크인 가능</span>
    }
    
    return null
  }

  // 필터된 예약 개수 - 확정 상태는 기본값이므로 활성 필터로 간주하지 않음
  const hasActiveFilters = filters.date || filters.roomId || (filters.status !== 'confirmed' && filters.status !== '')
  const filteredCount = bookings.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-soft border-b border-gray-100 sticky top-0 z-20">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.back()}
                className="p-2 rounded-xl hover:bg-gray-100 touch-feedback"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">예약 현황</h1>
                <p className="text-sm text-gray-500">
                  {selectedDate === today ? '오늘' : formatDate(selectedDate)} {filteredCount}개의 예약
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowFilters(true)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 touch-feedback relative"
            >
              <Filter className="w-6 h-6 text-gray-600" />
              {hasActiveFilters && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full"></div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 주달력 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-700">날짜 선택</h2>
          <button
            onClick={goToToday}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Today
          </button>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg hover:bg-gray-100 touch-feedback"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="text-sm font-medium text-gray-900">
            {currentWeekStart.getMonth() + 1}월 {currentWeekStart.getDate()}일 - {getWeekDays(currentWeekStart)[6].getMonth() + 1}월 {getWeekDays(currentWeekStart)[6].getDate()}일
          </div>
          
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg hover:bg-gray-100 touch-feedback"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {getWeekDays(currentWeekStart).map((date, index) => {
            const isSelected = isSelectedDate(date)
            const isTodayDate = isToday(date)
            
            return (
              <button
                key={index}
                onClick={() => selectDate(date)}
                className={`
                  flex flex-col items-center py-2 px-1 rounded-lg touch-feedback transition-colors
                  ${
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : isTodayDate
                      ? 'bg-primary-50 text-primary-600 border border-primary-200'
                      : 'hover:bg-gray-100'
                  }
                `}
              >
                <span className={`text-xs font-medium ${
                  index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : ''
                } ${isSelected ? 'text-white' : ''}`}>
                  {formatWeekDay(date)}
                </span>
                <span className={`text-sm font-semibold mt-1 ${
                  isSelected ? 'text-white' : isTodayDate ? 'text-primary-600' : 'text-gray-900'
                }`}>
                  {formatDayDate(date)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 활성 필터 표시 */}
      {hasActiveFilters && (
        <div className="bg-primary-50 px-4 py-3 border-b border-primary-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-primary-700">필터:</span>
            {filters.date && (
              <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs">
                {formatDate(filters.date)}
                <button onClick={() => applyFilter('date', '')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.roomId && (
              <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs">
                {rooms.find(r => r.id === filters.roomId)?.name}
                <button onClick={() => applyFilter('roomId', '')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.status && filters.status !== 'confirmed' && (
              <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs">
                <StatusBadge status={filters.status} />
                <button onClick={() => applyFilter('status', 'confirmed')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-primary-600 hover:text-primary-700 ml-2"
            >
              모든 필터 제거
            </button>
          </div>
        </div>
      )}

      {/* 예약 목록 */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">예약이 없습니다</h3>
            <p className="text-gray-500 mb-6">
              {hasActiveFilters ? '필터 조건에 맞는 예약이 없습니다.' : '아직 등록된 예약이 없습니다.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn-secondary"
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="card p-4 touch-feedback">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{booking.title}</h3>
                      <StatusBadge status={booking.status} />
                      {getCheckInStatus(booking)}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.roomName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{booking.participants}명</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{booking.startTime} - {booking.endTime}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{booking.bookerName} ({booking.employeeId})</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedBooking(booking)}
                    className="p-2 rounded-lg hover:bg-gray-100 touch-feedback"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {booking.purpose && (
                  <div className="bg-gray-50 rounded-lg p-3 mt-3">
                    <p className="text-sm text-gray-600">{booking.purpose}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 필터 모달 */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">필터</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* 날짜 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">날짜</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => applyFilter('date', e.target.value)}
                  className="input-field"
                />
              </div>

              {/* 회의실 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">회의실</label>
                <div className="space-y-2">
                  <button
                    onClick={() => applyFilter('roomId', '')}
                    className={`w-full text-left p-3 rounded-xl border ${
                      !filters.roomId ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    전체
                  </button>
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => applyFilter('roomId', room.id)}
                      className={`w-full text-left p-3 rounded-xl border ${
                        filters.roomId === room.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                      }`}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 상태 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">상태</label>
                <div className="space-y-2">
                  <button
                    onClick={() => applyFilter('status', 'confirmed')}
                    className={`w-full text-left p-3 rounded-xl border ${
                      filters.status === 'confirmed' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    전체 (확정된 예약)
                  </button>
                  {[
                    { value: 'pending', label: '대기중' },
                    { value: 'cancelled', label: '취소됨' },
                    { value: '', label: '모든 상태' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => applyFilter('status', status.value)}
                      className={`w-full text-left p-3 rounded-xl border ${
                        filters.status === status.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 예약 상세/액션 모달 */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">예약 상세</h2>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* 예약 정보 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{selectedBooking.title}</h3>
                  <StatusBadge status={selectedBooking.status} />
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{selectedBooking.roomName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(selectedBooking.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{selectedBooking.startTime} - {selectedBooking.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{selectedBooking.participants}명</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{selectedBooking.bookerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>사번: {selectedBooking.employeeId}</span>
                  </div>
                </div>

                {selectedBooking.purpose && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">목적</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {selectedBooking.purpose}
                    </p>
                  </div>
                )}
              </div>

              {/* 체크인/체크아웃 섹션 */}
              {selectedBooking.status === 'confirmed' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">회의실 사용</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <CheckInOutButton 
                        booking={selectedBooking} 
                        onStatusChange={() => {
                          fetchBookings() // 예약 목록 새로고침
                          // 선택된 예약도 업데이트
                          fetch(`/api/reservations?date=${selectedBooking.date}`)
                            .then(res => res.json())
                            .then(data => {
                              if (data.success) {
                                const updatedBooking = data.data.find((b: Booking) => b.id === selectedBooking.id)
                                if (updatedBooking) {
                                  setSelectedBooking(updatedBooking)
                                }
                              }
                            })
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              {selectedBooking.status === 'pending' && (
                <div className="space-y-3">
                  <button
                    onClick={() => openPinModal('confirm', selectedBooking.id, 'confirmed')}
                    disabled={!!actionLoading}
                    className="w-full btn-success flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {actionLoading ? '처리 중...' : '예약 확정'}
                  </button>
                  <button
                    onClick={() => openPinModal('cancel', selectedBooking.id, 'cancelled')}
                    disabled={!!actionLoading}
                    className="w-full btn-danger flex items-center justify-center gap-2"
                  >
                    <Ban className="w-5 h-5" />
                    예약 취소
                  </button>
                </div>
              )}

              {selectedBooking.status === 'confirmed' && (
                <button
                  onClick={() => openPinModal('cancel', selectedBooking.id, 'cancelled')}
                  disabled={!!actionLoading}
                  className="w-full btn-danger flex items-center justify-center gap-2"
                >
                  <Ban className="w-5 h-5" />
                  {actionLoading ? '처리 중...' : '예약 취소'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIN 입력 모달 */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {pendingAction?.type === 'confirm' ? '예약 확정' : '예약 취소'}
                </h2>
                <button
                  onClick={closePinModal}
                  className="p-2 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  권한 확인이 필요합니다
                </h3>
                <p className="text-gray-600 mb-4">
                  {pendingAction?.type === 'confirm' ? '예약을 확정' : '예약을 취소'}하려면<br />
                  예약자의 사번 7자리를 입력하세요.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  사번 (7자리)
                </label>
                <input
                  type="text"
                  value={pinInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 7)
                    setPinInput(value)
                  }}
                  placeholder="1234567"
                  className="w-full text-center text-2xl font-mono tracking-widest py-4 px-6 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  maxLength={7}
                  autoFocus
                />
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>예약자 사번 또는 관리자 PIN</span>
                  <span>{pinInput.length}/7</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={verifyPinAndUpdateStatus}
                  disabled={pinInput.length !== 7 || !!actionLoading}
                  className={`w-full py-4 px-6 rounded-xl font-semibold transition-colors ${
                    pinInput.length === 7 && !actionLoading
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {actionLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      처리 중...
                    </div>
                  ) : (
                    pendingAction?.type === 'confirm' ? '예약 확정' : '예약 취소'
                  )}
                </button>
                
                <button
                  onClick={closePinModal}
                  disabled={!!actionLoading}
                  className="w-full py-3 px-6 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                팁: 관리자는 관리자 PIN을 사용할 수 있습니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}