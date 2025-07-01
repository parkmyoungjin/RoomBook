'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  employeeId: string;
  name?: string;
  loginTime: string;
}

interface UserContextType {
  user: User | null;
  login: (employeeId: string, name?: string) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // 앱 시작 시 localStorage에서 로그인 정보 복원
  useEffect(() => {
    const savedUser = localStorage.getItem('roombook_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        console.log('✅ 저장된 로그인 정보 복원:', userData.employeeId);
      } catch (error) {
        console.error('저장된 사용자 정보 로드 실패:', error);
        localStorage.removeItem('roombook_user');
      }
    }
  }, []);

  const login = (employeeId: string, name?: string) => {
    const userData: User = {
      employeeId,
      name,
      loginTime: new Date().toISOString()
    };
    
    setUser(userData);
    localStorage.setItem('roombook_user', JSON.stringify(userData));
    
    console.log('✅ 로그인 완료:', employeeId);
  };

  const logout = () => {
    const currentUser = user?.employeeId;
    setUser(null);
    localStorage.removeItem('roombook_user');
    
    // 알림 관련 저장 데이터도 정리 (선택사항)
    const today = new Date().toISOString().split('T')[0];
    const notificationKey = `sentNotifications_${today}`;
    localStorage.removeItem(notificationKey);
    
    console.log('👋 로그아웃 완료:', currentUser);
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        isLoggedIn: !!user 
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 