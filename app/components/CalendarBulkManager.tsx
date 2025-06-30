'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, Users, MapPin, Plus, Edit3, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react';

// 타입 정의
interface Booking {
  id: string;
  roomId: string;
  roomName?: string;
  title: string;
  bookerName: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  purpose: string;
  participants: number;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: string[];
  status: 'active' | 'inactive';
}

interface CalendarBulkManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalendarBulkManager({ isOpen, onClose }: CalendarBulkManagerProps) {
  // 상태 관리
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'select' | 'manage'>('select');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    roomId: '',
    title: '',
    bookerName: '',
    employeeId: '',
    startTime: '',
    endTime: '',
    purpose: '',
    participants: 1,
  });

  // 드래그 관련 ref
  const dragStartRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

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

  // 초기 데이터 로딩
  useEffect(() => {
    if (isOpen) {
      fetchRooms();
      fetchBookings();
    }
  }, [isOpen, currentMonth]);

  // 회의실 목록 가져오기
  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      if (data.success) {
        setRooms(data.data);
      }
    } catch (error) {
      console.error('회의실 목록 로딩 실패:', error);
    }
  };

  // 예약 목록 가져오기
  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/reservations');
      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('예약 목록 로딩 실패:', error);
    }
  };

  // 달력 생성
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const calendar = [];
    const current = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        weekDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      calendar.push(weekDays);
      
      if (current > lastDay && weekDays[6].getMonth() !== month) break;
    }
    
    return calendar;
  };

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 날짜 유틸리티
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isSelected = (date: Date) => {
    return selectedDates.includes(formatDate(date));
  };

  // 해당 날짜의 예약 개수
  const getBookingCount = (date: Date) => {
    const dateString = formatDate(date);
    return bookings.filter(booking => 
      booking.date === dateString && booking.status !== 'cancelled'
    ).length;
  };

  // 드래그 선택 시작
  const handleMouseDown = (date: Date) => {
    if (isPastDate(date) || !isCurrentMonth(date)) return;
    
    const dateString = formatDate(date);
    dragStartRef.current = dateString;
    isDraggingRef.current = true;
    setIsSelecting(true);
    
    // 단일 선택/해제
    if (selectedDates.includes(dateString)) {
      setSelectedDates(prev => prev.filter(d => d !== dateString));
    } else {
      setSelectedDates(prev => [...prev, dateString]);
    }
  };

  // 드래그 중
  const handleMouseEnter = (date: Date) => {
    if (!isDraggingRef.current || isPastDate(date) || !isCurrentMonth(date)) return;
    
    const dateString = formatDate(date);
    const startDate = dragStartRef.current;
    
    if (startDate) {
      // 시작일과 현재일 사이의 모든 날짜 선택
      const start = new Date(startDate);
      const end = new Date(dateString);
      const [from, to] = start <= end ? [start, end] : [end, start];
      
      const newSelectedDates = [];
      const current = new Date(from);
      
      while (current <= to) {
        if (isCurrentMonth(current) && !isPastDate(current)) {
          newSelectedDates.push(formatDate(current));
        }
        current.setDate(current.getDate() + 1);
      }
      
      setSelectedDates(newSelectedDates);
    }
  };

  // 드래그 종료
  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsSelecting(false);
    dragStartRef.current = null;
  };

  // 전역 마우스 이벤트 리스너
  useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp();
    
    if (isSelecting) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isSelecting]);

  // 월 변경
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
    setSelectedDates([]);
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
    setSelectedDates([]);
  };

  // 일괄 예약 생성
  const handleBulkBooking = async () => {
    if (selectedDates.length === 0) {
      alert('날짜를 선택해주세요.');
      return;
    }

    if (!formData.roomId || !formData.title || !formData.bookerName || !formData.employeeId) {
      alert('필수 정보를 입력해주세요.');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      alert('시작 시간과 종료 시간을 선택해주세요.');
      return;
    }

    // 시간 검증
    if (formData.startTime >= formData.endTime) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    // 참석자 수 검증
    const selectedRoom = rooms.find(room => room.id === formData.roomId);
    if (selectedRoom && formData.participants > selectedRoom.capacity) {
      alert(`참석자 수는 최대 ${selectedRoom.capacity}명까지 가능합니다.`);
      return;
    }

    // 사번 형식 검증 (7자리 숫자)
    const employeeIdRegex = /^\d{7}$/;
    if (!employeeIdRegex.test(formData.employeeId)) {
      alert('사번은 7자리 숫자여야 합니다.');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/reservations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dates: selectedDates,
          ...formData,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`${data.data.created.length}개의 예약이 생성되었습니다!`);
        if (data.data.failed.length > 0) {
          alert(`${data.data.failed.length}개의 예약 생성에 실패했습니다.`);
        }
        setSelectedDates([]);
        fetchBookings();
      } else {
        alert(data.message || '예약 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('일괄 예약 실패:', error);
      alert('예약 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 일괄 취소
  const handleBulkCancel = async () => {
    if (selectedBookings.length === 0) {
      alert('취소할 예약을 선택해주세요.');
      return;
    }

    if (!confirm(`${selectedBookings.length}개의 예약을 취소하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/reservations/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingIds: selectedBookings,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`${data.data.success}개의 예약이 취소되었습니다.`);
        setSelectedBookings([]);
        fetchBookings();
      } else {
        alert(data.message || '예약 취소에 실패했습니다.');
      }
    } catch (error) {
      console.error('일괄 취소 실패:', error);
      alert('예약 취소 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const calendar = generateCalendar();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white rounded-t-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              스마트 예약 달력
            </h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode(mode === 'select' ? 'manage' : 'select')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  mode === 'select' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {mode === 'select' ? '일괄 예약' : '예약 관리'}
              </button>
              
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="text-gray-600 text-sm mb-6">
            {mode === 'select' 
              ? '여러 날짜를 드래그하여 선택하고 한 번에 예약하세요! 🎯'
              : '기존 예약을 선택하여 일괄 관리하세요! 📋'
            }
          </p>
          
          {/* 달력 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <h3 className="text-lg font-semibold text-gray-900">
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h3>
            
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div key={day} className="text-center py-2">
                <span className={`text-sm font-medium ${
                  index === 0 ? 'text-red-500' : 
                  index === 6 ? 'text-blue-500' : 'text-gray-700'
                }`}>
                  {day}
                </span>
              </div>
            ))}
          </div>

          {/* 달력 */}
          <div className="space-y-1 select-none mb-6">
            {calendar.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((date, dayIndex) => {
                  const dateString = formatDate(date);
                  const isSelectedDate = isSelected(date);
                  const isCurrentDay = isToday(date);
                  const isPast = isPastDate(date);
                  const isThisMonth = isCurrentMonth(date);
                  const bookingCount = getBookingCount(date);

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      onMouseDown={() => mode === 'select' && handleMouseDown(date)}
                      onMouseEnter={() => mode === 'select' && handleMouseEnter(date)}
                      className={`
                        relative aspect-square flex flex-col items-center justify-center text-sm rounded-lg cursor-pointer transition-all
                        ${isSelectedDate ? 'bg-blue-500 text-white scale-105 shadow-lg' : ''}
                        ${isCurrentDay && !isSelectedDate ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-300' : ''}
                        ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}
                        ${!isThisMonth ? 'text-gray-300' : ''}
                        ${!isPast && !isSelectedDate && !isCurrentDay && isThisMonth && dayIndex === 0 ? 'text-red-500' : ''}
                        ${!isPast && !isSelectedDate && !isCurrentDay && isThisMonth && dayIndex === 6 ? 'text-blue-500' : ''}
                        ${!isPast && !isSelectedDate && !isCurrentDay && isThisMonth && dayIndex !== 0 && dayIndex !== 6 ? 'text-gray-700' : ''}
                      `}
                    >
                      <span className="font-medium">{date.getDate()}</span>
                      {bookingCount > 0 && (
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelectedDate ? 'bg-white text-blue-500' : 'bg-red-500 text-white'
                        }`}>
                          {bookingCount > 9 ? '9+' : bookingCount}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 선택된 날짜 표시 */}
          {mode === 'select' && selectedDates.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mb-6">
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

          {/* 예약 폼 - mode가 select이고 날짜가 선택된 경우만 표시 */}
          {mode === 'select' && selectedDates.length > 0 && (
            <div className="space-y-4 bg-gray-50 rounded-xl p-4">
              <h4 className="text-lg font-semibold text-gray-900">📝 예약 정보 입력</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    회의실 *
                  </label>
                  <select
                    value={formData.roomId}
                    onChange={(e) => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">회의실을 선택해주세요</option>
                    {rooms.filter(room => room.status === 'active').map(room => (
                      <option key={room.id} value={room.id}>
                        {room.name} ({room.capacity}명)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    부서명 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="예: 부서명을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      예약자명 *
                    </label>
                    <input
                      type="text"
                      value={formData.bookerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, bookerName: e.target.value }))}
                      placeholder="홍길동"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      사번 * (7자리)
                    </label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                        setFormData(prev => ({ ...prev, employeeId: value }));
                      }}
                      placeholder="1234567"
                      maxLength={7}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작 시간
                    </label>
                    <select
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">선택</option>
                      {timeSlots.map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종료 시간
                    </label>
                    <select
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">선택</option>
                      {timeSlots.map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      참석 인원
                      {formData.roomId && (
                        <span className="text-gray-500 text-xs ml-1">
                          (최대 {rooms.find(room => room.id === formData.roomId)?.capacity || 1}명)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={formData.participants}
                      onChange={(e) => setFormData(prev => ({ ...prev, participants: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max={rooms.find(room => room.id === formData.roomId)?.capacity || 20}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    회의 목적 (선택)
                  </label>
                  <textarea
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
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

          {/* 예약 관리 모드 */}
          {mode === 'manage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">📋 예약 목록</h4>
                {selectedBookings.length > 0 && (
                  <button
                    onClick={handleBulkCancel}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:bg-gray-300 transition-colors"
                  >
                    {loading ? '처리 중...' : `선택된 ${selectedBookings.length}개 취소`}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {bookings
                  .filter(booking => {
                    const bookingDate = new Date(booking.date);
                    return bookingDate.getMonth() === currentMonth.getMonth() && 
                           bookingDate.getFullYear() === currentMonth.getFullYear() &&
                           booking.status !== 'cancelled';
                  })
                  .map(booking => (
                    <div key={booking.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookings(prev => [...prev, booking.id]);
                            } else {
                              setSelectedBookings(prev => prev.filter(id => id !== booking.id));
                            }
                          }}
                          className="mt-1.5 w-4 h-4 text-blue-600 rounded"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-gray-900">{booking.title}</h5>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {booking.status === 'confirmed' ? '확정' :
                               booking.status === 'pending' ? '대기' : '취소'}
                            </span>
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
                                <span>{new Date(booking.date).toLocaleDateString('ko-KR')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{booking.startTime} - {booking.endTime}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {bookings.filter(booking => {
                  const bookingDate = new Date(booking.date);
                  return bookingDate.getMonth() === currentMonth.getMonth() && 
                         bookingDate.getFullYear() === currentMonth.getFullYear() &&
                         booking.status !== 'cancelled';
                }).length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">예약이 없습니다</h3>
                    <p className="text-gray-500">이번 달에 예약된 회의가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 