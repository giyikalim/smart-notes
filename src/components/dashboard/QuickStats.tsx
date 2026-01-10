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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          İstatistikler
        </h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      id: "total",
      title: "Toplam Not",
      value: stats?.totalNotes || 0,
      icon: "📚",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      textColor: "text-blue-700 dark:text-blue-400",
      iconColor: "text-blue-600 dark:text-blue-300",
    },
    {
      id: "active",
      title: "Aktif Not",
      value: stats?.activeNotes || 0,
      icon: "✅",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      textColor: "text-green-700 dark:text-green-400",
      iconColor: "text-green-600 dark:text-green-300",
    },
    {
      id: "expired",
      title: "Expire Olan",
      value: stats?.expiredNotes || 0,
      icon: "⏰",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      textColor: "text-red-700 dark:text-red-400",
      iconColor: "text-red-600 dark:text-red-300",
    },
    {
      id: "avgWords",
      title: "Ort. Kelime",
      value: stats?.avgWordsPerNote?.toFixed(0) || 0,
      icon: "📝",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      textColor: "text-purple-700 dark:text-purple-400",
      iconColor: "text-purple-600 dark:text-purple-300",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/30 p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
        📊 İstatistikler
      </h3>

      <div className="space-y-4">
        {statCards.map((card) => (
          <div
            key={card.id}
            className={`flex justify-between items-center p-3 ${card.bgColor} rounded-lg border border-transparent dark:border-opacity-20 hover:border-opacity-30 transition-all`}
          >
            <div>
              <div className={`text-2xl font-bold ${card.textColor}`}>
                {card.value}
              </div>
              <div className={`text-xs ${card.textColor} opacity-80`}>
                {card.title}
              </div>
            </div>
            <div className={`text-2xl ${card.iconColor}`}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Last Updated Info */}
      {stats?.lastUpdated && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Son güncelleme:{" "}
            {new Date(stats.lastUpdated).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
