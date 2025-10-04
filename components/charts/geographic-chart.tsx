'use client'

import { Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

interface GeographicChartProps {
  data: Array<{
    region: string
    count: number
    percentage: number
  }>
}

export default function GeographicChart({ data }: GeographicChartProps) {
  const colors = [
    'rgba(139, 92, 246, 0.8)', // Violet
    'rgba(59, 130, 246, 0.8)', // Blue
    'rgba(16, 185, 129, 0.8)', // Green
    'rgba(245, 158, 11, 0.8)', // Amber
  ]

  const chartData = {
    labels: data.map(item => item.region),
    datasets: [
      {
        data: data.map(item => item.count),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color.replace('0.8', '1')),
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#6B7280',
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const item = data[context.dataIndex]
            return `${item.region}: ${item.count} contributions (${item.percentage}%)`
          },
        },
      },
    },
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <Pie data={chartData} options={options} />
      </div>
      
      {/* Detailed Breakdown */}
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.region} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: colors[index] }}
              ></div>
              <span className="font-medium text-gray-800 dark:text-gray-200">{item.region}</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900 dark:text-gray-100">{item.count}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{item.percentage}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
