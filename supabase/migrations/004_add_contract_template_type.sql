-- Migration 004: contract_templates 업로드 방식 지원 컬럼 추가
ALTER TABLE ilitda.contract_templates
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_url text;
