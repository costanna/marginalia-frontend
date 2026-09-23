import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  ChartComponentLike,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

/**
 * Only what the progress screen's three charts need (line, doughnut, horizontal bar), not
 * Chart.js's full `registerables`: kept small because this whole module is only pulled into the
 * bundle when the lazy-loaded /progress route is visited.
 *
 * `Filler` is required for the line chart's `fill: true` area under the curve — without it Chart.js
 * silently skips the fill (and warns in the console) even though the line itself still draws.
 */
export const PROGRESS_CHART_REGISTERABLES: ChartComponentLike[] = [
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  DoughnutController,
  ArcElement,
  BarController,
  BarElement,
  Tooltip,
  Legend,
];
