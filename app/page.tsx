'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import NotificationSettings from './components/NotificationSettings';
import CalendarBulkManager from './components/CalendarBulkManager';

export default function HomePage() {
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showCalendarManager, setShowCalendarManager] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* iOS 스타일 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-center text-gray-900">
            RoomBook
          </h1>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="space-y-4">
          {/* 환영 메시지 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              환영합니다!
            </h2>
            <p className="text-gray-600 text-sm">
              회의실 예약 시스템에 오신 것을 환영합니다.
            </p>
          </div>

          {/* 빠른 액션 버튼들 */}
          <div className="space-y-3">
            <Link 
              href="/booking/status"
              className="block w-full bg-blue-500 text-white text-center py-4 rounded-xl font-medium shadow-sm active:bg-blue-600 transition-colors"
            >
              예약 하기
            </Link>
            
            <Link 
              href="/reservations"
              className="block w-full bg-white text-blue-500 text-center py-4 rounded-xl font-medium border border-blue-500 shadow-sm active:bg-blue-50 transition-colors"
            >
              예약 현황
            </Link>
          </div>

          {/* 기능 카드들 */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => setShowCalendarManager(true)}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow active:bg-gray-50 text-left"
            >
              <div className="text-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 text-sm">📊</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900">다중 예약</h3>
                <p className="text-xs text-gray-500 mt-1">한번에 예약하러 가기</p>
              </div>
            </button>
            
            <button
              onClick={() => setShowNotificationSettings(true)}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow active:bg-gray-50 text-left"
            >
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 text-sm">🔔</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900">알림 설정</h3>
                <p className="text-xs text-gray-500 mt-1">맞춤 알림 설정</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 알림 설정 모달 */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {/* 스마트 달력 관리자 모달 */}
      <CalendarBulkManager
        isOpen={showCalendarManager}
        onClose={() => setShowCalendarManager(false)}
      />
    </div>
  );
} 