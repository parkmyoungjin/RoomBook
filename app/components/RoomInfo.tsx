'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Users, Monitor, Wifi, Projector, Mic, Coffee } from 'lucide-react';

interface RoomInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: string[];
  status: 'active' | 'inactive';
}

export default function RoomInfo({ isOpen, onClose }: RoomInfoProps) {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen]);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.data);
      } else {
        setError(data.error || '회의실 정보를 가져올 수 없습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getEquipmentIcon = (equipment: string) => {
    const normalized = equipment.toLowerCase();
    if (normalized.includes('프로젝터') || normalized.includes('projector')) {
      return <Projector className="w-4 h-4" />;
    }
    if (normalized.includes('모니터') || normalized.includes('monitor') || normalized.includes('tv')) {
      return <Monitor className="w-4 h-4" />;
    }
    if (normalized.includes('마이크') || normalized.includes('mic') || normalized.includes('음향')) {
      return <Mic className="w-4 h-4" />;
    }
    if (normalized.includes('와이파이') || normalized.includes('wifi')) {
      return <Wifi className="w-4 h-4" />;
    }
    if (normalized.includes('커피') || normalized.includes('coffee') || normalized.includes('다과')) {
      return <Coffee className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />; // 기본 아이콘
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">회의실 정보</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={fetchRooms}
                className="mt-2 text-sm text-red-600 underline"
              >
                다시 시도
              </button>
            </div>
          )}

          {!loading && !error && rooms.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">등록된 회의실이 없습니다.</p>
            </div>
          )}

          {!loading && !error && rooms.length > 0 && (
            <div className="space-y-4">
              {rooms
                .filter(room => room.status === 'active')
                .map((room) => (
                  <div
                    key={room.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                  >
                    {/* 회의실 이름 */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {room.name}
                      </h3>
                      <div className="flex items-center text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                        <span className="text-xs font-medium">활성</span>
                      </div>
                    </div>

                    {/* 위치 정보 */}
                    <div className="flex items-center mb-3">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700">{room.location}</span>
                    </div>

                    {/* 수용인원 */}
                    <div className="flex items-center mb-4">
                      <Users className="w-4 h-4 text-blue-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        최대 <span className="font-semibold text-blue-600">{room.capacity}명</span>
                      </span>
                    </div>

                    {/* 구비장비 */}
                    {room.equipment && room.equipment.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">구비장비</h4>
                        <div className="flex flex-wrap gap-2">
                          {room.equipment.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-white px-3 py-1 rounded-lg border border-gray-200"
                            >
                              <div className="text-gray-600 mr-1">
                                {getEquipmentIcon(item)}
                              </div>
                              <span className="text-xs text-gray-700">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {/* 안내 메시지 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-800">
                  💡 <strong>회의실 선택 팁:</strong>
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                  <li>• 참석자 수에 맞는 수용인원을 확인하세요</li>
                  <li>• 필요한 장비가 구비되어 있는지 확인하세요</li>
                  <li>• 위치를 고려하여 접근하기 편한 곳을 선택하세요</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 