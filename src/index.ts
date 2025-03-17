import * as puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import * as path from 'path';

interface Term {
  startDate: string;
  endDate: string;
}

interface Config {
  githubUrl: string;
  terms: Term[];
}

async function readConfig(): Promise<Config> {
  const configPath = path.join(__dirname, '../config.json');
  const data = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(data) as Config;
}

async function getUsername(page: puppeteer.Page): Promise<string> {
  try {
    await page.waitForSelector('meta[name="user-login"]', { timeout: 30000 });
    const username = await page.$eval('meta[name="user-login"]', (el: Element) => el.getAttribute('content'));
    if (!username) throw new Error("Username not found");
    return username;
  } catch (error) {
    throw new Error("Failed to retrieve username. Ensure you are logged into GitHub.");
  }
}
async function extractCount(page: puppeteer.Page): Promise<number> {
  // First attempt: use h2#search-results-count if available
  try {
    await page.waitForSelector('h2#search-results-count', { timeout: 5000 });
    const countText = await page.$eval('h2#search-results-count', (el: Element) => el.textContent || '');
    console.log("Extracted count from h2#search-results-count: " + countText);
    let match = countText.match(/([\d,]+)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
  } catch (error) {
    console.log("h2#search-results-count not found, falling back to summary extraction.");
  }

  // Fallback: extract from summary text in h3 or span.text-bold
  try {
    await page.waitForSelector('h3, span.text-bold', { timeout: 10000 });
    const text = await page.$eval('h3, span.text-bold', (el: Element) => el.textContent || '');
    console.log("Extracted summary text: " + text);
    let match = text.match(/of\s+([\d,]+)/i);
    if (!match) {
      match = text.match(/([\d,]+)\s+result/i);
    }
    if (!match) {
      match = text.match(/^([\d,]+)$/);
    }
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    } else {
      await page.waitForTimeout(5000);
      const fallbackCount = await page.$$eval('[data-testid="search-result"]', els => els.length);
      console.log("Fallback count (search result items): " + fallbackCount);
      return fallbackCount;
    }
  } catch (error) {
    console.error("Error extracting count from summary text", error);
  }
  const items = await page.$$('[data-testid="search-result"]');
  return items.length;
}

async function scrapeData(page: puppeteer.Page, url: string): Promise<number> {
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitForTimeout(3000);
  return extractCount(page);
}

async function main() {
  const config = await readConfig();
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  const cookiePath = path.join(__dirname, '../cookies.json');
  try {
    await fs.access(cookiePath);
    const cookiesString = await fs.readFile(cookiePath, 'utf-8');
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log("Loaded cookies from cookies.json");
  } catch (error) {
    console.log("No cookies found, proceeding without them.");
  }
  await page.goto(config.githubUrl, { waitUntil: 'networkidle2' });
  let username;
  try {
    username = await getUsername(page);
  } catch (error) {
    console.log("No valid session. Please login manually. Then press Enter.");
    await new Promise<void>(resolve => {
      process.stdin.once('data', () => resolve());
    });
    username = await getUsername(page);
    const cookies = await page.cookies();
    await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8');
    console.log("Cookies saved to cookies.json");
  }
  console.log("Logged in as:", username);

  const results: Array<{ term: Term; createdPR: number; createdIssue: number; reviewedPR: number; }> = [];

  for (const term of config.terms) {
    const termResult: { createdPR: number; createdIssue: number; reviewedPR: number; } = {
      createdPR: 0,
      createdIssue: 0,
      reviewedPR: 0
    };

    const createdPRQuery = `is:pr author:${username} created:${term.startDate}..${term.endDate}`;
    const createdIssueQuery = `is:issue author:${username} created:${term.startDate}..${term.endDate}`;
    const reviewedPRQuery = `is:pr reviewed-by:${username} created:${term.startDate}..${term.endDate}`;

    const baseSearchUrl = `${config.githubUrl}search?q=`;
    const prUrl = `${baseSearchUrl}${encodeURIComponent(createdPRQuery)}&type=PullRequests`;
    const issueUrl = `${baseSearchUrl}${encodeURIComponent(createdIssueQuery)}&type=Issues`;
    const reviewedUrl = `${baseSearchUrl}${encodeURIComponent(reviewedPRQuery)}&type=PullRequests`;

    console.log(`Scraping data for period ${term.startDate} to ${term.endDate}`);
    termResult.createdPR = await scrapeData(page, prUrl);
    console.log(`Created PR count: ${termResult.createdPR}`);

    termResult.createdIssue = await scrapeData(page, issueUrl);
    console.log(`Created Issue count: ${termResult.createdIssue}`);

    termResult.reviewedPR = await scrapeData(page, reviewedUrl);
    console.log(`Reviewed PR count: ${termResult.reviewedPR}`);

    results.push({ term, ...termResult });
  }

  const summaryData = { username, results };
  const outputDir = path.join(__dirname, '../output');
  await fs.mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'activity-summary.json');
  await fs.writeFile(jsonPath, JSON.stringify(summaryData, null, 2), 'utf-8');
  console.log("Scraped summary data saved to output/activity-summary.json");
  await browser.close();
}

main().catch(err => {
  console.error("Error in scraping:", err);
});

