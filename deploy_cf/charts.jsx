/* Interactive Charts Component using Chart.js */

const { useEffect, useRef } = React;

// Line Chart for PL evolution
function LineChart({ data, title, height = 300 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    
    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: title,
          data: data.values,
          borderColor: DESIGN_TOKENS.colors.primary,
          backgroundColor: DESIGN_TOKENS.colors.primary + '20',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: DESIGN_TOKENS.colors.text,
            titleFont: {
              family: DESIGN_TOKENS.typography.fontFamily.sans,
            },
            bodyFont: {
              family: DESIGN_TOKENS.typography.fontFamily.sans,
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                family: DESIGN_TOKENS.typography.fontFamily.sans,
                size: 12,
              },
              color: DESIGN_TOKENS.colors.textSecondary,
            },
          },
          y: {
            grid: {
              color: DESIGN_TOKENS.colors.border,
            },
            ticks: {
              font: {
                family: DESIGN_TOKENS.typography.fontFamily.sans,
                size: 12,
              },
              color: DESIGN_TOKENS.colors.textSecondary,
              callback: (value) => {
                return new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(value);
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, title]);

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

// Bar Chart for portfolio allocation
function BarChart({ data, title, height = 300 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const colors = [
      DESIGN_TOKENS.colors.primary,
      DESIGN_TOKENS.colors.success,
      DESIGN_TOKENS.colors.warning,
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
    ];

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: title,
          data: data.values,
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: DESIGN_TOKENS.colors.text,
            titleFont: {
              family: DESIGN_TOKENS.typography.fontFamily.sans,
            },
            bodyFont: {
              family: DESIGN_TOKENS.typography.fontFamily.sans,
            },
            callbacks: {
              label: (context) => {
                const value = context.raw;
                return new Intl.NumberFormat('pt-BR', {
                  style: 'percent',
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }).format(value / 100);
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
              font: {
                family: DESIGN_TOKENS.typography.fontFamily.sans,
                size: 12,
              },
              color: DESIGN_TOKENS.colors.textSecondary,
            },
          },
          y: {
            grid: {
              color: DESIGN_TOKENS.colors.border,
            },
            ticks: {
              font: {
                family: DESIGN_TOKENS.typography.fontFamily.sans,
                size: 12,
              },
              color: DESIGN_TOKENS.colors.textSecondary,
              callback: (value) => {
                return value + '%';
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, title]);

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

// Doughnut Chart for status distribution
function DoughnutChart({ data, title, height = 300 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const colors = {
      'LIBERAR': DESIGN_TOKENS.colors.success,
      'LIBERAR COM ALERTA': DESIGN_TOKENS.colors.warning,
      'CORRIGIR': DESIGN_TOKENS.colors.error,
    };

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: data.labels.map(label => colors[label] || DESIGN_TOKENS.colors.secondary),
          borderColor: DESIGN_TOKENS.colors.background,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: DESIGN_TOKENS.typography.fontFamily.sans,
                size: 12,
              },
              color: DESIGN_TOKENS.colors.text,
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: DESIGN_TOKENS.colors.text,
            titleFont: {
              family: DESIGN_TOKENS.typography.fontFamily.sans,
            },
            bodyFont: {
              family: DESIGN_TOKENS.typography.fontFamily.sans,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, title]);

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

// Export components
window.Charts = {
  LineChart,
  BarChart,
  DoughnutChart,
};
