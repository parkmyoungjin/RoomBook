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
  Mail
} from 'lucide-react'
import CheckInOutButton from '@/app/components/CheckInOutButton'
import { Booking } from '@/lib/googleSheets'

interface Room {
  id: string
  name: string
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // 필터 상태
  const [filters, setFilters] = useState({
    date: '',
    roomId: '',
    status: '' as '' | 'confirmed' | 'pending' | 'cancelled',
  })

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0]

  // 예약 목록 가져오기
  const fetchBookings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.date) params.append('date', filters.date)
      if (filters.roomId) params.append('roomId', filters.roomId)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/bookings?${params}`)
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
  }, [filters])

  // 필터 적용
  const applyFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setShowFilters(false)
  }

  // 필터 초기화
  const clearFilters = () => {
    setFilters({
      date: '',
      roomId: '',
      status: '',
    })
  }

  // 예약 상태 변경
  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    setActionLoading(bookingId)
    
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          status,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 로컬 상태 업데이트
        setBookings(prev => 
          prev.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status }
              : booking
          )
        )
        setSelectedBooking(null)
      } else {
        alert(data.message || '상태 변경에 실패했습니다.')
      }
    } catch (error) {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setActionLoading(null)
    }
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

  // 필터된 예약 개수
  const hasActiveFilters = filters.date || filters.roomId || filters.status
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
                  총 {filteredCount}개의 예약
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
            {filters.status && (
              <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs">
                <StatusBadge status={filters.status} />
                <button onClick={() => applyFilter('status', '')}>
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
                        <span>{booking.bookerName}</span>
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
                    onClick={() => applyFilter('status', '')}
                    className={`w-full text-left p-3 rounded-xl border ${
                      !filters.status ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    전체
                  </button>
                  {[
                    { value: 'confirmed', label: '확정' },
                    { value: 'pending', label: '대기중' },
                    { value: 'cancelled', label: '취소됨' },
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
                    <span>{selectedBooking.bookerEmail}</span>
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
                          fetch(`/api/bookings?date=${selectedBooking.date}`)
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
                    onClick={() => updateBookingStatus(selectedBooking.id, 'confirmed')}
                    disabled={actionLoading === selectedBooking.id}
                    className="w-full btn-success flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {actionLoading === selectedBooking.id ? '처리 중...' : '예약 확정'}
                  </button>
                  <button
                    onClick={() => updateBookingStatus(selectedBooking.id, 'cancelled')}
                    disabled={actionLoading === selectedBooking.id}
                    className="w-full btn-danger flex items-center justify-center gap-2"
                  >
                    <Ban className="w-5 h-5" />
                    예약 취소
                  </button>
                </div>
              )}

              {selectedBooking.status === 'confirmed' && (
                <button
                  onClick={() => updateBookingStatus(selectedBooking.id, 'cancelled')}
                  disabled={actionLoading === selectedBooking.id}
                  className="w-full btn-danger flex items-center justify-center gap-2"
                >
                  <Ban className="w-5 h-5" />
                  {actionLoading === selectedBooking.id ? '처리 중...' : '예약 취소'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 