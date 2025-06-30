'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  FileText,
  User,
  Check,
  AlertCircle
} from 'lucide-react'

interface Room {
  id: string
  name: string
  capacity: number
  location: string
  equipment: string[]
  isAvailable?: boolean
}

export default function NewBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  // 폼 데이터
  const [formData, setFormData] = useState({
    roomId: '',
    title: '',
    bookerName: '',
    employeeId: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    participants: 1,
  })

  // 시간 슬롯 생성 (30분 단위)
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break // 18:00까지만
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // 오늘 날짜 계산 (사용자 로컬 시간)
  const today = (() => {
    const now = new Date() // 사용자 로컬 시간 사용
    return now.toISOString().split('T')[0]
  })()

  // 30일 후 날짜 계산
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  const maxDateString = maxDate.toISOString().split('T')[0]

  // URL 파라미터에서 초기값 설정
  useEffect(() => {
    const roomId = searchParams.get('roomId')
    const date = searchParams.get('date')
    const startTime = searchParams.get('startTime')
    
    if (roomId || date || startTime) {
      setFormData(prev => ({
        ...prev,
        ...(roomId && { roomId }),
        ...(date && { date }),
        ...(startTime && { 
          startTime,
          // 1시간 후를 종료 시간으로 설정
          endTime: startTime ? `${(parseInt(startTime.split(':')[0]) + 1).toString().padStart(2, '0')}:00` : ''
        })
      }))
    }
  }, [searchParams])

  // 회의실 목록 가져오기
  useEffect(() => {
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

    fetchRooms()
  }, [])

  // 입력값 변경 핸들러
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 에러 메시지 클리어
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // 폼 검증
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.roomId) newErrors.roomId = '회의실을 선택해주세요'
    if (!formData.title.trim()) newErrors.title = '제목을 입력해주세요'
    if (!formData.bookerName.trim()) newErrors.bookerName = '예약자 이름을 입력해주세요'
    if (!formData.employeeId.trim()) newErrors.employeeId = '사번을 입력해주세요'
    if (!formData.date) newErrors.date = '날짜를 선택해주세요'
    if (!formData.startTime) newErrors.startTime = '시작 시간을 선택해주세요'
    if (!formData.endTime) newErrors.endTime = '종료 시간을 선택해주세요'

    // 사번 형식 검증 (7자리 숫자)
    const employeeIdRegex = /^\d{7}$/
    if (formData.employeeId && !employeeIdRegex.test(formData.employeeId)) {
      newErrors.employeeId = '사번은 7자리 숫자여야 합니다'
    }

    // 시간 검증
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = '종료 시간은 시작 시간보다 늦어야 합니다'
    }

    // 참석자 수 검증
    const selectedRoom = rooms.find(room => room.id === formData.roomId)
    if (selectedRoom && formData.participants > selectedRoom.capacity) {
      newErrors.participants = `최대 ${selectedRoom.capacity}명까지 가능합니다`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 예약 생성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage('예약이 성공적으로 생성되었습니다!')
        
        // 3초 후 홈으로 이동
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setErrors({ submit: data.message || '예약 생성에 실패했습니다.' })
      }
    } catch (error) {
      setErrors({ submit: '네트워크 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  // 성공 메시지 표시 중일 때
  if (successMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-soft p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">예약 완료!</h2>
          <p className="text-gray-600 mb-4">{successMessage}</p>
          <div className="text-sm text-gray-500">잠시 후 홈으로 이동합니다...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-soft border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-gray-100 touch-feedback"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">예약 하기</h1>
          </div>
        </div>
      </header>

      {/* 폼 */}
      <div className="p-4 pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 회의실 선택 */}
          <div className="card p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <MapPin className="w-4 h-4 inline mr-1" />
              회의실 선택
            </label>
            <div className="space-y-2">
              {rooms.map((room) => (
                <label key={room.id} className="block">
                  <input
                    type="radio"
                    name="roomId"
                    value={room.id}
                    checked={formData.roomId === room.id}
                    onChange={(e) => handleInputChange('roomId', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.roomId === room.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">{room.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            최대 {room.capacity}명
                          </span>
                          <span>{room.location}</span>
                        </div>
                        {room.equipment.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {room.equipment.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {errors.roomId && (
              <p className="text-sm text-error-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.roomId}
              </p>
            )}
          </div>

          {/* 예약 정보 */}
          <div className="card p-4 space-y-4">
            <h3 className="font-medium text-gray-900">예약 정보</h3>
            
            {/* 부서명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                부서명
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="부서명을 입력하세요"
                className={`input-field ${errors.title ? 'border-error-500' : ''}`}
              />
              {errors.title && (
                <p className="text-sm text-error-600 mt-1">{errors.title}</p>
              )}
            </div>

            {/* 날짜 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                날짜
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={today}
                max={maxDateString}
                className={`input-field ${errors.date ? 'border-error-500' : ''}`}
              />
              {errors.date && (
                <p className="text-sm text-error-600 mt-1">{errors.date}</p>
              )}
            </div>

            {/* 시간 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  시작 시간
                </label>
                <select
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={`input-field ${errors.startTime ? 'border-error-500' : ''}`}
                >
                  <option value="">선택</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                {errors.startTime && (
                  <p className="text-sm text-error-600 mt-1">{errors.startTime}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종료 시간
                </label>
                <select
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className={`input-field ${errors.endTime ? 'border-error-500' : ''}`}
                >
                  <option value="">선택</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                {errors.endTime && (
                  <p className="text-sm text-error-600 mt-1">{errors.endTime}</p>
                )}
              </div>
            </div>

            {/* 참석자 수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                참석자 수
              </label>
              <input
                type="number"
                value={formData.participants}
                onChange={(e) => handleInputChange('participants', parseInt(e.target.value))}
                min="1"
                max="20"
                className={`input-field ${errors.participants ? 'border-error-500' : ''}`}
              />
              {errors.participants && (
                <p className="text-sm text-error-600 mt-1">{errors.participants}</p>
              )}
            </div>

            {/* 목적 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                목적 (선택사항)
              </label>
              <textarea
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                placeholder="회의 목적이나 특이사항을 입력하세요"
                rows={3}
                className="input-field resize-none"
              />
            </div>
          </div>

          {/* 예약자 정보 */}
          <div className="card p-4 space-y-4">
            <h3 className="font-medium text-gray-900">예약자 정보</h3>
            
            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                이름
              </label>
              <input
                type="text"
                value={formData.bookerName}
                onChange={(e) => handleInputChange('bookerName', e.target.value)}
                placeholder="예약자 이름"
                className={`input-field ${errors.bookerName ? 'border-error-500' : ''}`}
              />
              {errors.bookerName && (
                <p className="text-sm text-error-600 mt-1">{errors.bookerName}</p>
              )}
            </div>

            {/* 사번 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                사번 (7자리)
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 7)
                  handleInputChange('employeeId', value)
                }}
                placeholder="1234567"
                maxLength={7}
                className={`input-field ${errors.employeeId ? 'border-error-500' : ''}`}
              />
              {errors.employeeId && (
                <p className="text-sm text-error-600 mt-1">{errors.employeeId}</p>
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {errors.submit && (
            <div className="bg-error-50 border border-error-200 rounded-xl p-4">
              <p className="text-sm text-error-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errors.submit}
              </p>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '예약 중...' : '예약하기'}
          </button>
        </form>
      </div>
    </div>
  )
} 