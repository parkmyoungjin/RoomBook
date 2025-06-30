'use client';

import { useState } from 'react';
import { Booking } from '@/lib/googleSheets';

interface CheckInOutButtonProps {
  booking: Booking;
  onStatusChange?: () => void;
}

export default function CheckInOutButton({ booking, onStatusChange }: CheckInOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 현재 시간과 예약 시간 비교
  const now = new Date();
  const bookingStart = new Date(`${booking.date} ${booking.startTime}`);
  const bookingEnd = new Date(`${booking.date} ${booking.endTime}`);
  const checkInAllowedTime = new Date(bookingStart.getTime() - 15 * 60 * 1000); // 15분 전

  // 버튼 상태 결정
  const canCheckIn = now >= checkInAllowedTime && !booking.isCheckedIn && !booking.isNoShow;
  const canCheckOut = booking.isCheckedIn && !booking.checkOutTime;
  const isExpired = now > bookingEnd;

  const handleCheckIn = async () => {
    if (!canCheckIn) return;

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`/api/reservations/${booking.id}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ 체크인이 완료되었습니다!');
        onStatusChange?.();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ 체크인 중 오류가 발생했습니다.');
      console.error('체크인 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!canCheckOut) return;

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`/api/reservations/${booking.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ 체크아웃이 완료되었습니다!');
        onStatusChange?.();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ 체크아웃 중 오류가 발생했습니다.');
      console.error('체크아웃 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 상태 표시
  const getStatusDisplay = () => {
    if (booking.isNoShow) {
      return <span className="text-xs text-red-600 font-medium">❌ 노쇼</span>;
    }
    
    if (booking.checkOutTime) {
      return (
        <div className="text-xs text-gray-600">
          <div>✅ 사용 완료</div>
          <div>체크아웃: {new Date(booking.checkOutTime).toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</div>
        </div>
      );
    }
    
    if (booking.isCheckedIn) {
      return (
        <div className="text-xs text-green-600">
          <div>🟢 사용 중</div>
          <div>체크인: {booking.checkInTime ? new Date(booking.checkInTime).toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : ''}</div>
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
    <div className="space-y-2">
      {/* 상태 표시 */}
      <div className="flex items-center justify-center">
        {getStatusDisplay()}
      </div>

      {/* 버튼들 */}
      <div className="flex gap-2">
        {canCheckIn && (
          <button
            onClick={handleCheckIn}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '처리 중...' : '체크인'}
          </button>
        )}

        {canCheckOut && (
          <button
            onClick={handleCheckOut}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '처리 중...' : '체크아웃'}
          </button>
        )}
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div className="text-xs text-center p-2 bg-gray-50 rounded-lg">
          {message}
        </div>
      )}
    </div>
  );
} 