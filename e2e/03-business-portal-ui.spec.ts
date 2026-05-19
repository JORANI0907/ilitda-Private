/**
 * 사업자 포털 UI 테스트 (미인증 상태)
 * - 각 페이지 렌더링 확인 (스켈레톤 UI → 데이터 또는 로그인 리다이렉트)
 * - 미인증 상태에서의 UI 동작 검증
 */

import { test, expect } from '@playwright/test'

const BASE = 'https://ilitda.vercel.app'

test.describe('사업자 포털 페이지 UI (미인증)', () => {
  test('/business/home - 페이지 접근 동작 확인', async ({ page }) => {
    await page.goto(`${BASE}/business/home`, { waitUntil: 'domcontentloaded' })

    await page.waitForTimeout(3000) // 리다이렉트 또는 렌더링 대기
    const url = page.url()
    console.log('[business/home] 최종 URL:', url)

    await page.screenshot({ path: 'e2e/screenshots/03-business-home.png', fullPage: true })

    // 로그인 페이지로 리다이렉트 되거나, 로딩 스켈레톤 또는 에러 없이 렌더링되어야 함
    const isLoginPage = url.includes('/login')
    const isHomePage = url.includes('/business/home')

    expect(isLoginPage || isHomePage, '로그인 페이지 또는 홈 페이지여야 함').toBe(true)

    if (isLoginPage) {
      await expect(page.getByText('일잇다')).toBeVisible()
      console.log('[business/home] → 로그인 페이지로 리다이렉트 (정상)')
    }

    if (isHomePage) {
      // 스켈레톤 로딩 또는 데이터 없음 상태 확인
      // 500 에러 메시지가 표시되지 않아야 함
      const errorTexts = ['Internal Server Error', '500', 'Something went wrong']
      for (const errText of errorTexts) {
        await expect(page.getByText(errText)).not.toBeVisible()
      }
      console.log('[business/home] → 홈 페이지 렌더링됨 (미인증 상태)')
    }
  })

  test('/business/ops/schedules - 일정 목록 페이지 접근 확인', async ({ page }) => {
    await page.goto(`${BASE}/business/ops/schedules`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const url = page.url()
    console.log('[business/ops/schedules] 최종 URL:', url)
    await page.screenshot({ path: 'e2e/screenshots/03-schedules.png', fullPage: true })

    expect(url.includes('/login') || url.includes('/schedules'), '로그인 또는 일정 페이지여야 함').toBe(true)
  })

  test('/business/ops/customers - 고객 목록 페이지 접근 확인', async ({ page }) => {
    await page.goto(`${BASE}/business/ops/customers`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const url = page.url()
    console.log('[business/ops/customers] 최종 URL:', url)
    await page.screenshot({ path: 'e2e/screenshots/03-customers.png', fullPage: true })

    expect(url.includes('/login') || url.includes('/customers'), '로그인 또는 고객 페이지여야 함').toBe(true)
  })

  test('/business/hr/workers - 인력 목록 페이지 접근 확인', async ({ page }) => {
    await page.goto(`${BASE}/business/hr/workers`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const url = page.url()
    console.log('[business/hr/workers] 최종 URL:', url)
    await page.screenshot({ path: 'e2e/screenshots/03-workers.png', fullPage: true })

    expect(url.includes('/login') || url.includes('/workers'), '로그인 또는 인력 페이지여야 함').toBe(true)
  })

  test('/business/hr/inventory - 재고 목록 페이지 접근 확인', async ({ page }) => {
    await page.goto(`${BASE}/business/hr/inventory`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const url = page.url()
    console.log('[business/hr/inventory] 최종 URL:', url)
    await page.screenshot({ path: 'e2e/screenshots/03-inventory.png', fullPage: true })

    expect(url.includes('/login') || url.includes('/inventory'), '로그인 또는 재고 페이지여야 함').toBe(true)
  })

  test('/business/hr/attendance - 출퇴근 페이지 접근 확인', async ({ page }) => {
    await page.goto(`${BASE}/business/hr/attendance`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const url = page.url()
    console.log('[business/hr/attendance] 최종 URL:', url)
    await page.screenshot({ path: 'e2e/screenshots/03-attendance.png', fullPage: true })

    expect(url.includes('/login') || url.includes('/attendance'), '로그인 또는 출퇴근 페이지여야 함').toBe(true)
  })
})

test.describe('용역자 포털 페이지 UI (미인증)', () => {
  test('/worker/home - 홈 페이지 접근 확인', async ({ page }) => {
    await page.goto(`${BASE}/worker/home`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const url = page.url()
    console.log('[worker/home] 최종 URL:', url)
    await page.screenshot({ path: 'e2e/screenshots/03-worker-home.png', fullPage: true })

    expect(url.includes('/login') || url.includes('/worker/home'), '로그인 또는 워커 홈 페이지여야 함').toBe(true)
  })

  test('/worker/schedule - 일정 페이지 접근 확인', async ({ page }) => {
    await page.goto(`${BASE}/worker/schedule`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const url = page.url()
    console.log('[worker/schedule] 최종 URL:', url)
    await page.screenshot({ path: 'e2e/screenshots/03-worker-schedule.png', fullPage: true })

    expect(url.includes('/login') || url.includes('/worker/schedule'), '로그인 또는 워커 일정 페이지여야 함').toBe(true)
  })
})
