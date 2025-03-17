import { promises as fs } from 'fs';
import * as path from 'path';

interface Term {
  startDate: string;
  endDate: string;
}

interface Summary {
  username: string;
  results: Array<{
    term: Term;
    createdPR: number;
    createdIssue: number;
    reviewedPR: number;
  }>;
}

async function generateHtml() {
  const jsonPath = path.join(__dirname, '../output/activity-summary.json');
  const data = await fs.readFile(jsonPath, 'utf-8');
  const summary: Summary = JSON.parse(data);
  const { username, results } = summary;

  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Activity Summary for ${username}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
</head>
<body>
  <h1>GitHub Activity Summary for ${username}</h1>
  <canvas id="activityChart" width="800" height="400"></canvas>
  <script>
    const ctx = document.getElementById('activityChart').getContext('2d');
    const labels = ${JSON.stringify(
      results.map((r) => `${r.term.startDate}〜${r.term.endDate}`)
    )};
    const createdPRData = ${JSON.stringify(results.map((r) => r.createdPR))};
    const createdIssueData = ${JSON.stringify(
      results.map((r) => r.createdIssue)
    )};
    const reviewedPRData = ${JSON.stringify(results.map((r) => r.reviewedPR))};
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Created Pull Requests',
            data: createdPRData,
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: false
          },
          {
            label: 'Created Issues',
            data: createdIssueData,
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: false
          },
          {
            label: 'Reviewed Pull Requests',
            data: reviewedPRData,
            borderColor: 'rgba(54, 162, 235, 1)',
            fill: false
          }
        ]
      },
      options: {
        plugins: {
          datalabels: {
            anchor: 'end',
            align: 'end',
            font: { size: 12 },
            formatter: (value) => value.toString()
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Period'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Count'
            },
            beginAtZero: true
          }
        }
      },
      plugins: [
        ChartDataLabels,
      ],
    });
  </script>
</body>
</html>
  `;

  const htmlPath = path.join(__dirname, '../output/index.html');
  await fs.writeFile(htmlPath, htmlContent, 'utf-8');
  console.log("HTML report saved to output/index.html");
}

generateHtml().catch(err => {
  console.error("Error generating HTML:", err);
});
