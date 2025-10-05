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

interface TimeOfDayChartProps {
  data: {
    hourlyData: Array<{
      hour: number
      count: number
      label: string
    }>
    peakHour: number
    totalActivity: number
  }
}

export default function TimeOfDayChart({ data }: TimeOfDayChartProps) {
  const chartData = {
    labels: data.hourlyData.map(item => item.label),
    datasets: [
      {
        label: 'Contributions',
        data: data.hourlyData.map(item => item.count),
        backgroundColor: data.hourlyData.map((_, index) => 
          index === data.peakHour 
            ? 'rgba(139, 92, 246, 0.8)' // Highlight peak hour in violet
            : 'rgba(139, 92, 246, 0.3)'
        ),
        borderColor: data.hourlyData.map((_, index) => 
          index === data.peakHour 
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
            return `Hour: ${context[0].label}`
          },
          label: (context: any) => {
            return `Contributions: ${context.parsed.y}`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Hour of Day (UTC)',
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
        ticks: {
          color: '#6B7280',
          maxTicksLimit: 12,
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-3">
          <div className="text-sm font-medium text-violet-800 dark:text-violet-200">Peak Activity</div>
          <div className="text-lg font-bold text-violet-900 dark:text-violet-100">
            {data.hourlyData[data.peakHour]?.label || 'N/A'}
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Activity</div>
          <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
            {data.totalActivity.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="text-sm font-medium text-green-800 dark:text-green-200">Avg per Hour</div>
          <div className="text-lg font-bold text-green-900 dark:text-green-100">
            {Math.round(data.totalActivity / 24)}
          </div>
        </div>
      </div>
    </div>
  )
}

