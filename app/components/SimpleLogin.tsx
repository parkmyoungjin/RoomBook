'use client';

import { useState } from 'react';
import { User, LogIn } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';

interface SimpleLoginProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SimpleLogin({ isOpen, onClose }: SimpleLoginProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [message, setMessage] = useState('');
  
  const { login } = useUser();

  const handleLogin = async () => {
    if (!employeeId.trim()) {
      setMessage('❌ 사번을 입력해주세요.');
      return;
    }

    // 사번 형식 검증 (7자리 숫자)
    const employeeIdRegex = /^\d{7}$/;
    if (!employeeIdRegex.test(employeeId.trim())) {
      setMessage('❌ 사번은 7자리 숫자여야 합니다.');
      return;
    }

    setIsLogging(true);
    setMessage('');

    try {
      // 실제로는 서버에서 사번 확인을 할 수 있지만, 간단하게 구현
      await new Promise(resolve => setTimeout(resolve, 500)); // 로딩 효과
      
      login(employeeId.trim(), name.trim() || undefined);
      
      setMessage('✅ 로그인 완료!');
      setTimeout(() => {
        onClose();
        setEmployeeId('');
        setName('');
        setMessage('');
      }, 1000);
      
    } catch (error) {
      setMessage('❌ 로그인 중 오류가 발생했습니다.');
      console.error('로그인 오류:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const handleClose = () => {
    if (!isLogging) {
      onClose();
      setEmployeeId('');
      setName('');
      setMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">개인 알림 설정</h2>
          <p className="text-sm text-gray-600 mt-2">
            사번을 입력하시면 본인 예약에 대한<br/>
            개인화된 알림을 받을 수 있습니다.
          </p>
        </div>

        <div className="space-y-4">
          {/* 사번 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사번 *
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="7자리 사번 입력"
              maxLength={7}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              disabled={isLogging}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLogging) {
                  handleLogin();
                }
              }}
            />
          </div>

          {/* 이름 입력 (선택사항) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름 (선택사항)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLogging}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLogging) {
                  handleLogin();
                }
              }}
            />
          </div>

          {/* 메시지 */}
          {message && (
            <div className="text-xs text-center p-2 bg-gray-50 rounded-lg">
              {message}
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleClose}
              disabled={isLogging}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleLogin}
              disabled={isLogging || !employeeId.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLogging ? (
                '로그인 중...'
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  로그인
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          💡 이 정보는 기기에만 저장되며 개인 알림 용도로만 사용됩니다.
        </div>
      </div>
    </div>
  );
} 