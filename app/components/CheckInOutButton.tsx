'use client';

import { useState, useEffect, useRef } from 'react';
import { Booking } from '@/lib/googleSheets';

interface CheckInOutButtonProps {
  booking: Booking;
  onStatusChange?: () => void;
}

export default function CheckInOutButton({ booking, onStatusChange }: CheckInOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showEmployeeIdModal, setShowEmployeeIdModal] = useState(false);
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [actionType, setActionType] = useState<'checkin' | 'checkout' | 'extend' | null>(null);
  const [currentBooking, setCurrentBooking] = useState(booking);
  
  // 🆕 알림 및 연장 관련 상태
  const [showPreEndNotification, setShowPreEndNotification] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(30);
  const [timeUntilEnd, setTimeUntilEnd] = useState(0);
  const [hasShownNotification, setHasShownNotification] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // booking이 변경될 때마다 currentBooking 업데이트
  useEffect(() => {
    console.log('CheckInOutButton - booking 변경:', {
      id: booking.id,
      isCheckedIn: booking.isCheckedIn,
      checkInTime: booking.checkInTime,
      checkOutTime: booking.checkOutTime
    });
    setCurrentBooking(booking);
    setHasShownNotification(false); // 새 예약이면 알림 상태 리셋
  }, [booking]);

  // 🆕 시간 체크 및 알림 로직
  useEffect(() => {
    if (!currentBooking.isCheckedIn || currentBooking.checkOutTime) {
      // 체크인 안했거나 이미 체크아웃했으면 타이머 정리
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 1초마다 시간 체크
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const bookingEnd = new Date(`${currentBooking.date} ${currentBooking.endTime}`);
      const minutesUntilEnd = Math.ceil((bookingEnd.getTime() - now.getTime()) / (1000 * 60));
      
      setTimeUntilEnd(minutesUntilEnd);

      // 🚨 종료 10분 전 알림 (한 번만)
      if (minutesUntilEnd === 10 && !hasShownNotification) {
        setShowPreEndNotification(true);
        setHasShownNotification(true);
      }

      // 🚨 종료 시간 도달 시 자동 체크아웃
      if (minutesUntilEnd <= 0 && !currentBooking.checkOutTime) {
        console.log('⏰ 예약 시간 종료 - 자동 체크아웃 실행');
        handleAutoCheckout();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentBooking, hasShownNotification]);

  // 🆕 자동 체크아웃 함수
  const handleAutoCheckout = async () => {
    try {
      console.log('자동 체크아웃 시작:', currentBooking.id);
      
      const response = await fetch(`/api/reservations/${currentBooking.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          employeeId: currentBooking.employeeId, // 예약자 사번으로 자동 체크아웃
          isAutoCheckout: true
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ 자동 체크아웃 완료');
        if (data.booking) {
          setCurrentBooking(data.booking);
        }
        onStatusChange?.();
        setMessage('⏰ 예약 시간이 종료되어 자동으로 체크아웃되었습니다.');
      } else {
        console.error('❌ 자동 체크아웃 실패:', data.error);
      }
    } catch (error) {
      console.error('자동 체크아웃 오류:', error);
    }
  };

  // 🆕 연장 요청 함수
  const handleExtendRequest = async () => {
    if (!employeeIdInput.trim()) {
      setMessage('❌ 사번을 입력해주세요.');
      return;
    }

    // 사번 형식 검증
    const employeeIdRegex = /^\d{7}$/;
    if (!employeeIdRegex.test(employeeIdInput.trim())) {
      setMessage('❌ 사번은 7자리 숫자여야 합니다.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      console.log('연장 요청 시작:', {
        bookingId: currentBooking.id,
        employeeId: employeeIdInput.trim(),
        extendMinutes
      });

      const response = await fetch(`/api/reservations/${currentBooking.id}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          employeeId: employeeIdInput.trim(),
          extendMinutes: extendMinutes
        }),
      });

      const data = await response.json();
      console.log('연장 응답:', data);

      if (data.success) {
        setMessage(`✅ ${extendMinutes}분 연장이 완료되었습니다!`);
        
        if (data.booking) {
          console.log('업데이트된 예약 정보:', data.booking);
          setCurrentBooking(data.booking);
        }
        
        // 모달들 닫기
        setShowExtendModal(false);
        setShowPreEndNotification(false);
        setActionType(null);
        setEmployeeIdInput('');
        setHasShownNotification(false); // 연장 후 다시 알림 받을 수 있도록
        
        onStatusChange?.();
        
      } else {
        if (response.status === 403) {
          setMessage('❌ 권한이 없습니다. 예약자 본인의 사번을 입력해주세요.');
        } else if (data.error?.includes('다른 예약이 있습니다')) {
          setMessage('❌ 다음 시간에 다른 예약이 있어서 연장할 수 없습니다.');
        } else {
          setMessage(`❌ ${data.error || data.message || '연장에 실패했습니다.'}`);
        }
      }
    } catch (error) {
      setMessage('❌ 연장 중 오류가 발생했습니다.');
      console.error('연장 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 시간과 예약 시간 비교
  const now = new Date();
  const bookingStart = new Date(`${currentBooking.date} ${currentBooking.startTime}`);
  const bookingEnd = new Date(`${currentBooking.date} ${currentBooking.endTime}`);
  const checkInAllowedTime = new Date(bookingStart.getTime() - 15 * 60 * 1000); // 15분 전

  // 버튼 상태 결정
  const canCheckIn = now >= checkInAllowedTime && !currentBooking.isCheckedIn && !currentBooking.isNoShow;
  const canCheckOut = currentBooking.isCheckedIn && !currentBooking.checkOutTime;
  const isExpired = now > bookingEnd;

  console.log('CheckInOutButton - 버튼 상태:', {
    canCheckIn,
    canCheckOut,
    isCheckedIn: currentBooking.isCheckedIn,
    checkOutTime: currentBooking.checkOutTime
  });

  // 체크인/체크아웃 버튼 클릭 핸들러
  const handleActionClick = (type: 'checkin' | 'checkout') => {
    setActionType(type);
    setEmployeeIdInput('');
    setShowEmployeeIdModal(true);
    setMessage('');
  };

  // 🆕 연장 버튼 클릭 핸들러
  const handleExtendClick = () => {
    setActionType('extend');
    setEmployeeIdInput('');
    setShowExtendModal(true);
    setMessage('');
  };

  // 사번 검증 및 체크인/체크아웃 처리
  const handleActionConfirm = async () => {
    if (!actionType || !employeeIdInput.trim()) {
      setMessage('❌ 사번을 입력해주세요.');
      return;
    }

    // 사번 형식 검증
    const employeeIdRegex = /^\d{7}$/;
    if (!employeeIdRegex.test(employeeIdInput.trim())) {
      setMessage('❌ 사번은 7자리 숫자여야 합니다.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const endpoint = actionType === 'checkin' ? 'checkin' : 'checkout';
      console.log(`${actionType} 요청 시작:`, {
        bookingId: currentBooking.id,
        employeeId: employeeIdInput.trim(),
        endpoint
      });

      const response = await fetch(`/api/reservations/${currentBooking.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          employeeId: employeeIdInput.trim()
        }),
      });

      const data = await response.json();
      console.log(`${actionType} 응답:`, data);

      if (data.success) {
        const actionText = actionType === 'checkin' ? '체크인' : '체크아웃';
        setMessage(`✅ ${actionText}이 완료되었습니다!`);
        
        // 서버에서 반환된 업데이트된 예약 정보로 즉시 상태 업데이트
        if (data.booking) {
          console.log('업데이트된 예약 정보:', data.booking);
          setCurrentBooking(data.booking);
        } else {
          console.warn('서버 응답에 업데이트된 예약 정보가 없습니다.');
        }
        
        // 모달 닫기
        setShowEmployeeIdModal(false);
        setActionType(null);
        setEmployeeIdInput('');
        
        // 부모 컴포넌트에도 알림
        onStatusChange?.();
        
      } else {
        // 에러 메시지 개선
        if (response.status === 403) {
          setMessage('❌ 권한이 없습니다. 예약자 본인의 사번을 입력해주세요.');
        } else if (data.error?.includes('이미 체크인')) {
          setMessage('❌ 이미 체크인된 예약입니다.');
        } else if (data.error?.includes('체크인되지 않은')) {
          setMessage('❌ 체크인되지 않은 예약입니다.');
        } else if (data.error?.includes('이미 체크아웃')) {
          setMessage('❌ 이미 체크아웃된 예약입니다.');
        } else {
          setMessage(`❌ ${data.error || data.message || '처리에 실패했습니다.'}`);
        }
      }
    } catch (error) {
      const actionText = actionType === 'checkin' ? '체크인' : '체크아웃';
      setMessage(`❌ ${actionText} 중 오류가 발생했습니다.`);
      console.error(`${actionText} 오류:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // 모달 닫기
  const handleModalClose = () => {
    setShowEmployeeIdModal(false);
    setShowExtendModal(false);
    setActionType(null);
    setEmployeeIdInput('');
    setMessage('');
  };

  // 한국 시간으로 표시하는 헬퍼 함수 추가
  const formatKoreanTime = (timeString: string) => {
    if (!timeString) return '';
    
    // 한국 시간대가 포함된 문자열인지 확인
    if (timeString.includes('+09:00')) {
      // 이미 한국 시간이므로 그대로 파싱
      const date = new Date(timeString);
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Seoul'
      });
    } else {
      // UTC 시간인 경우 한국 시간대로 변환
      const date = new Date(timeString);
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Seoul'
      });
    }
  };

  // 🆕 개선된 상태 표시
  const getStatusDisplay = () => {
    if (currentBooking.isNoShow) {
      return <span className="text-xs text-red-600 font-medium">❌ 노쇼</span>;
    }
    
    if (currentBooking.checkOutTime) {
      return (
        <div className="text-xs text-gray-600">
          <div>✅ 사용 완료</div>
          <div>체크아웃: {formatKoreanTime(currentBooking.checkOutTime)}</div>
        </div>
      );
    }
    
    if (currentBooking.isCheckedIn) {
      const minutesLeft = timeUntilEnd;
      return (
        <div className="text-xs text-green-600">
          <div>🟢 사용 중</div>
          <div>체크인: {formatKoreanTime(currentBooking.checkInTime || '')}</div>
          {minutesLeft > 0 ? (
            <div className={`${minutesLeft <= 10 ? 'text-orange-600 font-bold' : ''}`}>
              ⏱️ {minutesLeft}분 남음
            </div>
          ) : (
            <div className="text-red-600 font-bold">⏰ 시간 초과</div>
          )}
        </div>
      );
    }
    
    if (isExpired) {
      return <span className="text-xs text-gray-500">⏰ 시간 만료</span>;
    }
    
    if (now < checkInAllowedTime) {
      const minutesUntilCheckIn = Math.ceil((checkInAllowedTime.getTime() - now.getTime()) / (1000 * 60));
      return <span className="text-xs text-gray-500">⏱️ {minutesUntilCheckIn}분 후 체크인 가능</span>;
    }
    
    return <span className="text-xs text-orange-600">⭕ 체크인 대기</span>;
  };

  return (
    <>
      <div className="space-y-2">
        {/* 상태 표시 */}
        <div className="flex items-center justify-center">
          {getStatusDisplay()}
        </div>

        {/* 디버그 정보 (개발 환경에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 p-2 bg-gray-100 rounded">
            Debug: isCheckedIn={currentBooking.isCheckedIn.toString()}, 
            checkInTime={currentBooking.checkInTime || 'null'}, 
            canCheckIn={canCheckIn.toString()}, 
            canCheckOut={canCheckOut.toString()}
          </div>
        )}

        {/* 버튼들 */}
        <div className="flex gap-2">
          {canCheckIn && (
            <button
              onClick={() => handleActionClick('checkin')}
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && actionType === 'checkin' ? '처리 중...' : '체크인'}
            </button>
          )}

          {canCheckOut && (
            <>
              <button
                onClick={() => handleActionClick('checkout')}
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && actionType === 'checkout' ? '처리 중...' : '체크아웃'}
              </button>
              
              {/* 🆕 연장 버튼 */}
              <button
                onClick={handleExtendClick}
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                연장
              </button>
            </>
          )}
        </div>

        {/* 메시지 표시 */}
        {message && (
          <div className="text-xs text-center p-2 bg-gray-50 rounded-lg">
            {message}
          </div>
        )}
      </div>

      {/* 🆕 종료 10분 전 알림 모달 */}
      {showPreEndNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-w-md mx-4 border-2 border-orange-500">
            <div className="text-center mb-4">
              <div className="text-2xl mb-2">⏰</div>
              <h3 className="text-lg font-semibold text-orange-600">
                회의 종료 10분 전
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                예약 시간이 10분 후에 종료됩니다.<br/>
                계속 사용하시겠습니까?
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPreEndNotification(false);
                  handleActionClick('checkout');
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                체크아웃
              </button>
              <button
                onClick={() => {
                  setShowPreEndNotification(false);
                  handleExtendClick();
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                연장하기
              </button>
            </div>
            
            <button
              onClick={() => setShowPreEndNotification(false)}
              className="w-full mt-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              나중에
            </button>
          </div>
        </div>
      )}

      {/* 🆕 연장 모달 */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-center">
              예약 연장
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                연장 시간 선택
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setExtendMinutes(30)}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    extendMinutes === 30 
                      ? 'bg-purple-600 text-white border-purple-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  30분
                </button>
                <button
                  onClick={() => setExtendMinutes(60)}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    extendMinutes === 60 
                      ? 'bg-purple-600 text-white border-purple-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  60분
                </button>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사번을 입력해주세요
              </label>
              <input
                type="text"
                value={employeeIdInput}
                onChange={(e) => setEmployeeIdInput(e.target.value)}
                placeholder="7자리 사번 입력"
                maxLength={7}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleExtendRequest();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                예약자 본인의 사번을 입력해주세요
              </p>
              
              {message && (
                <div className="mt-2 text-xs p-2 bg-gray-50 rounded text-center">
                  {message}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleModalClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleExtendRequest}
                disabled={isLoading || !employeeIdInput.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '처리 중...' : '연장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사번 입력 모달 */}
      {showEmployeeIdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-center">
              {actionType === 'checkin' ? '체크인' : '체크아웃'} 확인
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사번을 입력해주세요
              </label>
              <input
                type="text"
                value={employeeIdInput}
                onChange={(e) => setEmployeeIdInput(e.target.value)}
                placeholder="7자리 사번 입력"
                maxLength={7}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleActionConfirm();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                예약자 본인의 사번을 입력해주세요
              </p>
              
              {/* 모달 내 메시지 표시 */}
              {message && (
                <div className="mt-2 text-xs p-2 bg-gray-50 rounded text-center">
                  {message}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleModalClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleActionConfirm}
                disabled={isLoading || !employeeIdInput.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 