// app/admin/dashboard/SalesChart.tsx
'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Important for the gradient fill
} from 'chart.js';

// Register the necessary components for Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesChartProps {
  data: { month: string; revenue: number }[];
}

const SalesChart = ({ data }: SalesChartProps) => {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Revenue',
        data: data.map(d => d.revenue),
        fill: true,
        borderColor: '#ef4444', // Red-500
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
          return gradient;
        },
        tension: 0.4, // Makes the line smooth
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#ef4444',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 14,
        },
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b', // Slate-500
        },
      },
      y: {
        grid: {
          color: '#e2e8f0', // Slate-200
        },
        ticks: {
          color: '#64748b', // Slate-500
          callback: function (value: any) {
            return '$' + (value / 1000) + 'k';
          },
        },
      },
    },
  };

  return (
    <div className="h-80 w-full">
      <Line options={options} data={chartData} />
    </div>
  );
};

export default SalesChart;