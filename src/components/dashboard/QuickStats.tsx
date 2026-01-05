"use client";

import { noteAPI } from "@/lib/elasticsearch-client";
import { useQuery } from "@tanstack/react-query";

interface QuickStatsProps {
  userId: string;
}

export default function QuickStats({ userId }: QuickStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", userId],
    queryFn: () => noteAPI.getStats(userId),
    enabled: !!userId,
    staleTime: 60000, // 1 dakika
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">İstatistikler</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 animate-pulse rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-800 mb-4">📊 İstatistikler</h3>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <div>
            <div className="text-2xl font-bold text-blue-700">
              {stats?.totalNotes || 0}
            </div>
            <div className="text-xs text-blue-600">Toplam Not</div>
          </div>
          <div className="text-blue-600 text-2xl">📚</div>
        </div>

        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <div>
            <div className="text-2xl font-bold text-green-700">
              {stats?.activeNotes || 0}
            </div>
            <div className="text-xs text-green-600">Aktif Not</div>
          </div>
          <div className="text-green-600 text-2xl">✅</div>
        </div>

        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
          <div>
            <div className="text-2xl font-bold text-red-700">
              {stats?.expiredNotes || 0}
            </div>
            <div className="text-xs text-red-600">Expire Olan</div>
          </div>
          <div className="text-red-600 text-2xl">⏰</div>
        </div>

        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
          <div>
            <div className="text-2xl font-bold text-purple-700">
              {stats?.avgWordsPerNote?.toFixed(0) || 0}
            </div>
            <div className="text-xs text-purple-600">Ort. Kelime</div>
          </div>
          <div className="text-purple-600 text-2xl">📝</div>
        </div>
      </div>
    </div>
  );
}
