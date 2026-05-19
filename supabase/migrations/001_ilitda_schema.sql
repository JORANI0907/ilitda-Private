-- ilitda 스키마 생성 및 테이블 정의
CREATE SCHEMA IF NOT EXISTS ilitda;

-- 사용자 (역할 통합)
CREATE TABLE ilitda.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  active_role TEXT NOT NULL DEFAULT 'business' CHECK (active_role IN ('business', 'worker')),
  is_business BOOLEAN NOT NULL DEFAULT false,
  is_worker BOOLEAN NOT NULL DEFAULT false,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  fcm_tokens TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 사업자 프로필
CREATE TABLE ilitda.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES ilitda.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  registration_number TEXT,
  address TEXT,
  representative_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 용역자 프로필
CREATE TABLE ilitda.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES ilitda.profiles(id) ON DELETE CASCADE,
  birthdate DATE,
  account_bank TEXT,
  account_number TEXT,
  available_regions TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 고객 (사업자가 관리)
CREATE TABLE ilitda.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES ilitda.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  type TEXT DEFAULT 'general',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 서비스 일정
CREATE TABLE ilitda.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES ilitda.businesses(id) ON DELETE CASCADE,
  client_id UUID REFERENCES ilitda.clients(id),
  service_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  fee NUMERIC(12,0),
  notes TEXT,
  service_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 배정
CREATE TABLE ilitda.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES ilitda.schedules(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES ilitda.workers(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(10,0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 출퇴근
CREATE TABLE ilitda.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES ilitda.assignments(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES ilitda.workers(id),
  checkin_at TIMESTAMPTZ,
  checkin_lat NUMERIC(10,7),
  checkin_lng NUMERIC(10,7),
  checkout_at TIMESTAMPTZ,
  checkout_lat NUMERIC(10,7),
  checkout_lng NUMERIC(10,7),
  total_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 급여
CREATE TABLE ilitda.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES ilitda.workers(id),
  business_id UUID NOT NULL REFERENCES ilitda.businesses(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_minutes INTEGER DEFAULT 0,
  total_amount NUMERIC(12,0) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at TIMESTAMPTZ,
  paid_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 재고
CREATE TABLE ilitda.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES ilitda.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT DEFAULT '개',
  current_qty INTEGER DEFAULT 0,
  min_qty INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE ilitda.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES ilitda.inventory(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in','out')),
  qty INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 알림 로그
CREATE TABLE ilitda.message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id UUID REFERENCES ilitda.profiles(id),
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 푸시 토큰
CREATE TABLE ilitda.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES ilitda.profiles(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  device_type TEXT DEFAULT 'android',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, device_token)
);

-- 발신번호
CREATE TABLE ilitda.sender_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES ilitda.profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 평점
CREATE TABLE ilitda.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES ilitda.profiles(id),
  target_id UUID NOT NULL REFERENCES ilitda.profiles(id),
  assignment_id UUID REFERENCES ilitda.assignments(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- RLS 활성화
ALTER TABLE ilitda.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ilitda.push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 비로그인 사용자 SELECT 허용 (public-first)
CREATE POLICY "anon_read_profiles" ON ilitda.profiles FOR SELECT USING (true);
CREATE POLICY "own_profile" ON ilitda.profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "anon_read_schedules" ON ilitda.schedules FOR SELECT USING (true);
CREATE POLICY "own_business_schedules" ON ilitda.schedules FOR ALL USING (
  business_id IN (SELECT id FROM ilitda.businesses WHERE profile_id = auth.uid())
);

CREATE POLICY "own_business_clients" ON ilitda.clients FOR ALL USING (
  business_id IN (SELECT id FROM ilitda.businesses WHERE profile_id = auth.uid())
);

CREATE POLICY "own_worker_assignments" ON ilitda.assignments FOR SELECT USING (
  worker_id IN (SELECT id FROM ilitda.workers WHERE profile_id = auth.uid())
  OR schedule_id IN (
    SELECT s.id FROM ilitda.schedules s
    JOIN ilitda.businesses b ON s.business_id = b.id
    WHERE b.profile_id = auth.uid()
  )
);
CREATE POLICY "business_manage_assignments" ON ilitda.assignments FOR ALL USING (
  schedule_id IN (
    SELECT s.id FROM ilitda.schedules s
    JOIN ilitda.businesses b ON s.business_id = b.id
    WHERE b.profile_id = auth.uid()
  )
);

CREATE POLICY "own_attendance" ON ilitda.attendance FOR ALL USING (
  worker_id IN (SELECT id FROM ilitda.workers WHERE profile_id = auth.uid())
);

CREATE POLICY "own_businesses" ON ilitda.businesses FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "own_workers" ON ilitda.workers FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "own_push_tokens" ON ilitda.push_tokens FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "own_payroll_worker" ON ilitda.payroll FOR SELECT USING (
  worker_id IN (SELECT id FROM ilitda.workers WHERE profile_id = auth.uid())
);
CREATE POLICY "own_payroll_business" ON ilitda.payroll FOR ALL USING (
  business_id IN (SELECT id FROM ilitda.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "own_inventory" ON ilitda.inventory FOR ALL USING (
  business_id IN (SELECT id FROM ilitda.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "own_inventory_tx" ON ilitda.inventory_transactions FOR ALL USING (
  inventory_id IN (
    SELECT id FROM ilitda.inventory WHERE business_id IN (
      SELECT id FROM ilitda.businesses WHERE profile_id = auth.uid()
    )
  )
);
