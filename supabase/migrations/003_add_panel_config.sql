-- 패널 설정: businesses 테이블에 panel_config 컬럼 추가
ALTER TABLE ilitda.businesses
  ADD COLUMN IF NOT EXISTS panel_config JSONB DEFAULT '{}'::jsonb;
