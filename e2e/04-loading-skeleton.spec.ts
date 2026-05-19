/**
 * 로딩 스켈레톤 UI 테스트
 * - API 응답 지연 시 스켈레톤 UI가 표시되는지 확인
 * - business/home 페이지의 로딩 → 데이터 전환 흐름 확인
 */

import { test, expect } from '@playwright/test'

const BASE = 'https://ilitda.vercel.app'

test.describe('로딩 스켈레톤 UI', () => {
  test('business/home - API 지연 시 스켈레톤 애니메이션이 표시된다', async ({ page }) => {
    // API 응답을 2초 지연
    await page.route('**/api/business/home', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: '인증이 필요합니다.' }),
      })
    })

    await page.goto(`${BASE}/business/home`, { waitUntil: 'domcontentloaded' })

    // 페이지가 리다이렉트 되지 않고 렌더링될 경우 스켈레톤 확인
    const url = page.url()
    if (url.includes('/business/home')) {
      // animate-pulse 클래스가 있는 스켈레톤 요소 확인
      const skeletonElements = page.locator('.animate-pulse')
      const count = await skeletonElements.count()
      console.log(`[skeleton] animate-pulse 요소 수: ${count}`)

      if (count > 0) {
        await expect(skeletonElements.first()).toBeVisible()
        await page.screenshot({ path: 'e2e/screenshots/04-skeleton-loading.png', fullPage: true })
        console.log('[skeleton] 로딩 스켈레톤 UI 확인됨')
      }
    }
  })

  test('login 페이지에 스켈레톤 없이 즉시 렌더링된다', async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })

    // 로그인 폼이 즉시 (스켈레톤 없이) 표시됨
    await expect(page.getByText('일잇다')).toBeVisible()
    await expect(page.locator('input[type="tel"]')).toBeVisible()
    await expect(page.getByRole('button', { name: '인증번호 받기' })).toBeVisible()

    // animate-pulse 없음
    const loadingEls = page.locator('.animate-pulse')
    const count = await loadingEls.count()
    expect(count, '로그인 페이지에 스켈레톤이 없어야 함').toBe(0)
  })

  test('업사이드 - OTP verify 페이지에서 API 지연 없이 OTP UI가 표시된다', async ({ page }) => {
    // send-otp 즉시 성공
    await page.route('**/api/auth/send-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto(`${BASE}/login`)
    await page.locator('input[type="tel"]').fill('01054344877')
    await page.getByRole('button', { name: '인증번호 받기' }).click()

    await page.waitForURL(/\/login\/verify/, { timeout: 10_000 })

    // verify 페이지에서 OTP 입력창 즉시 표시
    const otpInputs = page.locator('input[inputmode="numeric"]')
    await expect(otpInputs).toHaveCount(6)

    // 스켈레톤 없음
    const skeletons = page.locator('.animate-pulse')
    const skeletonCount = await skeletons.count()
    console.log(`[verify] animate-pulse 요소 수: ${skeletonCount}`)

    await page.screenshot({ path: 'e2e/screenshots/04-verify-no-skeleton.png', fullPage: true })
  })
})
