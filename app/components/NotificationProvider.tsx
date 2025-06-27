'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    timestamp: number;
  }>>([]);

  // 30분마다 예약 확인
  useEffect(() => {
    const checkBookings = async () => {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const response = await fetch(`/api/bookings?date=${today}&status=confirmed`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const bookings = result.data;
          
          bookings.forEach((booking: any) => {
            const startTime = new Date(`${booking.date}T${booking.startTime}`);
            const timeDiff = startTime.getTime() - now.getTime();
            const minutesLeft = Math.floor(timeDiff / (1000 * 60));
            
            // 30분 전 알림
            if (minutesLeft === 30) {
              showNotification(`30분 후 회의 시작: ${booking.title}`);
            }
            // 10분 전 알림
            else if (minutesLeft === 10) {
              showNotification(`10분 후 회의 시작: ${booking.title}`);
            }
            // 시작 알림
            else if (minutesLeft <= 0 && minutesLeft > -5) {
              showNotification(`회의가 시작되었습니다: ${booking.title}`);
            }
          });
        }
      } catch (error) {
        console.error('예약 확인 실패:', error);
      }
    };

    // 1분마다 체크
    const interval = setInterval(checkBookings, 60000);
    checkBookings(); // 초기 실행

    return () => clearInterval(interval);
  }, []);

  const showNotification = (message: string) => {
    const notification = {
      id: Date.now().toString(),
      message,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, notification]);

    // 브라우저 알림
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('RoomBook 알림', {
        body: message,
        icon: '/icons/icon-192.png'
      });
    }

    // 8초 후 자동 삭제
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 8000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // 알림 권한 요청
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <>
      {children}
      
      {/* 알림 표시 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in-right"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">예약 알림</p>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                </div>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
} 