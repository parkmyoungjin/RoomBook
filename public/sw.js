// RoomBook Service Worker
const CACHE_NAME = 'roombook-v1.0.0'
const OFFLINE_URL = '/offline.html'

// 캐시할 리소스 목록
const urlsToCache = [
  '/',
  '/booking/new',
  '/bookings',
  '/manifest.json',
  '/offline.html',
  // CSS 및 JS 파일들은 Next.js가 자동으로 처리
]

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치 중...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 열기 성공')
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        console.log('필수 리소스 캐시 완료')
        // 새 Service Worker 즉시 활성화
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('캐시 추가 실패:', error)
      })
  )
})

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화 중...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 이전 버전 캐시 삭제
            if (cacheName !== CACHE_NAME) {
              console.log('이전 캐시 삭제:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker 활성화 완료')
        // 모든 클라이언트에서 새 Service Worker 즉시 적용
        return self.clients.claim()
      })
  )
})

// 네트워크 요청 인터셉트
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API 요청은 캐시하지 않음 (실시간 데이터 필요)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // API 실패 시 오프라인 응답
          return new Response(
            JSON.stringify({
              success: false,
              error: '오프라인 상태입니다.',
              message: '네트워크 연결을 확인해주세요.',
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        })
    )
    return
  }

  // HTML 페이지 요청 처리
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 성공적인 응답은 캐시에 저장
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone)
              })
          }
          return response
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 조회
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse
              }
              // 캐시에도 없으면 오프라인 페이지
              return caches.match(OFFLINE_URL)
            })
        })
    )
    return
  }

  // 정적 리소스 (이미지, CSS, JS 등) 처리
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request)
          .then((response) => {
            // 성공적인 응답만 캐시에 저장
            if (response.status === 200 && response.type === 'basic') {
              const responseClone = response.clone()
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone)
                })
            }
            return response
          })
          .catch(() => {
            // 이미지 요청 실패 시 기본 이미지 반환
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-family="Arial" font-size="14">이미지 없음</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              )
            }
            
            // 기타 요청 실패
            throw new Error('Network failed and no cache available')
          })
      })
  )
})

// 백그라운드 동기화 (향후 확장 가능)
self.addEventListener('sync', (event) => {
  console.log('백그라운드 동기화:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // 오프라인 중 저장된 데이터를 서버와 동기화
    // 예: 오프라인 중 생성된 예약을 서버에 전송
    console.log('백그라운드 동기화 완료')
  } catch (error) {
    console.error('백그라운드 동기화 실패:', error)
  }
}

// 푸시 알림 처리 (향후 확장 가능)
self.addEventListener('push', (event) => {
  console.log('푸시 알림 수신:', event)
  
  const options = {
    body: '새로운 회의실 예약이 있습니다.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '확인하기',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/icons/xmark.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('RoomBook', options)
  )
})

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭:', event)
  
  event.notification.close()

  if (event.action === 'explore') {
    // 앱으로 이동
    event.waitUntil(
      clients.openWindow('/bookings')
    )
  }
})

// 메시지 처리 (앱과 Service Worker 간 통신)
self.addEventListener('message', (event) => {
  console.log('메시지 수신:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
})

// 에러 처리
self.addEventListener('error', (event) => {
  console.error('Service Worker 에러:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker 처리되지 않은 Promise 거부:', event.reason)
})

console.log(`Service Worker 로드 완료 - ${CACHE_NAME}`) 