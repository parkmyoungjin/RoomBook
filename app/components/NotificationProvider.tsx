'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    timestamp: number;
  }>>([]);

  const { user, isLoggedIn } = useUser();

  // localStorage에서 오늘 날짜의 발송된 알림 기록 가져오기
  const getSentNotifications = () => {
    const today = new Date().toISOString().split('T')[0];
    const key = `sentNotifications_${today}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  };

  // 알림 발송 기록하기
  const markNotificationSent = (bookingId: string, type: string) => {
    const today = new Date().toISOString().split('T')[0];
    const key = `sentNotifications_${today}`;
    const sentNotifications = getSentNotifications();
    const notificationKey = `booking${bookingId}_${type}`;
    
    sentNotifications[notificationKey] = true;
    localStorage.setItem(key, JSON.stringify(sentNotifications));
  };

  // 이미 발송된 알림인지 확인
  const isNotificationAlreadySent = (bookingId: string, type: string) => {
    const sentNotifications = getSentNotifications();
    const notificationKey = `booking${bookingId}_${type}`;
    return sentNotifications[notificationKey] === true;
  };

  // 오래된 알림 기록 정리 (3일 이상 된 것들)
  const cleanupOldNotifications = () => {
    const today = new Date();
    const keys = Object.keys(localStorage).filter(key => key.startsWith('sentNotifications_'));
    
    keys.forEach(key => {
      const dateStr = key.replace('sentNotifications_', '');
      const recordDate = new Date(dateStr);
      const daysDiff = (today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 3) {
        localStorage.removeItem(key);
      }
    });
  };

  // 1분마다 예약 확인 (개인화된 알림)
  useEffect(() => {
    // 로그인하지 않았으면 알림 체크 안함
    if (!isLoggedIn || !user) {
      console.log('📱 개인 알림: 로그인 필요');
      return;
    }

    console.log('📱 개인 알림 활성화:', user.employeeId);

    // 컴포넌트 로드 시 오래된 기록 정리
    cleanupOldNotifications();

    const checkBookings = async () => {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const response = await fetch(`/api/reservations?date=${today}&status=confirmed`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const bookings = result.data;
          let myBookingsCount = 0;
          
          bookings.forEach((booking: any) => {
            // 🎯 개인화: 현재 로그인한 사용자의 예약만 알림
            if (booking.employeeId !== user.employeeId) {
              return; // 다른 사람 예약은 건너뛰기
            }

            myBookingsCount++;

            const startTime = new Date(`${booking.date}T${booking.startTime}`);
            const timeDiff = startTime.getTime() - now.getTime();
            const minutesLeft = Math.floor(timeDiff / (1000 * 60));
            
            // 30분 전 알림
            if (minutesLeft === 30) {
              if (!isNotificationAlreadySent(booking.id, '30min')) {
                showNotification(`30분 후 회의 시작: ${booking.title}`);
                markNotificationSent(booking.id, '30min');
              }
            }
            // 10분 전 알림
            else if (minutesLeft === 10) {
              if (!isNotificationAlreadySent(booking.id, '10min')) {
                showNotification(`10분 후 회의 시작: ${booking.title}`);
                markNotificationSent(booking.id, '10min');
              }
            }
            // 시작 알림 (정확히 시작시간에만)
            else if (minutesLeft === 0) {
              if (!isNotificationAlreadySent(booking.id, 'start')) {
                showNotification(`회의가 시작되었습니다: ${booking.title}`);
                markNotificationSent(booking.id, 'start');
              }
            }
          });

          // 디버그 로그
          if (myBookingsCount > 0) {
            console.log(`📅 오늘의 내 예약: ${myBookingsCount}개`);
          }
        }
      } catch (error) {
        console.error('예약 확인 실패:', error);
      }
    };

    // 30초마다 체크 (성능 개선)
    const interval = setInterval(checkBookings, 30000);
    checkBookings(); // 초기 실행

    return () => clearInterval(interval);
  }, [isLoggedIn, user]); // 사용자 로그인 상태 변경 시 재실행

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
                  <p className="text-sm font-medium text-gray-900">개인 알림</p>
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