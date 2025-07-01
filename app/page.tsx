'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, User, Lock } from 'lucide-react';
import NotificationSettings from './components/NotificationSettings';
import RoomInfo from './components/RoomInfo';

import SimpleLogin from './components/SimpleLogin';
import { useUser } from './contexts/UserContext';

export default function HomePage() {
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  
  const { user, logout, isLoggedIn } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  // 로그인이 필요한 기능에 대한 가드 함수
  const requireLogin = (action: () => void, feature: string = '이 기능') => {
    if (!isLoggedIn) {
      alert(`🔒 ${feature}을 사용하려면 로그인이 필요합니다.`);
      setShowLogin(true);
      return;
    }
    action();
  };

  // 로그인이 필요한 페이지 이동
  const navigateWithAuth = (path: string, feature: string) => {
    requireLogin(() => router.push(path), feature);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* iOS 스타일 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            RoomBook
          </h1>
          
          {/* 로그인/로그아웃 버튼 */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600">
                  {user?.name || user?.employeeId}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <LogIn className="w-3 h-3" />
                로그인
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 사용자 상태 표시 */}
        {isLoggedIn && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <div className="text-sm">
                <div className="font-medium text-blue-900">
                  개인 알림 활성화됨
                </div>
                <div className="text-blue-700">
                  {user?.name ? `${user.name} (${user.employeeId})` : user?.employeeId}님의 예약 알림을 받습니다
                </div>
              </div>
            </div>
          </div>
        )}
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
            <button 
              onClick={() => navigateWithAuth('/booking/status', '예약 하기')}
              className="block w-full bg-blue-500 text-white text-center py-4 rounded-xl font-medium shadow-sm active:bg-blue-600 transition-colors"
            >
              {!isLoggedIn && <Lock className="w-4 h-4 inline mr-2" />}
              예약 하기
            </button>
            
            <button 
              onClick={() => navigateWithAuth('/reservations', '예약 현황')}
              className="block w-full bg-white text-blue-500 text-center py-4 rounded-xl font-medium border border-blue-500 shadow-sm active:bg-blue-50 transition-colors"
            >
              {!isLoggedIn && <Lock className="w-4 h-4 inline mr-2" />}
              예약 현황
            </button>
          </div>

          {/* 기능 카드들 */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => setShowRoomInfo(true)}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow active:bg-gray-50 text-left"
            >
              <div className="text-center">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-orange-600 text-sm">🏢</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900">회의실 정보</h3>
                <p className="text-xs text-gray-500 mt-1">시설 및 위치 안내</p>
              </div>
            </button>
            
            <button
              onClick={() => requireLogin(() => setShowNotificationSettings(true), '알림 설정')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow active:bg-gray-50 text-left relative"
            >
              {!isLoggedIn && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-3 h-3 text-gray-400" />
                </div>
              )}
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

      {/* 모달들 */}
      <SimpleLogin
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
      />
      
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      <RoomInfo
        isOpen={showRoomInfo}
        onClose={() => setShowRoomInfo(false)}
      />

    </div>
  );
} 