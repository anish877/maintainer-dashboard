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

interface ResponseTimeChartProps {
  data: {
    issues: {
      averageResponseTime: number
      respondedCount: number
      totalCount: number
      responseRate: number
    }
    pullRequests: {
      averageResponseTime: number
      respondedCount: number
      totalCount: number
      responseRate: number
    }
  }
}

export default function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  const chartData = {
    labels: ['Issues', 'Pull Requests'],
    datasets: [
      {
        label: 'Average Response Time (hours)',
        data: [data.issues.averageResponseTime, data.pullRequests.averageResponseTime],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // Blue for issues
          'rgba(139, 92, 246, 0.8)', // Violet for PRs
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(139, 92, 246, 1)',
        ],
        borderWidth: 2,
      },
      {
        label: 'Response Rate (%)',
        data: [data.issues.responseRate, data.pullRequests.responseRate],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Green for response rate
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(16, 185, 129, 1)',
        ],
        borderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              return `Response Time: ${context.parsed.y} hours`
            } else {
              return `Response Rate: ${context.parsed.y}%`
            }
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Type',
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Response Time (hours)',
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
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Response Rate (%)',
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
        ticks: {
          color: '#6B7280',
          beginAtZero: true,
          max: 100,
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
      
      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Issues Metrics */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">Issues</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">Total Issues:</span>
              <span className="font-bold text-blue-900 dark:text-blue-100">{data.issues.totalCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">Responded:</span>
              <span className="font-bold text-blue-900 dark:text-blue-100">{data.issues.respondedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">Response Rate:</span>
              <span className="font-bold text-blue-900 dark:text-blue-100">{data.issues.responseRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">Avg Response Time:</span>
              <span className="font-bold text-blue-900 dark:text-blue-100">{data.issues.averageResponseTime}h</span>
            </div>
          </div>
        </div>

        {/* Pull Requests Metrics */}
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
          <h4 className="font-medium text-violet-800 dark:text-violet-200 mb-3">Pull Requests</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-violet-700 dark:text-violet-300">Total PRs:</span>
              <span className="font-bold text-violet-900 dark:text-violet-100">{data.pullRequests.totalCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-violet-700 dark:text-violet-300">Responded:</span>
              <span className="font-bold text-violet-900 dark:text-violet-100">{data.pullRequests.respondedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-violet-700 dark:text-violet-300">Response Rate:</span>
              <span className="font-bold text-violet-900 dark:text-violet-100">{data.pullRequests.responseRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-violet-700 dark:text-violet-300">Avg Response Time:</span>
              <span className="font-bold text-violet-900 dark:text-violet-100">{data.pullRequests.averageResponseTime}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-3 rounded-lg border ${
          data.issues.averageResponseTime < 24 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : data.issues.averageResponseTime < 72
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className={`text-sm font-medium ${
            data.issues.averageResponseTime < 24 
              ? 'text-green-800 dark:text-green-200' 
              : data.issues.averageResponseTime < 72
              ? 'text-yellow-800 dark:text-yellow-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            Issue Response Performance
          </div>
          <div className={`text-lg font-bold ${
            data.issues.averageResponseTime < 24 
              ? 'text-green-900 dark:text-green-100' 
              : data.issues.averageResponseTime < 72
              ? 'text-yellow-900 dark:text-yellow-100'
              : 'text-red-900 dark:text-red-100'
          }`}>
            {data.issues.averageResponseTime < 24 ? 'Excellent' : data.issues.averageResponseTime < 72 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${
          data.pullRequests.averageResponseTime < 48 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : data.pullRequests.averageResponseTime < 120
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className={`text-sm font-medium ${
            data.pullRequests.averageResponseTime < 48 
              ? 'text-green-800 dark:text-green-200' 
              : data.pullRequests.averageResponseTime < 120
              ? 'text-yellow-800 dark:text-yellow-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            PR Response Performance
          </div>
          <div className={`text-lg font-bold ${
            data.pullRequests.averageResponseTime < 48 
              ? 'text-green-900 dark:text-green-100' 
              : data.pullRequests.averageResponseTime < 120
              ? 'text-yellow-900 dark:text-yellow-100'
              : 'text-red-900 dark:text-red-100'
          }`}>
            {data.pullRequests.averageResponseTime < 48 ? 'Excellent' : data.pullRequests.averageResponseTime < 120 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${
          (data.issues.responseRate + data.pullRequests.responseRate) / 2 > 80 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : (data.issues.responseRate + data.pullRequests.responseRate) / 2 > 60
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className={`text-sm font-medium ${
            (data.issues.responseRate + data.pullRequests.responseRate) / 2 > 80 
              ? 'text-green-800 dark:text-green-200' 
              : (data.issues.responseRate + data.pullRequests.responseRate) / 2 > 60
              ? 'text-yellow-800 dark:text-yellow-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            Overall Engagement
          </div>
          <div className={`text-lg font-bold ${
            (data.issues.responseRate + data.pullRequests.responseRate) / 2 > 80 
              ? 'text-green-900 dark:text-green-100' 
              : (data.issues.responseRate + data.pullRequests.responseRate) / 2 > 60
              ? 'text-yellow-900 dark:text-yellow-100'
              : 'text-red-900 dark:text-red-100'
          }`}>
            {Math.round((data.issues.responseRate + data.pullRequests.responseRate) / 2)}%
          </div>
        </div>
      </div>
    </div>
  )
}
