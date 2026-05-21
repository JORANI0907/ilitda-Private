-- businesses에 플랜 컬럼 추가
ALTER TABLE ilitda.businesses
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at date;

-- profiles에 관리자 플래그 추가
ALTER TABLE ilitda.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 오너 계정 관리자 설정 (business_id 기준)
UPDATE ilitda.profiles SET is_admin = true
WHERE id = (
  SELECT profile_id FROM ilitda.businesses
  WHERE id = 'c5a1c1a3-c010-44ae-840b-65a0e167f43d'
);

-- payments 테이블 생성
CREATE TABLE IF NOT EXISTS ilitda.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES ilitda.businesses(id),
  plan_name text NOT NULL,
  amount integer NOT NULL,
  depositor_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);
