'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, X, TestTube } from 'lucide-react';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationSetting {
  enabled: boolean;
  time: string; // HH:MM 형식
  days: string[]; // ['monday', 'tuesday', ...]
  type: 'daily' | 'beforeMeeting';
  beforeMinutes?: number; // 회의 전 몇 분 전에 알림
}

export default function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSetting>({
    enabled: false,
    time: '09:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    type: 'daily',
    beforeMinutes: 10
  });

  const [hasPermission, setHasPermission] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);

  const days = [
    { key: 'monday', label: '월' },
    { key: 'tuesday', label: '화' },
    { key: 'wednesday', label: '수' },
    { key: 'thursday', label: '목' },
    { key: 'friday', label: '금' },
    { key: 'saturday', label: '토' },
    { key: 'sunday', label: '일' },
  ];

  useEffect(() => {
    // 로컬스토리지에서 설정 로드
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // 알림 권한 확인
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  useEffect(() => {
    // 설정 변경 시 로컬스토리지에 저장
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setHasPermission(permission === 'granted');
      
      if (permission === 'granted') {
        // 테스트 알림
        new Notification('RoomBook 알림', {
          body: '알림이 활성화되었습니다!',
          icon: '/icons/icon-192.png'
        });
      }
    }
  };

  const sendTestNotification = async () => {
    setTestingNotification(true);
    
    try {
      if (!hasPermission) {
        const permission = await Notification.requestPermission();
        setHasPermission(permission === 'granted');
        
        if (permission !== 'granted') {
          alert('알림 권한이 필요합니다.');
          setTestingNotification(false);
          return;
        }
      }

      // 테스트 알림 메시지들
      const testMessages = [
        '🔔 테스트 알림입니다!',
        '📅 오늘 오후 2시에 회의가 있습니다.',
        '⏰ 10분 후 회의가 시작됩니다.',
        '🏢 A회의실에서 프로젝트 미팅이 예정되어 있습니다.',
        '✅ 알림 설정이 정상적으로 작동합니다!'
      ];

      const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];

      // 브라우저 알림
      new Notification('RoomBook 테스트 알림', {
        body: randomMessage,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'test-notification',
        requireInteraction: false,
        silent: false
      });

      // 성공 메시지
      setTimeout(() => {
        alert('✅ 테스트 알림이 전송되었습니다!');
        setTestingNotification(false);
      }, 500);

    } catch (error) {
      console.error('테스트 알림 전송 실패:', error);
      alert('❌ 테스트 알림 전송에 실패했습니다.');
      setTestingNotification(false);
    }
  };

  const toggleEnabled = () => {
    if (!settings.enabled && !hasPermission) {
      requestPermission();
    }
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const updateTime = (time: string) => {
    setSettings(prev => ({ ...prev, time }));
  };

  const toggleDay = (day: string) => {
    setSettings(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const updateType = (type: 'daily' | 'beforeMeeting') => {
    setSettings(prev => ({ ...prev, type }));
  };

  const updateBeforeMinutes = (minutes: number) => {
    setSettings(prev => ({ ...prev, beforeMinutes: minutes }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">알림 설정</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 알림 활성화 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-blue-500" />
              <span className="text-gray-900 font-medium">알림 활성화</span>
            </div>
            <button
              onClick={toggleEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {!hasPermission && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                알림을 받으려면 브라우저 알림 권한을 허용해주세요.
              </p>
            </div>
          )}

          {/* 테스트 알림 버튼 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <TestTube className="w-5 h-5 text-purple-500" />
                <div>
                  <span className="text-gray-900 font-medium">알림 테스트</span>
                  <p className="text-sm text-gray-500">알림이 정상 작동하는지 확인</p>
                </div>
              </div>
              <button
                onClick={sendTestNotification}
                disabled={testingNotification}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  testingNotification
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {testingNotification ? '전송 중...' : '테스트'}
              </button>
            </div>
          </div>

          {settings.enabled && (
            <>
              {/* 알림 유형 */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900">알림 유형</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="notificationType"
                      checked={settings.type === 'daily'}
                      onChange={() => updateType('daily')}
                      className="w-4 h-4 text-blue-500"
                    />
                    <div>
                      <span className="text-gray-900 font-medium">매일 정해진 시간</span>
                      <p className="text-sm text-gray-500">오늘의 회의 일정을 알려드립니다</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="notificationType"
                      checked={settings.type === 'beforeMeeting'}
                      onChange={() => updateType('beforeMeeting')}
                      className="w-4 h-4 text-blue-500"
                    />
                    <div>
                      <span className="text-gray-900 font-medium">회의 시작 전</span>
                      <p className="text-sm text-gray-500">회의 시작 몇 분 전에 알려드립니다</p>
                    </div>
                  </label>
                </div>
              </div>

              {settings.type === 'daily' && (
                <>
                  {/* 시간 설정 */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900">알림 시간</h3>
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <input
                        type="time"
                        value={settings.time}
                        onChange={(e) => updateTime(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* 요일 설정 */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900">알림 요일</h3>
                    <div className="grid grid-cols-7 gap-2">
                      {days.map(day => (
                        <button
                          key={day.key}
                          onClick={() => toggleDay(day.key)}
                          className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                            settings.days.includes(day.key)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {settings.type === 'beforeMeeting' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900">알림 시점</h3>
                  <div className="space-y-2">
                    {[5, 10, 15, 30].map(minutes => (
                      <label key={minutes} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="beforeMinutes"
                          checked={settings.beforeMinutes === minutes}
                          onChange={() => updateBeforeMinutes(minutes)}
                          className="w-4 h-4 text-blue-500"
                        />
                        <span className="text-gray-900">{minutes}분 전</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 저장 버튼 */}
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            설정 완료
          </button>
        </div>
      </div>
    </div>
  );
} 