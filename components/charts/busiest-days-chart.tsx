'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface BusiestDaysChartProps {
  data: Array<{
    day: number
    dayName: string
    count: number
    percentage: number
  }>
}

export default function BusiestDaysChart({ data }: BusiestDaysChartProps) {
  const maxCount = Math.max(...data.map(item => item.count))
  const busiestDay = data.find(item => item.count === maxCount)

  const chartData = {
    labels: data.map(item => item.dayName),
    datasets: [
      {
        label: 'Contributions',
        data: data.map(item => item.count),
        backgroundColor: data.map(item => 
          item.count === maxCount 
            ? 'rgba(139, 92, 246, 0.8)' // Highlight busiest day in violet
            : 'rgba(139, 92, 246, 0.3)'
        ),
        borderColor: data.map(item => 
          item.count === maxCount 
            ? 'rgba(139, 92, 246, 1)' 
            : 'rgba(139, 92, 246, 0.5)'
        ),
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            return `Day: ${context[0].label}`
          },
          label: (context: any) => {
            const item = data[context.dataIndex]
            return `Contributions: ${context.parsed.y} (${item.percentage}%)`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Day of Week',
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
        ticks: {
          color: '#6B7280',
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Number of Contributions',
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
        ticks: {
          color: '#6B7280',
          beginAtZero: true,
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
      },
    },
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-3">
          <div className="text-sm font-medium text-violet-800 dark:text-violet-200">Busiest Day</div>
          <div className="text-lg font-bold text-violet-900 dark:text-violet-100">
            {busiestDay?.dayName || 'N/A'}
          </div>
          <div className="text-sm text-violet-600 dark:text-violet-300">
            {busiestDay?.count || 0} contributions ({busiestDay?.percentage || 0}%)
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Weekend Activity</div>
          <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
            {data.slice(0, 2).reduce((sum, item) => sum + item.count, 0) + data.slice(-1)[0].count}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-300">
            {Math.round(((data.slice(0, 2).reduce((sum, item) => sum + item.count, 0) + data.slice(-1)[0].count) / data.reduce((sum, item) => sum + item.count, 0)) * 100)}% of total
          </div>
        </div>
      </div>

      {/* Day-by-day breakdown */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-800 dark:text-gray-200">Activity by Day</h4>
        {data.map((item) => (
          <div key={item.day} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="font-medium text-gray-800 dark:text-gray-200">{item.dayName}</span>
            <div className="flex items-center space-x-3">
              <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-violet-500 h-2 rounded-full" 
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-8 text-right">
                {item.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
