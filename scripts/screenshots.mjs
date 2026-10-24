// Captures genuine screenshots of the running prototype and doubles as a browser smoke test.
//
//   npm run build
//   npm run screenshots            # starts `vite preview` itself
//   BASE_URL=https://your-site npm run screenshots   # or point at a deployed copy
//
// Output: public/screenshots/*.png and public/screenshots/manifest.json
// (the Phase 3 page reads the manifest, so only images that were really captured are shown).
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'screenshots')
mkdirSync(outDir, { recursive: true })

let base = process.env.BASE_URL
let server
if (!base) {
  base = 'http://localhost:4199'
  server = spawn('npx', ['vite', 'preview', '--port', '4199', '--strictPort'], { cwd: root, stdio: 'ignore' })
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(base)).ok) break } catch { /* wait */ }
    await new Promise((r) => setTimeout(r, 250))
  }
}

const problems = []
const shots = []
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})

async function session(viewport, role) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(`console: ${m.text()}`) })
  if (role) {
    await page.goto(base + '/login')
    await page.getByText(`Continue as ${role}`, { exact: false }).first().click()
    await page.waitForURL(/\/(dashboard|faculty|admin)/)
  }
  return { ctx, page }
}

async function snap(page, file, title, viewport, full = true) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  const vp = page.viewportSize()
  if (full) {
    // Grow the viewport to the page height so sticky sidebars/headers render in place
    // (Playwright's fullPage mode would otherwise stitch them in the wrong position).
    const h = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))
    await page.setViewportSize({ width: vp.width, height: Math.min(Math.max(h, vp.height), 2200) })
    await page.waitForTimeout(250)
  }
  await page.screenshot({ path: path.join(outDir, file) })
  if (full) await page.setViewportSize(vp)
  shots.push({ file, title, viewport })
  console.log('captured', file)
}

const DESK = { width: 1440, height: 900 }
const dv = '1440 × 900 desktop'

// public pages
{
  const { ctx, page } = await session(DESK)
  await page.goto(base + '/'); await snap(page, '01-landing.png', 'Landing page', dv)
  await page.goto(base + '/login'); await snap(page, '02-login.png', 'Login with demo mode', dv, false)
  await ctx.close()
}

// student
{
  const { ctx, page } = await session(DESK, 'Student')
  await snap(page, '03-dashboard.png', 'Student dashboard', dv)
  await page.goto(base + '/study-planner'); await snap(page, '04-study-planner.png', 'AI Study Planner — generated plan', dv)
  await page.goto(base + '/doubts'); await page.waitForSelector('main')
  await page.locator('main button, main a').filter({ hasText: /Bayes|3NF|BCNF|deadlock|Dijkstra|.+\?/ }).first().click().catch(() => {})
  await snap(page, '05-doubts.png', 'Doubt-sharing platform', dv)
  await page.goto(base + '/attendance'); await snap(page, '06-attendance.png', 'Attendance dashboard', dv)
  await page.goto(base + '/lecture-translator')
  await page.getByRole('button', { name: /Start demo lecture/ }).click()
  await page.waitForTimeout(9000)
  await snap(page, '07-lecture-translator.png', 'Lecture translator (demonstration mode)', dv)
  await page.goto(base + '/lost-found'); await snap(page, '08-lost-found.png', 'Lost & found feed', dv)
  await page.goto(base + '/calendar'); await snap(page, '09-calendar.png', 'Timetable & events — month view', dv)
  await ctx.close()
}

// faculty / admin
for (const [role, file, title, route] of [['Faculty', '10-faculty.png', 'Faculty console', '/faculty'], ['Administrator', '11-admin.png', 'Admin console', '/admin']]) {
  const { ctx, page } = await session(DESK, role)
  await page.goto(base + route); await snap(page, file, title, dv)
  await ctx.close()
}

// mobile
{
  const { ctx, page } = await session({ width: 390, height: 844 }, 'Student')
  await snap(page, '12-mobile-dashboard.png', 'Mobile responsive dashboard', '390 × 844 mobile')
  await ctx.close()
}

await browser.close()
server?.kill()
writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), tool: 'Playwright + Chromium', shots }, null, 2))
if (problems.length) { console.log('\nBrowser problems detected:\n' + [...new Set(problems)].join('\n')); process.exitCode = 1 } else console.log('\nNo browser errors detected.')
