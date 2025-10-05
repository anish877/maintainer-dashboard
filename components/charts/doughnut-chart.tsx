'use client'

import { useRef, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

import { chartColors } from '@/components/charts/chartjs-config'
import {
  Chart, DoughnutController, ArcElement, TimeScale, Tooltip,
} from 'chart.js'
import type { ChartData } from 'chart.js'
import 'chartjs-adapter-moment'

// Import utilities
import { getCssVariable } from '@/components/utils/utils'

Chart.register(DoughnutController, ArcElement, TimeScale, Tooltip)
Chart.overrides.doughnut.cutout = '80%'

interface DoughnutProps {
  data: ChartData
  width: number
  height: number
}

export default function DoughnutChart({
  data,
  width,
  height
}: DoughnutProps) {

  const [chart, setChart] = useState<Chart | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const legend = useRef<HTMLUListElement>(null)
  const { theme } = useTheme()
  const darkMode = theme === 'dark'
  const { tooltipTitleColor, tooltipBodyColor, tooltipBgColor, tooltipBorderColor } = chartColors 

  // Ensure component is mounted
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {    
    if (!isMounted) return
    
    const ctx = canvas.current
    if (!ctx) return
    
    // Don't create chart if data is empty or invalid
    if (!data || !data.datasets || data.datasets.length === 0 || !data.datasets[0].data || data.datasets[0].data.length === 0) {
      return
    }
    
    // Ensure canvas is in DOM
    if (!ctx.ownerDocument || !ctx.ownerDocument.contains(ctx)) {
      return
    }
    
    const newChart = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        layout: {
          padding: 24,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            titleColor: darkMode ? tooltipTitleColor.dark : tooltipTitleColor.light,
            bodyColor: darkMode ? tooltipBodyColor.dark : tooltipBodyColor.light,
            backgroundColor: darkMode ? tooltipBgColor.dark : tooltipBgColor.light,
            borderColor: darkMode ? tooltipBorderColor.dark : tooltipBorderColor.light,
          },             
        },
        interaction: {
          intersect: false,
          mode: 'nearest',
        },
        animation: {
          duration: 500,
        },
        maintainAspectRatio: false,
        resizeDelay: 200,
        responsive: false, // Disable responsive behavior to prevent resize issues
      },
      plugins: [{
        id: 'htmlLegend',
        afterUpdate(c, args, options) {
          const ul = legend.current
          if (!ul || !c.data || !c.data.labels || !c.data.datasets) return
          
          // Remove old legend items
          while (ul.firstChild) {
            ul.firstChild.remove()
          }
          
          // Create custom legend items from chart data
          const labels = c.data.labels as string[]
          const datasets = c.data.datasets
          
          if (labels.length === 0 || datasets.length === 0) return
          
          labels.forEach((label, index) => {
            const dataset = datasets[0] // Assuming single dataset for doughnut chart
            const backgroundColor = dataset.backgroundColor as string[] | string
            const color = Array.isArray(backgroundColor) ? backgroundColor[index] : backgroundColor
            
            const li = document.createElement('li')
            li.style.margin = '4px'
            
            // Button element
            const button = document.createElement('button')
            button.classList.add('btn-xs', 'bg-white', 'dark:bg-gray-700', 'text-gray-500', 'dark:text-gray-400', 'shadow-sm', 'shadow-black/[0.08]', 'rounded-full')
            button.onclick = () => {
              c.toggleDataVisibility(index)
              c.update()
            }
            
            // Color box
            const box = document.createElement('span')
            box.style.display = 'block'
            box.style.width = '8px'
            box.style.height = '8px'
            box.style.backgroundColor = color
            box.style.borderRadius = '4px'
            box.style.marginRight = '4px'
            box.style.pointerEvents = 'none'
            
            // Label
            const labelElement = document.createElement('span')
            labelElement.style.display = 'flex'
            labelElement.style.alignItems = 'center'
            const labelText = document.createTextNode(label)
            labelElement.appendChild(labelText)
            
            li.appendChild(button)
            button.appendChild(box)
            button.appendChild(labelElement)
            ul.appendChild(li)
          })
        },
      }],
    })
    setChart(newChart)
    return () => {
      if (newChart && !newChart.destroyed) {
        newChart.destroy()
      }
    }
  }, [data, darkMode, isMounted])

  useEffect(() => {
    if (!chart || !isMounted) return

    // Check if chart is still valid and not destroyed
    if (chart.destroyed) return

    try {
      if (darkMode) {
        chart.options.plugins!.tooltip!.titleColor = tooltipTitleColor.dark
        chart.options.plugins!.tooltip!.bodyColor = tooltipBodyColor.dark
        chart.options.plugins!.tooltip!.backgroundColor = tooltipBgColor.dark
        chart.options.plugins!.tooltip!.borderColor = tooltipBorderColor.dark
      } else {
        chart.options.plugins!.tooltip!.titleColor = tooltipTitleColor.light
        chart.options.plugins!.tooltip!.bodyColor = tooltipBodyColor.light
        chart.options.plugins!.tooltip!.backgroundColor = tooltipBgColor.light
        chart.options.plugins!.tooltip!.borderColor = tooltipBorderColor.light
      }
      chart.update('none')
    } catch (error) {
      console.warn('Chart theme update failed:', error)
    }
  }, [theme, chart, isMounted])

  // Update chart data when data prop changes
  useEffect(() => {
    if (!chart || !data || !isMounted) return
    
    // Check if chart is still valid and not destroyed
    if (chart.destroyed) return
    
    // Check if canvas is still in DOM
    const ctx = canvas.current
    if (!ctx || !ctx.ownerDocument || !ctx.ownerDocument.contains(ctx)) {
      return
    }
    
    // Don't update if data is empty or invalid
    if (!data.datasets || data.datasets.length === 0 || !data.datasets[0].data || data.datasets[0].data.length === 0) {
      return
    }
    
    try {
      chart.data = data
      chart.update('none') // Use 'none' to prevent animation issues
    } catch (error) {
      console.warn('Chart update failed:', error)
    }
  }, [chart, data, isMounted])     

  return (
    <div className="grow flex flex-col justify-center">
      <div>
        <canvas ref={canvas} width={width} height={height}></canvas>
      </div>
      <div className="px-5 pt-2 pb-6">
        <ul ref={legend} className="flex flex-wrap justify-center -m-1"></ul>
      </div>
    </div>
  )
}