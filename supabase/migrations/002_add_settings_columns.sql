-- 설정 관리: businesses 테이블에 form_config, notification_config 컬럼 추가
ALTER TABLE ilitda.businesses
  ADD COLUMN IF NOT EXISTS form_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_config JSONB DEFAULT '{}'::jsonb;
