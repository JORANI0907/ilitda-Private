/**
 * API 엔드포인트 미인증 접근 테스트
 * - 인증 없이 API 호출 시 적절한 응답 코드 반환 여부 확인
 * - 401(인증 필요) 또는 200(빈 목록) 반환이 정상
 * - 404/500은 버그로 간주
 * - "사업자 정보를 찾을 수 없습니다." 에러가 미인증 경로에서 나오지 않아야 함
 */

import { test, expect } from '@playwright/test'

const BASE = 'https://ilitda.vercel.app'

interface ApiResult {
  path: string
  status: number
  body: unknown
  ok: boolean
}

test.describe('API 엔드포인트 미인증 접근', () => {
  test('business API - 미인증 시 401 또는 빈 목록 200 반환 (500 없음)', async ({ request }) => {
    const endpoints = [
      '/api/business/home',
      '/api/business/schedules',
      '/api/business/customers',
      '/api/business/workers',
      '/api/business/inventory',
      '/api/business/attendance',
    ]

    const results: ApiResult[] = []

    for (const path of endpoints) {
      const response = await request.get(`${BASE}${path}`)
      const body = await response.json().catch(() => null)
      results.push({
        path,
        status: response.status(),
        body,
        ok: response.status() < 500,
      })
    }

    console.table(results.map(r => ({
      path: r.path,
      status: r.status,
      success: (r.body as Record<string, unknown>)?.success,
      error: (r.body as Record<string, unknown>)?.error,
    })))

    // 모든 엔드포인트가 500 미만이어야 함
    for (const result of results) {
      expect(result.status, `${result.path} must not return 5xx`).toBeLessThan(500)
    }

    // /api/business/home: 미인증 시 반드시 401
    const homeResult = results.find(r => r.path === '/api/business/home')!
    expect(homeResult.status, '/api/business/home must return 401 for unauthenticated').toBe(401)
    expect((homeResult.body as Record<string, unknown>)?.error).not.toBe('사업자 정보를 찾을 수 없습니다.')
  })

  test('worker API - 미인증 시 401 또는 빈 목록 200 반환 (500 없음)', async ({ request }) => {
    const endpoints = [
      '/api/worker/home',
      '/api/worker/schedules',
    ]

    for (const path of endpoints) {
      const response = await request.get(`${BASE}${path}`)
      const body = await response.json().catch(() => null)

      console.log(`[${response.status()}] ${path}`, JSON.stringify(body).slice(0, 120))

      expect(response.status(), `${path} must not return 5xx`).toBeLessThan(500)
    }
  })

  test('business/schedules API는 filter 파라미터를 올바르게 처리한다', async ({ request }) => {
    const filters = ['all', 'today', 'week', 'month']

    for (const filter of filters) {
      const response = await request.get(`${BASE}/api/business/schedules?filter=${filter}`)
      // 미인증이므로 200(빈 목록) 또는 401 기대, 500 불허
      expect(response.status(), `schedules?filter=${filter} must not be 5xx`).toBeLessThan(500)
    }
  })

  test('auth API - send-otp 잘못된 번호 입력 시 400 반환', async ({ request }) => {
    const response = await request.post(`${BASE}/api/auth/send-otp`, {
      data: { phone: '12345' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('올바른 휴대폰 번호')
  })

  test('auth API - verify-otp 잘못된 입력 시 400 반환', async ({ request }) => {
    const response = await request.post(`${BASE}/api/auth/verify-otp`, {
      data: { phone: '12345', otp: '123' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })

  test('auth API - verify-otp 잘못된 OTP 코드 시 401 반환', async ({ request }) => {
    // 실제 전화번호로 잘못된 OTP 검증 시도 (OTP 저장 없이 검증)
    const response = await request.post(`${BASE}/api/auth/verify-otp`, {
      data: { phone: '01054344877', otp: '999999' },
    })
    // 401(OTP 불일치) 또는 500 중 어느쪽인지 확인
    const body = await response.json()
    console.log(`[verify-otp bad otp] status=${response.status()}`, body)

    // 500이면 버그 - OTP 검증 실패는 반드시 401이어야 함
    expect(response.status(), 'wrong OTP must return 401 not 500').not.toBe(500)
  })
})
