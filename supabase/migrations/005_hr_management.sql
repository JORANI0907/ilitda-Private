-- workers 민감정보 컬럼 추가
ALTER TABLE ilitda.workers
  ADD COLUMN IF NOT EXISTS resident_number     text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS company_name        text;

-- connections 수동등록 정보 보완
ALTER TABLE ilitda.connections
  ADD COLUMN IF NOT EXISTS manual_account_bank         text,
  ADD COLUMN IF NOT EXISTS manual_account_number       text,
  ADD COLUMN IF NOT EXISTS manual_registration_number  text,
  ADD COLUMN IF NOT EXISTS manual_resident_number      text,
  ADD COLUMN IF NOT EXISTS manual_company_name         text;

-- service_applications 작업자 배정 + 급여 (admin portal)
ALTER TABLE ilitda.service_applications
  ADD COLUMN IF NOT EXISTS assigned_connection_ids uuid[],
  ADD COLUMN IF NOT EXISTS worker_pay              jsonb;

-- service_requests 작업자 배정 (business portal)
ALTER TABLE ilitda.service_requests
  ADD COLUMN IF NOT EXISTS assigned_connection_ids uuid[],
  ADD COLUMN IF NOT EXISTS worker_pay              jsonb;
