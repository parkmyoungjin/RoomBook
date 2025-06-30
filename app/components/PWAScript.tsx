'use client';

import { useEffect } from 'react';

export default function PWAScript() {
  useEffect(() => {
    // PWA 설치 프롬프트 처리
    let deferredPrompt: any;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      // 사용자 정의 설치 버튼 표시 로직 추가 가능
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
    };

    // Service Worker 등록
    const registerServiceWorker = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      }
    };

    // iOS Safari 스크롤 바운스 방지
    const preventScrollBounce = (event: TouchEvent) => {
      if ((event as any).scale !== 1) { 
        event.preventDefault(); 
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('load', registerServiceWorker);
    document.addEventListener('touchmove', preventScrollBounce, { passive: false });

    // 클린업
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('load', registerServiceWorker);
      document.removeEventListener('touchmove', preventScrollBounce);
    };
  }, []);

  return null; // 렌더링할 요소 없음
}
