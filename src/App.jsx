import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Shield, Search, BookOpen, ExternalLink, CheckCircle2, Lock, Unlock,
  Settings, LayoutDashboard, FolderKanban, Link2, Palette, History,
  Database, Download, Upload, Plus, Edit3, Trash2, ArrowUp, ArrowDown,
  Eye, Save, RotateCcw, AlertTriangle, X, Sparkles, Terminal, Server,
  Globe, FileCode, Key, LogOut, LogIn, ChevronRight, Clock, Layers,
  Radio, Zap, Check, Copy, Image as ImageIcon, RefreshCw, Menu, ShieldAlert
} from 'lucide-react';

/**
 * ============================================================================
 * SIGMA TOWN RULES — FUTURE 2026 (CORE ARCHITECTURE & SUPABASE INTEGRATION)
 * ============================================================================
 * - Zero hardcoded passwords or service_role keys.
 * - Real Supabase Auth & Realtime PostgREST integration via CDN/window.supabase
 *   with automatic seamless fallback to Interactive Live Engine when Supabase
 *   credentials are not yet configured.
 * - Complete SQL Schema, RLS Policies, .env.example, and Deployment Blueprints
 *   embedded in the System Blueprint Hub for instant copy/download.
 */

// ----------------------------------------------------------------------------
// 1. DELIVERABLE BLUEPRINTS (SQL SCHEMA, RLS, ENV, DEPLOYMENT & ADMIN GUIDES)
// ----------------------------------------------------------------------------
const SUPABASE_SQL_SCHEMA = `-- ============================================================================
-- SIGMA TOWN RULES — FUTURE 2126 | SUPABASE POSTGRESQL SCHEMA & RLS SECURITY
-- Run this entire script in your Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE (User Roles & Admin Authorization)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'moderator', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile when a new user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1), 'citizen')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to verify Admin role cleanly in RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  badge_code TEXT DEFAULT 'SEC-01',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RULES TABLE
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  rule_code TEXT NOT NULL DEFAULT 'R-01',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'STANDARD' CHECK (severity IN ('STANDARD', 'CRITICAL', 'ZERO-TOLERANCE')),
  image_url TEXT,
  reference_url TEXT,
  reference_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. WEBSITE SETTINGS TABLE (Singleton Row id = 1)
CREATE TABLE IF NOT EXISTS public.website_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'SIGMA TOWN RULES',
  logo_url TEXT DEFAULT '',
  hero_title TEXT NOT NULL DEFAULT 'SIGMA TOWN DIRECTIVES // 2126',
  site_description TEXT NOT NULL DEFAULT 'ศูนย์รวมกฎระเบียบและข้อบังคับอย่างเป็นทางการแห่งมหานคร Sigma Town ยุค 2126',
  welcome_message TEXT NOT NULL DEFAULT 'ยินดีต้อนรับพลเมืองทุกท่าน กรุณาศึกษากฎระเบียบอย่างเคร่งครัดเพื่อความสงบสุขของเมือง',
  footer_text TEXT NOT NULL DEFAULT '© 2126 SIGMA TOWN METROPOLIS. ALL CITIZEN PROTOCOLS ENFORCED.',
  bg_image_url TEXT DEFAULT '',
  bg_color TEXT NOT NULL DEFAULT '#07070B',
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  primary_color TEXT NOT NULL DEFAULT '#FF003C',
  secondary_color TEXT NOT NULL DEFAULT '#FFFFFF',
  gradient_start TEXT NOT NULL DEFAULT '#FF003C',
  gradient_end TEXT NOT NULL DEFAULT '#8A0022',
  gradient_direction TEXT NOT NULL DEFAULT '135deg',
  glow_intensity INTEGER NOT NULL DEFAULT 75,
  theme_mode TEXT NOT NULL DEFAULT 'cyber-crimson',
  body_font TEXT NOT NULL DEFAULT 'Prompt',
  heading_font TEXT NOT NULL DEFAULT 'Orbitron',
  enable_read_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default singleton settings row
INSERT INTO public.website_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 6. QUICK LINKS TABLE
CREATE TABLE IF NOT EXISTS public.quick_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Globe',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. READ CONFIRMATIONS TABLE
CREATE TABLE IF NOT EXISTS public.read_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES public.rules(id) ON DELETE CASCADE,
  citizen_session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rule_id, citizen_session_id)
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — STRICT ZERO-TRUST PROTECTION
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.read_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public Read Access for Players (No Login Required)
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public can read published rules" ON public.rules FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "Public can read website settings" ON public.website_settings FOR SELECT USING (true);
CREATE POLICY "Public can read active quick links" ON public.quick_links FOR SELECT USING (is_active = true OR public.is_admin());

-- Read Confirmations: Public can insert & view own confirmations; Admin can view all
CREATE POLICY "Anyone can log rule confirmation" ON public.read_confirmations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view confirmations" ON public.read_confirmations FOR SELECT USING (true);

-- Profiles: Users read own profile; Admins read all profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

-- Admin-Only Write Access (INSERT / UPDATE / DELETE)
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage rules" ON public.rules FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage settings" ON public.website_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage quick_links" ON public.quick_links FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage audit_logs" ON public.audit_logs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Enable Realtime on core tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rules, public.categories, public.website_settings, public.quick_links;
`;

const ENV_EXAMPLE_CONTENT = `# ============================================================================
# SIGMA TOWN RULES — FUTURE 2126 | ENVIRONMENT VARIABLES (.env.local)
# NEVER commit .env.local to GitHub! Add .env* to .gitignore
# NEVER expose SUPABASE_SERVICE_ROLE_KEY in frontend code!
# ============================================================================

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-public-anon-key
`;

const FIRST_ADMIN_SQL = `-- ============================================================================
-- HOW TO CREATE YOUR FIRST ADMIN USER IN SUPABASE
-- ============================================================================
-- Step 1: Go to Supabase Dashboard -> Authentication -> Users -> "Add User"
--         Create your Admin Email & Password (check "Auto Confirm User").
--
-- Step 2: Run the SQL command below in SQL Editor (replace with your email):

UPDATE public.profiles
SET role = 'admin', display_name = 'Sigma Chief Architect'
WHERE email = 'your-admin-email@domain.com';

-- Verify your admin profile:
SELECT id, email, display_name, role, created_at FROM public.profiles WHERE role = 'admin';
`;

const DEPLOYMENT_GUIDE_MD = `# 🚀 SIGMA TOWN RULES — DEPLOYMENT & OPERATIONS MANUAL (2126 EDITION)

## 1. Supabase Backend Setup
1. Create a free project at **https://supabase.com**.
2. Open **SQL Editor** -> paste and run the complete \`schema.sql\` provided in the SQL tab.
3. Go to **Authentication -> Providers -> Email** and ensure Email Sign-In is enabled.
4. Create your first Admin user under **Authentication -> Users**, then run the First Admin SQL script to assign \`role = 'admin'\`.
5. Copy your **Project URL** and **anon public key** from **Project Settings -> API**.

## 2. GitHub & Vercel Production Deployment
1. Push your React project to a private or public **GitHub** repository.
2. Log in to **https://vercel.com** -> Click **Add New Project** -> Import your GitHub repo.
3. Under **Environment Variables**, add:
   - \`VITE_SUPABASE_URL\` = your Supabase Project URL
   - \`VITE_SUPABASE_ANON_KEY\` = your Supabase Anon Public Key
4. Click **Deploy**. Vercel automatically provisions HTTPS/SSL and global CDN distribution.
5. (Optional) Go to **Vercel Project Settings -> Domains** to attach your custom domain (e.g., \`rules.sigmatown.gg\`).

## 3. Backup & Disaster Recovery Protocol
- Use the **Backup & Restore** tab inside Admin Dashboard weekly to export a complete JSON snapshot of \`website_settings\`, \`categories\`, \`rules\`, and \`quick_links\`.
- Store JSON backups securely off-site. Importing a JSON backup validates structure before restoring.
`;

// ----------------------------------------------------------------------------
// 2. INITIAL DEFAULT DATA (USED FOR LIVE PREVIEW & FIRST-TIME INITIALIZATION)
// ----------------------------------------------------------------------------
const DEFAULT_SETTINGS = {
  id: 1,
  site_name: 'SIGMA TOWN RULES',
  logo_url: '',
  hero_title: 'SIGMA TOWN DIRECTIVES 2026',
  site_description: 'ศูนย์กลางกฎระเบียบ ข้อบังคับ และกฎหมายสูงสุดแห่งมหานคร Sigma Town 2026 — ระบบซิงโครไนซ์ข้อมูลกลางแบบเรียลไทม์สำหรับพลเมืองทุกคน',
  welcome_message: 'CITIZEN NOTICE: การเข้าสู่เขตแดน Sigma Town ถือว่าท่านยอมรับและตกลงปฏิบัติตามกฎระเบียบทุกข้อโดยไม่มีข้อยกเว้น',
  footer_text: '© 2026 SIGMA TOWN METROPOLIS • CENTRAL COMMAND ARCHIVE • ALL RIGHTS RESERVED',
  bg_image_url: '',
  bg_color: '#07070B',
  text_color: '#FFFFFF',
  primary_color: '#FF003C',
  secondary_color: '#FFFFFF',
  gradient_start: '#FF003C',
  gradient_end: '#7A001D',
  gradient_direction: '135deg',
  glow_intensity: 80,
  theme_mode: 'cyber-crimson',
  body_font: 'Prompt',
  heading_font: 'Orbitron',
  enable_read_confirmation: true,
  updated_at: new Date().toISOString()
};

const FONT_OPTIONS = {
  body: [
    { id: 'Prompt', label: 'Prompt (ทันสมัย อ่านง่าย สมดุล)' },
    { id: 'Kanit', label: 'Kanit (โปร่ง คมชัด สไตล์โมเดิร์น)' },
    { id: 'Sarabun', label: 'Sarabun (ทางการ อ่านสบายตา)' },
    { id: 'Chakra Petch', label: 'Chakra Petch (ไซไฟ ล้ำยุค 2126)' },
    { id: 'IBM Plex Sans Thai', label: 'IBM Plex Sans Thai (พรีเมียม เทคโนโลยี)' },
    { id: 'Noto Sans Thai', label: 'Noto Sans Thai (มาตรฐานสากล)' }
  ],
  heading: [
    { id: 'Orbitron', label: 'Orbitron (Futuristic Cyber 2126)' },
    { id: 'Rajdhani', label: 'Rajdhani (Tech Tactical HUD)' },
    { id: 'Chakra Petch', label: 'Chakra Petch (Sci-Fi ไทย + อังกฤษ)' },
    { id: 'Audiowide', label: 'Audiowide (Neon Synthwave)' },
    { id: 'Exo 2', label: 'Exo 2 (Modern Aerospace)' },
    { id: 'Prompt', label: 'Prompt Bold (สะอาดตา รองรับไทยเต็มรูปแบบ)' }
  ]
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'กฎพื้นฐานพลเมือง (Core Citizen Laws)', slug: 'core-laws', description: 'กฎเหล็กขั้นพื้นฐานที่ผู้เล่นทุกคนต้องปฏิบัติตามอย่างเคร่งครัด', badge_code: 'SEC-01', sort_order: 1 },
  { id: 'cat-2', name: 'การสวมบทบาท (Roleplay & Immersion)', slug: 'roleplay', description: 'มาตรฐานการเล่น Roleplay เพื่อความสมจริงและอรรถรสสูงสุด', badge_code: 'SEC-02', sort_order: 2 },
  { id: 'cat-3', name: 'เขตหวงห้ามและการปะทะ (Combat & Red Zones)', slug: 'combat', description: 'กติกาการใช้อาวุธ การปล้น สงครามแก๊ง และพื้นที่ปลอดภัย', badge_code: 'SEC-03', sort_order: 3 },
  { id: 'cat-4', name: 'เศรษฐกิจและทรัพย์สิน (Economy & Assets)', slug: 'economy', description: 'ข้อบังคับเกี่ยวกับการซื้อขาย ธุรกิจ ยานพาหนะ และอสังหาริมทรัพย์', badge_code: 'SEC-04', sort_order: 4 },
  { id: 'cat-5', name: 'กฎโรงพยาบาล (Rule Medic)', slug: 'medic', description: 'ข้อบังคับและการปฏิบัติหน้าที่ของบุคลากรทางการแพทย์และผู้ป่วย', badge_code: 'SEC-05', sort_order: 5 }
];

const DEFAULT_RULES = [
  {
    id: 'rule-101',
    category_id: 'cat-1',
    rule_code: 'LAW-01',
    title: 'ห้ามใช้โปรแกรมช่วยเล่น บั๊ก หรือช่องโหว่ของระบบ (Zero Exploits & Cheating)',
    content: 'ห้ามผู้เล่นใช้โปรแกรมภายนอก (Mod Menu, Macro, Aimbot, Wallhack) หรือจงใจใช้ข้อผิดพลาดของเซิร์ฟเวอร์ (Bug Abuse) เพื่อสร้างความได้เปรียบไม่ว่ากรณีใดๆ หากพบเห็นบั๊กต้องแจ้งทีมงานทันที บทลงโทษ: แบนถาวร (Permanent Ban) ทันทีโดยไม่มีการอุทธรณ์',
    severity: 'ZERO-TOLERANCE',
    image_url: '',
    reference_url: 'https://discord.com',
    reference_label: 'แจ้งพบเห็นผู้กระทำผิดผ่านศูนย์บัญชาการ',
    sort_order: 1,
    is_published: true,
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 'rule-102',
    category_id: 'cat-1',
    rule_code: 'LAW-02',
    title: 'การเคารพซึ่งกันและกันและห้ามคุกคามนอกบทบาท (OOC Respect & Anti-Toxicity)',
    content: 'ห้ามดูหมิ่น เหยียดเชื้อชาติ ศาสนา เพศ หรือคุกคามชีวิตส่วนตัวของผู้เล่นอื่นนอกเหนือจากบทบาทในเกม (Out Of Character) ความขัดแย้งในตัวละครต้องจบลงภายในเนื้อเรื่องของตัวละครเท่านั้น',
    severity: 'CRITICAL',
    image_url: '',
    reference_url: '',
    reference_label: '',
    sort_order: 2,
    is_published: true,
    updated_at: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: 'rule-201',
    category_id: 'cat-2',
    rule_code: 'RP-01',
    title: 'การรักษาคุณค่าชีวิตตัวละคร (Value of Life - NVL)',
    content: 'ผู้เล่นต้องแสดงความหวาดกลัวและหวงแหนชีวิตของตัวละครอย่างสมจริง เมื่อตกอยู่ในสถานการณ์ที่ถูกจ่อด้วยอาวุธในระยะประชิดหรือเสียเปรียบอย่างชัดเจน ห้ามขัดขืนอย่างไร้เหตุผลหรือพยายามชักอาวุธสวนโดยไม่คำนึงถึงความปลอดภัย',
    severity: 'CRITICAL',
    image_url: '',
    reference_url: '',
    reference_label: '',
    sort_order: 3,
    is_published: true,
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: 'rule-202',
    category_id: 'cat-2',
    rule_code: 'RP-02',
    title: 'ห้ามนำข้อมูลนอกเกมมาใช้ในเกม (Metagaming & Stream Sniping)',
    content: 'ห้ามนำข้อมูลที่ได้จากการดูไลฟ์สตรีม Discord หรือช่องทางภายนอกเกม มาใช้ตัดสินใจหรืออ้างอิงภายในเกม ตัวละครจะรับรู้เฉพาะสิ่งที่ได้ยินและพบเห็นด้วยตนเองในเมือง Sigma Town เท่านั้น',
    severity: 'STANDARD',
    image_url: '',
    reference_url: '',
    reference_label: '',
    sort_order: 4,
    is_published: true,
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'rule-301',
    category_id: 'cat-3',
    rule_code: 'CMB-01',
    title: 'เขตปลอดภัยสูงสุด (Safe Zones & Green Zones)',
    content: 'พื้นที่โรงพยาบาลกลาง สถานีตำรวจกลาง จุดเกิดพลเมือง และธนาคารกลาง ถือเป็นเขตปลอดอาวุธและห้ามก่ออาชญากรรมทุกชนิด ยกเว้นเหตุการณ์พิเศษที่ได้รับการอนุมัติจากผู้ดูแลระบบล่วงหน้า',
    severity: 'CRITICAL',
    image_url: '',
    reference_url: '',
    reference_label: '',
    sort_order: 5,
    is_published: true,
    updated_at: new Date(Date.now() - 1000 * 60 * 20).toISOString()
  },
  {
    id: 'rule-401',
    category_id: 'cat-4',
    rule_code: 'ECO-01',
    title: 'ห้ามซื้อขายไอเทมหรือเงินในเกมด้วยเงินจริง (RMT Prohibition)',
    content: 'ห้ามซื้อขาย แลกเปลี่ยน หรือโอนถ่ายสกุลเงินในเกม ยานพาหนะ อสังหาริมทรัพย์ หรือไอเทมใดๆ ด้วยเงินจริงนอกระบบของเมืองโดยเด็ดขาด หากตรวจพบจะถูกระงับบัญชีทั้งผู้ซื้อและผู้ขาย',
    severity: 'ZERO-TOLERANCE',
    image_url: '',
    reference_url: '',
    reference_label: '',
    sort_order: 6,
    is_published: true,
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  }
];

const DEFAULT_LINKS = [
  { id: 'lnk-1', label: 'DISCORD SERVER', url: 'https://discord.com', description: 'เข้าร่วมชุมชนและติดต่อทีมงาน Sigma Town', icon_name: 'Radio', sort_order: 1, is_active: true },
  { id: 'lnk-2', label: 'CONNECT CITY', url: 'https://cfx.re', description: 'เชื่อมต่อเข้าสู่เซิร์ฟเวอร์หลัก Sigma Town 2126', icon_name: 'Zap', sort_order: 2, is_active: true },
  { id: 'lnk-3', label: 'CITIZEN PORTAL', url: 'https://example.com', description: 'ตรวจสอบสถานะพลเมืองและใบอนุญาต', icon_name: 'Globe', sort_order: 3, is_active: true },
  { id: 'lnk-4', label: 'REPORT CENTER', url: 'https://example.com/report', description: 'แจ้งปัญหา ร้องเรียน และส่งหลักฐาน', icon_name: 'ShieldAlert', sort_order: 4, is_active: true }
];

const INITIAL_AUDIT_LOGS = [
  { id: 'log-1', actor_email: 'system@sigmatown.gg', action: 'SYSTEM_INIT', target_table: 'website_settings', target_summary: 'Initialized Sigma Town 2126 Core Directive Matrix', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: 'log-2', actor_email: 'architect@sigmatown.gg', action: 'UPDATE_RULE', target_table: 'rules', target_summary: 'Updated [CMB-01] Safe Zones & Green Zones protocol', created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString() }
];

// Icon Registry for Quick Links
const ICON_MAP = {
  Globe, Radio, Zap, ShieldAlert, ExternalLink, Shield, BookOpen, Terminal, Server, Sparkles
};

// Security: Basic URL sanitizer to prevent javascript: XSS injections
const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^(https?:\/\/|mailto:|\/)/i.test(trimmed)) return trimmed;
  return '';
};

// Format Thai + Sci-Fi Timestamp
const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
};

// Check if updated within last 24 hours
const isRecentlyUpdated = (isoString) => {
  if (!isoString) return false;
  return (Date.now() - new Date(isoString).getTime()) < 1000 * 60 * 60 * 24;
};

// Safely read environment variables across ES2015, Vite, Next.js, and Window runtime globals
const getRuntimeEnv = (key) => {
  try {
    if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
      return window.__ENV__[key];
    }
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {
    // Ignore environment access errors in restricted sandboxes
  }
  return '';
};

// ----------------------------------------------------------------------------
// 3. MAIN APPLICATION COMPONENT
// ----------------------------------------------------------------------------
export default function App() {
  // Navigation & View State ('player' | 'admin')
  const [viewMode, setViewMode] = useState('player');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Supabase Runtime Connection Config (loaded safely from window/env or user input, never hardcoded secrets)
  const [sbConfig, setSbConfig] = useState({
    url: getRuntimeEnv('VITE_SUPABASE_URL') || getRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL') || '',
    anonKey: getRuntimeEnv('VITE_SUPABASE_ANON_KEY') || getRuntimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '',
    connected: false,
    sdkReady: false
  });
  const [showSbModal, setShowSbModal] = useState(false);
  const [sbInputUrl, setSbInputUrl] = useState('');
  const [sbInputKey, setSbInputKey] = useState('');
  const supabaseRef = useRef(null);

  // Authentication State (Real Supabase Auth when connected, or Authorized Session for testing)
  const [adminUser, setAdminUser] = useState(null); // { id, email, role }
  const [authLoading, setAuthLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Central Database State
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState(DEFAULT_SETTINGS);
  const [previewThemeActive, setPreviewThemeActive] = useState(false);

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [quickLinks, setQuickLinks] = useState(DEFAULT_LINKS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [confirmedRuleIds, setConfirmedRuleIds] = useState([]);
  const [totalConfirmationsCount, setTotalConfirmationsCount] = useState(1428);
  const [citizenSessionId] = useState(() => 'CIT-' + Math.random().toString(36).substring(2, 10).toUpperCase());

  // Player Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyRecentFilter, setOnlyRecentFilter] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState(null);

  // Global Loading & Notification Toast State
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', message: string }

  // Confirmation Dialog State (Replaces window.confirm)
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm }

  // Admin Form Modals State
  const [editingRule, setEditingRule] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [blueprintTab, setBlueprintTab] = useState('sql');

  // Helper: Show Notification Toast
  const notify = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4200);
  };

  // Load Google Fonts (Thai + 2126 Sci-Fi) & Supabase JS CDN
  useEffect(() => {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Audiowide&family=Chakra+Petch:wght@400;600;700&family=Exo+2:wght@600;700;900&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Kanit:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Orbitron:wght@500;700;900&family=Prompt:wght@300;400;500;600;700&family=Rajdhani:wght@500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(fontLink);

    if (!window.supabase) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => {
        setSbConfig((prev) => ({ ...prev, sdkReady: true }));
      };
      document.body.appendChild(script);
    } else {
      setSbConfig((prev) => ({ ...prev, sdkReady: true }));
    }
  }, []);

  // Initialize Supabase Client when URL & Anon Key are provided
  useEffect(() => {
    if (sbConfig.sdkReady && sbConfig.url && sbConfig.anonKey && window.supabase) {
      try {
        const client = window.supabase.createClient(sbConfig.url, sbConfig.anonKey);
        supabaseRef.current = client;
        setSbConfig((prev) => ({ ...prev, connected: true }));
        fetchAllFromSupabase(client);

        // Subscribe to Realtime changes
        const channel = client
          .channel('sigma-town-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rules' }, () => fetchAllFromSupabase(client))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchAllFromSupabase(client))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'website_settings' }, () => fetchAllFromSupabase(client))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_links' }, () => fetchAllFromSupabase(client))
          .subscribe();

        return () => {
          client.removeChannel(channel);
        };
      } catch (err) {
        notify('error', 'ไม่สามารถเชื่อมต่อ Supabase ได้ กรุณาตรวจสอบ URL และ Anon Key');
      }
    }
  }, [sbConfig.sdkReady, sbConfig.url, sbConfig.anonKey]);

  // Fetch all tables from live Supabase database
  const fetchAllFromSupabase = async (client = supabaseRef.current) => {
    if (!client) return;
    setIsLoading(true);
    try {
      const [settingsRes, catRes, rulesRes, linksRes, logsRes, confCountRes] = await Promise.all([
        client.from('website_settings').select('*').eq('id', 1).single(),
        client.from('categories').select('*').order('sort_order', { ascending: true }),
        client.from('rules').select('*').order('sort_order', { ascending: true }),
        client.from('quick_links').select('*').order('sort_order', { ascending: true }),
        client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        client.from('read_confirmations').select('*', { count: 'exact', head: true })
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setDraftSettings(settingsRes.data);
      }
      if (catRes.data) setCategories(catRes.data);
      if (rulesRes.data) setRules(rulesRes.data);
      if (linksRes.data) setQuickLinks(linksRes.data);
      if (logsRes.data) setAuditLogs(logsRes.data);
      if (typeof confCountRes.count === 'number') setTotalConfirmationsCount(confCountRes.count);
    } catch (error) {
      notify('error', 'เกิดข้อผิดพลาดในการซิงค์ข้อมูลจาก Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Record Audit Log
  const recordAuditLog = async (action, targetTable, targetSummary) => {
    const actorEmail = adminUser?.email || 'admin@sigmatown.gg';
    const newEntry = {
      id: 'log-' + Date.now(),
      actor_email: actorEmail,
      action,
      target_table: targetTable,
      target_summary: targetSummary,
      created_at: new Date().toISOString()
    };

    if (sbConfig.connected && supabaseRef.current && adminUser?.id) {
      await supabaseRef.current.from('audit_logs').insert({
        actor_id: adminUser.id,
        actor_email: actorEmail,
        action,
        target_table: targetTable,
        target_summary: targetSummary
      });
      const { data } = await supabaseRef.current
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setAuditLogs(data);
    } else {
      setAuditLogs((prev) => [newEntry, ...prev]);
    }
  };

  // Active Theme Object (Switches seamlessly between Saved Settings and Live Preview Draft)
  const activeTheme = useMemo(() => {
    return (viewMode === 'admin' && adminTab === 'theme' && previewThemeActive)
      ? draftSettings
      : settings;
  }, [viewMode, adminTab, previewThemeActive, draftSettings, settings]);

  // --------------------------------------------------------------------------
  // 4. AUTHENTICATION HANDLERS (NO HARDCODED PASSWORDS)
  // --------------------------------------------------------------------------
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      notify('error', 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setAuthLoading(true);
    try {
      if (sbConfig.connected && supabaseRef.current) {
        // Real Supabase Authentication + RLS Profile Role Verification
        const { data: authData, error: authError } = await supabaseRef.current.auth.signInWithPassword({
          email: loginEmail.trim(),
          password: loginPassword
        });

        if (authError) throw new Error(authError.message);

        const { data: profile, error: profileError } = await supabaseRef.current
          .from('profiles')
          .select('id, email, role, display_name')
          .eq('id', authData.user.id)
          .single();

        if (profileError || profile?.role !== 'admin') {
          await supabaseRef.current.auth.signOut();
          throw new Error('บัญชีนี้ไม่มีสิทธิ์ระดับ Admin ในตาราง profiles');
        }

        setAdminUser(profile);
        setLoginPassword('');
        notify('success', `ยืนยันตัวตนสำเร็จ ยินดีต้อนรับ ${profile.display_name || profile.email}`);
        fetchAllFromSupabase();
      } else {
        // Sandbox Mode when Supabase credentials haven't been attached yet
        notify('error', 'กรุณาเชื่อมต่อ Supabase URL & Anon Key ก่อนเข้าสู่ระบบจริง หรือกดปุ่ม "เข้าสู่โหมดทดสอบ Sandbox" ด้านล่าง');
      }
    } catch (err) {
      notify('error', err.message || 'การเข้าสู่ระบบล้มเหลว');
    } finally {
      setAuthLoading(false);
    }
  };

  const enterSandboxAdmin = () => {
    setAdminUser({
      id: 'sandbox-architect',
      email: 'architect@sigmatown.local',
      display_name: 'Sandbox Architect',
      role: 'admin',
      isSandbox: true
    });
    notify('info', 'เข้าสู่โหมดทดสอบระบบ Admin (เชื่อมต่อ Supabase จริงได้ทุกเมื่อที่เมนูด้านบน)');
  };

  const handleAdminLogout = async () => {
    if (sbConfig.connected && supabaseRef.current) {
      await supabaseRef.current.auth.signOut();
    }
    setAdminUser(null);
    setPreviewThemeActive(false);
    setViewMode('player');
    notify('info', 'ออกจากระบบ Admin เรียบร้อยแล้ว');
  };

  // --------------------------------------------------------------------------
  // 5. PLAYER INTERACTIONS (FILTERING & READ CONFIRMATION)
  // --------------------------------------------------------------------------
  const filteredRules = useMemo(() => {
    return rules
      .filter((r) => r.is_published !== false)
      .filter((r) => (selectedCategory === 'ALL' ? true : r.category_id === selectedCategory))
      .filter((r) => (onlyRecentFilter ? isRecentlyUpdated(r.updated_at) : true))
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          r.rule_code.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [rules, selectedCategory, onlyRecentFilter, searchQuery]);

  const recentRulesCount = useMemo(
    () => rules.filter((r) => r.is_published !== false && isRecentlyUpdated(r.updated_at)).length,
    [rules]
  );

  const handleAcknowledgeRule = async (ruleId) => {
    if (confirmedRuleIds.includes(ruleId)) return;
    setConfirmedRuleIds((prev) => [...prev, ruleId]);
    setTotalConfirmationsCount((prev) => prev + 1);
    notify('success', 'บันทึกการยืนยันรับทราบกฎระเบียบเข้าสู่ฐานข้อมูลกลางแล้ว');

    if (sbConfig.connected && supabaseRef.current) {
      await supabaseRef.current.from('read_confirmations').upsert({
        rule_id: ruleId,
        citizen_session_id: citizenSessionId
      }, { onConflict: 'rule_id,citizen_session_id' });
    }
  };

  // --------------------------------------------------------------------------
  // 6. ADMIN CRUD OPERATIONS (RULES, CATEGORIES, LINKS, THEME, BACKUP)
  // --------------------------------------------------------------------------
  // Save Rule (Create or Update)
  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!adminUser) return;
    if (!editingRule.title?.trim() || !editingRule.content?.trim()) {
      notify('error', 'กรุณากรอกชื่อกฎและรายละเอียดกฎให้ครบถ้วน');
      return;
    }

    const payload = {
      category_id: editingRule.category_id || categories[0]?.id,
      rule_code: editingRule.rule_code?.trim() || `R-${rules.length + 1}`,
      title: editingRule.title.trim(),
      content: editingRule.content.trim(),
      severity: editingRule.severity || 'STANDARD',
      image_url: sanitizeUrl(editingRule.image_url),
      reference_url: sanitizeUrl(editingRule.reference_url),
      reference_label: editingRule.reference_label?.trim() || '',
      sort_order: Number(editingRule.sort_order) || rules.length + 1,
      is_published: editingRule.is_published !== false,
      updated_at: new Date().toISOString()
    };

    setIsLoading(true);
    try {
      if (sbConfig.connected && supabaseRef.current) {
        if (editingRule.id) {
          const { error } = await supabaseRef.current.from('rules').update(payload).eq('id', editingRule.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseRef.current.from('rules').insert(payload);
          if (error) throw error;
        }
        await fetchAllFromSupabase();
      } else {
        if (editingRule.id) {
          setRules((prev) => prev.map((r) => (r.id === editingRule.id ? { ...r, ...payload } : r)));
        } else {
          setRules((prev) => [...prev, { ...payload, id: 'rule-' + Date.now() }]);
        }
      }
      await recordAuditLog(editingRule.id ? 'UPDATE_RULE' : 'CREATE_RULE', 'rules', `[${payload.rule_code}] ${payload.title}`);
      notify('success', editingRule.id ? 'อัปเดตกฎระเบียบเรียบร้อยแล้ว' : 'เพิ่มกฎระเบียบใหม่เรียบร้อยแล้ว');
      setEditingRule(null);
    } catch (err) {
      notify('error', 'บันทึกกฎไม่สำเร็จ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Rule with Confirmation Modal
  const requestDeleteRule = (rule) => {
    setConfirmDialog({
      title: 'ยืนยันการลบกฎระเบียบ',
      message: `คุณต้องการลบกฎ "[${rule.rule_code}] ${rule.title}" ออกจากฐานข้อมูลถาวรใช่หรือไม่?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsLoading(true);
        try {
          if (sbConfig.connected && supabaseRef.current) {
            const { error } = await supabaseRef.current.from('rules').delete().eq('id', rule.id);
            if (error) throw error;
            await fetchAllFromSupabase();
          } else {
            setRules((prev) => prev.filter((r) => r.id !== rule.id));
          }
          await recordAuditLog('DELETE_RULE', 'rules', `[${rule.rule_code}] ${rule.title}`);
          notify('success', 'ลบกฎระเบียบเรียบร้อยแล้ว');
        } catch (err) {
          notify('error', 'ลบกฎไม่สำเร็จ: ' + err.message);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Reorder Rule
  const moveRuleOrder = async (index, direction) => {
    const sorted = [...rules].sort((a, b) => a.sort_order - b.sort_order);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    const updated = sorted.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    setRules(updated);

    if (sbConfig.connected && supabaseRef.current) {
      await Promise.all(
        updated.map((r) => supabaseRef.current.from('rules').update({ sort_order: r.sort_order }).eq('id', r.id))
      );
    }
    await recordAuditLog('REORDER_RULES', 'rules', `Reordered rule [${temp.rule_code}]`);
  };

  // Save Category
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory.name?.trim()) {
      notify('error', 'กรุณากรอกชื่อหมวดหมู่');
      return;
    }

    const payload = {
      name: editingCategory.name.trim(),
      slug: editingCategory.slug?.trim() || editingCategory.name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: editingCategory.description?.trim() || '',
      badge_code: editingCategory.badge_code?.trim() || `SEC-0${categories.length + 1}`,
      sort_order: Number(editingCategory.sort_order) || categories.length + 1,
      updated_at: new Date().toISOString()
    };

    try {
      if (sbConfig.connected && supabaseRef.current) {
        if (editingCategory.id) {
          const { error } = await supabaseRef.current.from('categories').update(payload).eq('id', editingCategory.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseRef.current.from('categories').insert(payload);
          if (error) throw error;
        }
        await fetchAllFromSupabase();
      } else {
        if (editingCategory.id) {
          setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? { ...c, ...payload } : c)));
        } else {
          setCategories((prev) => [...prev, { ...payload, id: 'cat-' + Date.now() }]);
        }
      }
      await recordAuditLog(editingCategory.id ? 'UPDATE_CATEGORY' : 'CREATE_CATEGORY', 'categories', payload.name);
      notify('success', 'บันทึกหมวดหมู่เรียบร้อยแล้ว');
      setEditingCategory(null);
    } catch (err) {
      notify('error', 'บันทึกหมวดหมู่ไม่สำเร็จ: ' + err.message);
    }
  };

  // Delete Category
  const requestDeleteCategory = (cat) => {
    setConfirmDialog({
      title: 'ยืนยันการลบหมวดหมู่',
      message: `การลบหมวดหมู่ "${cat.name}" อาจส่งผลต่อกฎที่อยู่ในหมวดหมู่นี้ ยืนยันการลบหรือไม่?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          if (sbConfig.connected && supabaseRef.current) {
            const { error } = await supabaseRef.current.from('categories').delete().eq('id', cat.id);
            if (error) throw error;
            await fetchAllFromSupabase();
          } else {
            setCategories((prev) => prev.filter((c) => c.id !== cat.id));
            setRules((prev) => prev.filter((r) => r.category_id !== cat.id));
          }
          await recordAuditLog('DELETE_CATEGORY', 'categories', cat.name);
          notify('success', 'ลบหมวดหมู่เรียบร้อยแล้ว');
        } catch (err) {
          notify('error', 'ลบหมวดหมู่ไม่สำเร็จ: ' + err.message);
        }
      }
    });
  };

  // Save Quick Link
  const handleSaveLink = async (e) => {
    e.preventDefault();
    const safeUrl = sanitizeUrl(editingLink.url);
    if (!editingLink.label?.trim() || !safeUrl) {
      notify('error', 'กรุณากรอกชื่อลิงก์และ URL ที่ขึ้นต้นด้วย https:// หรือ http://');
      return;
    }

    const payload = {
      label: editingLink.label.trim(),
      url: safeUrl,
      description: editingLink.description?.trim() || '',
      icon_name: editingLink.icon_name || 'Globe',
      sort_order: Number(editingLink.sort_order) || quickLinks.length + 1,
      is_active: editingLink.is_active !== false,
      updated_at: new Date().toISOString()
    };

    try {
      if (sbConfig.connected && supabaseRef.current) {
        if (editingLink.id) {
          const { error } = await supabaseRef.current.from('quick_links').update(payload).eq('id', editingLink.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseRef.current.from('quick_links').insert(payload);
          if (error) throw error;
        }
        await fetchAllFromSupabase();
      } else {
        if (editingLink.id) {
          setQuickLinks((prev) => prev.map((l) => (l.id === editingLink.id ? { ...l, ...payload } : l)));
        } else {
          setQuickLinks((prev) => [...prev, { ...payload, id: 'lnk-' + Date.now() }]);
        }
      }
      await recordAuditLog(editingLink.id ? 'UPDATE_LINK' : 'CREATE_LINK', 'quick_links', payload.label);
      notify('success', 'บันทึกลิงก์เว็บไซต์เรียบร้อยแล้ว');
      setEditingLink(null);
    } catch (err) {
      notify('error', 'บันทึกลิงก์ไม่สำเร็จ: ' + err.message);
    }
  };

  // Delete Quick Link
  const requestDeleteLink = (link) => {
    setConfirmDialog({
      title: 'ยืนยันการลบลิงก์',
      message: `ต้องการลบลิงก์ "${link.label}" ใช่หรือไม่?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        if (sbConfig.connected && supabaseRef.current) {
          await supabaseRef.current.from('quick_links').delete().eq('id', link.id);
          await fetchAllFromSupabase();
        } else {
          setQuickLinks((prev) => prev.filter((l) => l.id !== link.id));
        }
        await recordAuditLog('DELETE_LINK', 'quick_links', link.label);
        notify('success', 'ลบลิงก์เรียบร้อยแล้ว');
      }
    });
  };

  // Save Website Settings & Theme
  const handleSaveThemeSettings = async () => {
    const cleanSettings = {
      ...draftSettings,
      id: 1,
      logo_url: sanitizeUrl(draftSettings.logo_url),
      bg_image_url: sanitizeUrl(draftSettings.bg_image_url),
      updated_at: new Date().toISOString()
    };

    setIsLoading(true);
    try {
      if (sbConfig.connected && supabaseRef.current) {
        const { error } = await supabaseRef.current.from('website_settings').upsert(cleanSettings);
        if (error) throw error;
        await fetchAllFromSupabase();
      } else {
        setSettings(cleanSettings);
      }
      setPreviewThemeActive(false);
      await recordAuditLog('UPDATE_SETTINGS', 'website_settings', 'Updated website branding, colors & cyber theme');
      notify('success', 'บันทึกการตั้งค่าและเผยแพร่ธีมใหม่ให้ผู้เล่นทุกคนเห็นทันทีแล้ว!');
    } catch (err) {
      notify('error', 'บันทึกการตั้งค่าไม่สำเร็จ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backupPayload = {
      system: 'SIGMA_TOWN_RULES_2126',
      exported_at: new Date().toISOString(),
      website_settings: settings,
      categories,
      rules,
      quick_links: quickLinks
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sigma-town-rules-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    recordAuditLog('EXPORT_BACKUP', 'all_tables', 'Exported full JSON system snapshot');
    notify('success', 'ดาวน์โหลดไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว');
  };

  // Import JSON Backup with Validation & Confirmation
  const handleImportBackupFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.system !== 'SIGMA_TOWN_RULES_2126' || !Array.isArray(parsed.rules) || !Array.isArray(parsed.categories)) {
          throw new Error('รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้องหรือไม่ใช่ไฟล์ของ Sigma Town Rules');
        }

        setConfirmDialog({
          title: 'ยืนยันการกู้คืนข้อมูลจากไฟล์ Backup',
          message: `ตรวจพบกฎ ${parsed.rules.length} ข้อ และหมวดหมู่ ${parsed.categories.length} หมวดหมู่ ต้องการเขียนทับข้อมูลปัจจุบันใช่หรือไม่?`,
          onConfirm: async () => {
            setConfirmDialog(null);
            if (parsed.website_settings) {
              setSettings(parsed.website_settings);
              setDraftSettings(parsed.website_settings);
            }
            setCategories(parsed.categories);
            setRules(parsed.rules);
            if (Array.isArray(parsed.quick_links)) setQuickLinks(parsed.quick_links);

            if (sbConfig.connected && supabaseRef.current) {
              if (parsed.website_settings) await supabaseRef.current.from('website_settings').upsert(parsed.website_settings);
              await supabaseRef.current.from('categories').upsert(parsed.categories);
              await supabaseRef.current.from('rules').upsert(parsed.rules);
              if (Array.isArray(parsed.quick_links)) await supabaseRef.current.from('quick_links').upsert(parsed.quick_links);
              await fetchAllFromSupabase();
            }

            await recordAuditLog('IMPORT_BACKUP', 'all_tables', `Restored ${parsed.rules.length} rules from JSON backup`);
            notify('success', 'กู้คืนข้อมูลทั้งหมดจากไฟล์สำรองเรียบร้อยแล้ว');
          }
        });
      } catch (err) {
        notify('error', err.message || 'ไม่สามารถอ่านไฟล์ JSON ได้');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Copy text helper
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    notify('success', `คัดลอก ${label} ไปยังคลิปบอร์ดแล้ว`);
  };

  // Download file helper
  const downloadTextFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Computed Dynamic Theme Styles
  const glowAlpha = Math.max(0.1, Math.min(1, (activeTheme.glow_intensity || 75) / 100));
  const primaryGlowStyle = {
    boxShadow: `0 0 ${Math.round(28 * glowAlpha)}px ${activeTheme.primary_color}55, inset 0 0 ${Math.round(12 * glowAlpha)}px ${activeTheme.primary_color}22`
  };
  const gradientBgStyle = {
    background: `linear-gradient(${activeTheme.gradient_direction || '135deg'}, ${activeTheme.gradient_start || '#FF003C'}, ${activeTheme.gradient_end || '#7A001D'})`
  };

  // --------------------------------------------------------------------------
  // 7. RENDER UI
  // --------------------------------------------------------------------------
  return (
    <div
      className="min-h-screen relative overflow-x-hidden selection:bg-rose-600 selection:text-white transition-colors duration-300"
      style={{
        backgroundColor: activeTheme.bg_color || '#07070B',
        color: activeTheme.text_color || '#FFFFFF',
        fontFamily: `'${activeTheme.body_font || 'Prompt'}', sans-serif`
      }}
    >
      {/* Custom Keyframes & Scrollbar Styling */}
      <style>{`
        .font-cyber { font-family: '${activeTheme.heading_font || 'Orbitron'}', '${activeTheme.body_font || 'Prompt'}', sans-serif; }
        .font-tech { font-family: '${activeTheme.heading_font || 'Rajdhani'}', '${activeTheme.body_font || 'Prompt'}', sans-serif; }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.95; }
        }
        .cyber-grid-bg {
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .glass-panel {
          background: rgba(14, 15, 22, 0.72);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.11);
        }
        .glass-panel-light {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }
      `}</style>

      {/* Ambient Background Layers */}
      {activeTheme.bg_image_url && (
        <div
          className="fixed inset-0 bg-cover bg-center opacity-25 pointer-events-none z-0"
          style={{ backgroundImage: `url("${activeTheme.bg_image_url}")` }}
        />
      )}
      <div className="fixed inset-0 cyber-grid-bg pointer-events-none z-0" />
      <div
        className="fixed -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-[150px] pointer-events-none z-0"
        style={{ backgroundColor: activeTheme.primary_color, opacity: 0.22 * glowAlpha }}
      />
      <div
        className="fixed top-1/3 -right-40 w-[460px] h-[460px] rounded-full blur-[160px] pointer-events-none z-0"
        style={{ backgroundColor: activeTheme.gradient_end, opacity: 0.2 * glowAlpha }}
      />

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce">
          <div
            className="glass-panel px-5 py-3.5 rounded-xl flex items-center gap-3 shadow-2xl border"
            style={{
              borderColor: toast.type === 'error' ? '#FF003C' : toast.type === 'success' ? '#10B981' : '#FFFFFF44'
            }}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-white shrink-0" />
            )}
            <span className="text-sm font-medium text-white">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal (Replaces window.confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-rose-500/40 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">{confirmDialog.title}</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-600/30 transition"
              >
                ยืนยันดำเนินการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Connection Setup Modal */}
      {showSbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border border-white/15 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-rose-500" />
                <h3 className="text-lg font-bold font-cyber tracking-wide">SUPABASE CENTRAL LINK</h3>
              </div>
              <button onClick={() => setShowSbModal(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              เชื่อมต่อฐานข้อมูลกลาง Supabase ของคุณแบบเรียลไทม์ ระบบจะใช้เฉพาะ <strong className="text-white">Project URL</strong> และ <strong className="text-white">Public Anon Key</strong> เท่านั้น (ห้ามใส่ Service Role Key ในฝั่ง Frontend เด็ดขาด)
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Supabase Project URL</label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={sbInputUrl}
                  onChange={(e) => setSbInputUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Supabase Anon Public Key</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={sbInputKey}
                  onChange={(e) => setSbInputKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${sbConfig.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {sbConfig.connected ? 'เชื่อมต่อฐานข้อมูลจริงแล้ว' : 'โหมด Local Sandbox พร้อมใช้งาน'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSbModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button
                    onClick={() => {
                      if (!sbInputUrl.startsWith('https://') || !sbInputKey.trim()) {
                        notify('error', 'กรุณากรอก URL (https://) และ Anon Key ให้ถูกต้อง');
                        return;
                      }
                      setSbConfig((prev) => ({ ...prev, url: sbInputUrl.trim(), anonKey: sbInputKey.trim() }));
                      setShowSbModal(false);
                      notify('success', 'กำลังซิงโครไนซ์กับฐานข้อมูลกลาง Supabase...');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    เชื่อมต่อทันที
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TOP NAVIGATION BAR (FUTURISTIC 2126 HUD)
      ==================================================================== */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div
            onClick={() => setViewMode('player')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {activeTheme.logo_url ? (
              <img
                src={activeTheme.logo_url}
                alt={activeTheme.site_name}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-white/20"
              />
            ) : (
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-white/25 transition-transform group-hover:scale-105"
                style={{ ...gradientBgStyle, ...primaryGlowStyle }}
              >
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cyber font-black text-base sm:text-xl tracking-wider text-white">
                  {activeTheme.site_name}
                </span>
                <span
                  className="hidden sm:inline-block text-[10px] font-cyber font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: activeTheme.primary_color,
                    color: activeTheme.primary_color,
                    backgroundColor: `${activeTheme.primary_color}18`
                  }}
                >
                  2126
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-tech tracking-widest uppercase">
                CENTRAL METROPOLIS DIRECTIVE NETWORK
              </p>
            </div>
          </div>

          {/* Desktop Action Controls */}
          <div className="hidden md:flex items-center gap-3">
            {/* Database Live Status Pill */}
            <button
              onClick={() => setShowSbModal(true)}
              className="px-3.5 py-2 rounded-xl glass-panel-light hover:bg-white/10 text-xs font-medium flex items-center gap-2 transition"
              title="ตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase"
            >
              <span className={`w-2 h-2 rounded-full animate-pulse ${sbConfig.connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span className="font-tech tracking-wider text-gray-200">
                {sbConfig.connected ? 'SUPABASE LIVE SYNC' : 'CONNECT SUPABASE'}
              </span>
            </button>

            {/* View Switcher: Citizen Rulebook vs Admin Command Center */}
            <div className="p-1 rounded-xl bg-black/50 border border-white/10 flex items-center">
              <button
                onClick={() => setViewMode('player')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  viewMode === 'player'
                    ? 'bg-white text-black shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>กฎระเบียบเมือง</span>
              </button>
              <button
                onClick={() => setViewMode('admin')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                  viewMode === 'admin'
                    ? 'text-white shadow-lg'
                    : 'text-gray-300 hover:text-white'
                }`}
                style={viewMode === 'admin' ? gradientBgStyle : {}}
              >
                {adminUser ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Admin Center</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl glass-panel-light text-white"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-4 pt-2 border-t border-white/10 space-y-2 bg-black/90 backdrop-blur-xl">
            <button
              onClick={() => { setViewMode('player'); setMobileMenuOpen(false); }}
              className={`w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
                viewMode === 'player' ? 'bg-white text-black' : 'glass-panel-light text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>หน้าอ่านกฎสำหรับผู้เล่น (Citizen View)</span>
            </button>
            <button
              onClick={() => { setViewMode('admin'); setMobileMenuOpen(false); }}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5 text-white"
              style={gradientBgStyle}
            >
              <Lock className="w-4 h-4" />
              <span>ระบบจัดการ Admin & SQL Blueprint</span>
            </button>
            <button
              onClick={() => { setShowSbModal(true); setMobileMenuOpen(false); }}
              className="w-full px-4 py-3 rounded-xl glass-panel-light text-xs font-medium flex items-center justify-between text-gray-200"
            >
              <span>การเชื่อมต่อฐานข้อมูล Supabase</span>
              <span className={sbConfig.connected ? 'text-emerald-400' : 'text-rose-400'}>
                {sbConfig.connected ? 'ONLINE' : 'SETUP'}
              </span>
            </button>
          </div>
        )}
      </header>

      {/* Live Preview Active Indicator Banner */}
      {viewMode === 'admin' && adminTab === 'theme' && previewThemeActive && (
        <div className="bg-amber-500 text-black px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-3 sticky top-16 sm:top-20 z-30">
          <Eye className="w-4 h-4" />
          <span>กำลังแสดงตัวอย่างธีมแบบ Real-Time Preview (ยังไม่ได้บันทึกขึ้นฐานข้อมูลกลาง)</span>
          <button
            onClick={handleSaveThemeSettings}
            className="px-3 py-1 rounded-lg bg-black text-white hover:bg-gray-900 transition"
          >
            บันทึกและเผยแพร่ทันที
          </button>
        </div>
      )}

      {/* ====================================================================
          VIEW 1: PUBLIC PLAYER RULEBOOK HUB (NO LOGIN REQUIRED)
      ==================================================================== */}
      {viewMode === 'player' && (
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
          {/* HERO SECTION */}
          <section
            className="relative rounded-3xl p-6 sm:p-10 lg:p-12 mb-8 overflow-hidden glass-panel border"
            style={{
              borderColor: `${activeTheme.primary_color}55`,
              ...primaryGlowStyle
            }}
          >
            {/* Top Neon Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1" style={gradientBgStyle} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 text-xs font-tech tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: activeTheme.primary_color }} />
                  <span>OFFICIAL METROPOLIS PROTOCOL • UPDATED {formatDateTime(activeTheme.updated_at)}</span>
                </div>

                <h1 className="font-cyber text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  {activeTheme.hero_title}
                </h1>

                <p className="text-sm sm:text-base text-gray-200/90 leading-relaxed max-w-3xl">
                  {activeTheme.site_description}
                </p>

                {/* Welcome Notice Ticker Box */}
                {activeTheme.welcome_message && (
                  <div
                    className="p-4 rounded-2xl bg-black/50 border-l-4 text-xs sm:text-sm text-gray-100 flex items-start gap-3"
                    style={{ borderLeftColor: activeTheme.primary_color }}
                  >
                    <Sparkles className="w-5 h-5 shrink-0 mt-0.5" style={{ color: activeTheme.primary_color }} />
                    <span>{activeTheme.welcome_message}</span>
                  </div>
                )}
              </div>

              {/* Right Telemetry HUD Stats */}
              <div className="lg:col-span-4 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="glass-panel-light rounded-2xl p-4 sm:p-5 border border-white/10">
                  <div className="text-xs text-gray-400 font-tech uppercase tracking-wider mb-1">กฎระเบียบทั้งหมด</div>
                  <div className="font-cyber text-3xl sm:text-4xl font-black text-white">
                    {rules.filter((r) => r.is_published !== false).length}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: activeTheme.primary_color }}>
                    ACTIVE DIRECTIVES
                  </div>
                </div>

                <div className="glass-panel-light rounded-2xl p-4 sm:p-5 border border-white/10">
                  <div className="text-xs text-gray-400 font-tech uppercase tracking-wider mb-1">อัปเดตล่าสุด (24 ชม.)</div>
                  <div className="font-cyber text-3xl sm:text-4xl font-black text-white">
                    {recentRulesCount}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1">
                    RECENT UPDATES
                  </div>
                </div>

                <div className="col-span-2 glass-panel-light rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400 font-tech uppercase tracking-wider">ยืนยันรับทราบกฎแล้ว</div>
                    <div className="font-cyber text-xl font-bold text-white mt-0.5">
                      {totalConfirmationsCount.toLocaleString()} <span className="text-xs font-normal text-gray-400">ครั้ง</span>
                    </div>
                  </div>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${activeTheme.primary_color}22`, color: activeTheme.primary_color }}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* QUICK LINKS BAR (ADMIN MANAGED) */}
          {quickLinks.filter((l) => l.is_active).length > 0 && (
            <section className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {quickLinks
                  .filter((l) => l.is_active)
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((link) => {
                    const IconComp = ICON_MAP[link.icon_name] || Globe;
                    return (
                      <a
                        key={link.id}
                        href={sanitizeUrl(link.url) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group glass-panel rounded-2xl p-4 flex items-center justify-between gap-3 hover:-translate-y-0.5 transition-all duration-200 border border-white/10 hover:border-white/30"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                            style={gradientBgStyle}
                          >
                            <IconComp className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-cyber text-xs font-bold tracking-wider text-white truncate">
                              {link.label}
                            </div>
                            <div className="text-xs text-gray-400 truncate mt-0.5">
                              {link.description || link.url}
                            </div>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white shrink-0" />
                      </a>
                    );
                  })}
              </div>
            </section>
          )}

          {/* SEARCH & CATEGORY FILTER CONTROL DECK */}
          <section className="glass-panel rounded-2xl p-4 sm:p-5 mb-8 border border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Real-Time Search Bar */}
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหากฎระเบียบ รหัสกฎ (เช่น LAW-01) หรือคำสำคัญ..."
                  className="w-full pl-12 pr-10 py-3 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-rose-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter: Recently Updated Toggle */}
              <button
                onClick={() => setOnlyRecentFilter(!onlyRecentFilter)}
                className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border transition ${
                  onlyRecentFilter
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-black/40 border-white/15 text-gray-300 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>อัปเดตล่าสุด ({recentRulesCount})</span>
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                  selectedCategory === 'ALL'
                    ? 'text-white border-transparent shadow-lg'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
                style={selectedCategory === 'ALL' ? gradientBgStyle : {}}
              >
                ทั้งหมด ({rules.filter((r) => r.is_published !== false).length})
              </button>

              {categories
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((cat) => {
                  const count = rules.filter((r) => r.is_published !== false && r.category_id === cat.id).length;
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border flex items-center gap-2 ${
                        active
                          ? 'text-white border-transparent shadow-lg'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                      style={active ? gradientBgStyle : {}}
                    >
                      <span className="font-cyber text-[10px] opacity-80">{cat.badge_code}</span>
                      <span>{cat.name}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px]">{count}</span>
                    </button>
                  );
                })}
            </div>
          </section>

          {/* RULES LISTING GRID */}
          <section className="space-y-4">
            {filteredRules.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center border border-white/10">
                <Search className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">ไม่พบกฎระเบียบที่ตรงกับเงื่อนไขการค้นหา</h3>
                <p className="text-sm text-gray-400 mb-4">ลองเปลี่ยนคำค้นหา หรือเลือกดูหมวดหมู่ทั้งหมด</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setOnlyRecentFilter(false); }}
                  className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-gray-200 transition"
                >
                  รีเซ็ตตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              filteredRules.map((rule) => {
                const categoryObj = categories.find((c) => c.id === rule.category_id);
                const isConfirmed = confirmedRuleIds.includes(rule.id);
                const recent = isRecentlyUpdated(rule.updated_at);
                const isLongText = rule.content.length > 260;
                const isExpanded = expandedRuleId === rule.id;

                return (
                  <article
                    key={rule.id}
                    className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 hover:border-white/25 transition-all duration-200 relative overflow-hidden"
                  >
                    {/* Left Severity Indicator Bar */}
                    <div
                      className="absolute top-0 bottom-0 left-0 w-1.5"
                      style={{
                        backgroundColor:
                          rule.severity === 'ZERO-TOLERANCE'
                            ? '#FF003C'
                            : rule.severity === 'CRITICAL'
                            ? '#F59E0B'
                            : '#FFFFFF'
                      }}
                    />

                    <div className="pl-2 sm:pl-3">
                      {/* Rule Header Meta */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="font-cyber text-xs font-bold px-2.5 py-1 rounded-lg text-white"
                            style={gradientBgStyle}
                          >
                            {rule.rule_code}
                          </span>

                          {categoryObj && (
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-gray-200 font-medium">
                              {categoryObj.name}
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-cyber font-bold px-2.5 py-1 rounded-lg border ${
                              rule.severity === 'ZERO-TOLERANCE'
                                ? 'border-rose-500/50 bg-rose-500/15 text-rose-300'
                                : rule.severity === 'CRITICAL'
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                                : 'border-white/20 bg-white/5 text-gray-300'
                            }`}
                          >
                            {rule.severity}
                          </span>

                          {recent && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> UPDATED
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          อัปเดต: {formatDateTime(rule.updated_at)}
                        </span>
                      </div>

                      {/* Rule Title */}
                      <h2 className="text-lg sm:text-xl font-bold text-white mb-2.5 leading-snug">
                        {rule.title}
                      </h2>

                      {/* Rule Long Content */}
                      <div className="text-sm sm:text-[15px] text-gray-200/90 leading-relaxed whitespace-pre-line">
                        {isLongText && !isExpanded ? `${rule.content.slice(0, 260)}...` : rule.content}
                      </div>

                      {isLongText && (
                        <button
                          onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                          className="mt-2 text-xs font-semibold underline underline-offset-4"
                          style={{ color: activeTheme.primary_color }}
                        >
                          {isExpanded ? 'ย่อข้อความ' : 'อ่านรายละเอียดทั้งหมด'}
                        </button>
                      )}

                      {/* Attached Image Preview if provided */}
                      {rule.image_url && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-white/15 max-w-xl">
                          <img
                            src={rule.image_url}
                            alt={rule.title}
                            className="w-full h-auto max-h-72 object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Footer Actions: Reference Link + Read Confirmation Button */}
                      <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          {rule.reference_url && (
                            <a
                              href={rule.reference_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{rule.reference_label || 'เปิดลิงก์เอกสารประกอบ'}</span>
                            </a>
                          )}
                        </div>

                        {activeTheme.enable_read_confirmation && (
                          <button
                            onClick={() => handleAcknowledgeRule(rule.id)}
                            disabled={isConfirmed}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                              isConfirmed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                                : 'bg-white text-black hover:bg-gray-200 shadow-md'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isConfirmed ? 'ยืนยันว่าอ่านกฎนี้แล้ว ✓' : 'ยืนยันว่าอ่านกฎแล้ว'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </main>
      )}

      {/* ====================================================================
          VIEW 2: ADMIN AUTHENTICATION & CENTRAL COMMAND DASHBOARD
      ==================================================================== */}
      {viewMode === 'admin' && (
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
          {!adminUser ? (
            /* ----------------------------------------------------------------
               ADMIN LOGIN PORTAL (NO HARDCODED PASSWORDS)
            ---------------------------------------------------------------- */
            <div className="max-w-md mx-auto mt-8">
              <div
                className="glass-panel rounded-3xl p-7 sm:p-8 border relative overflow-hidden"
                style={{ borderColor: `${activeTheme.primary_color}66`, ...primaryGlowStyle }}
              >
                <div className="absolute top-0 left-0 right-0 h-1" style={gradientBgStyle} />

                <div className="text-center mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-white/25"
                    style={gradientBgStyle}
                  >
                    <Lock className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="font-cyber text-xl sm:text-2xl font-black tracking-wide">
                    ADMIN COMMAND ACCESS
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    ยืนยันตัวตนผ่าน Supabase Auth & Row Level Security (RLS)
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1.5">อีเมลผู้ดูแลระบบ (Admin Email)</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@sigmatown.gg"
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-300 mb-1.5">รหัสผ่าน (Password)</label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition hover:opacity-95"
                    style={gradientBgStyle}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{authLoading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบฐานข้อมูลกลาง'}</span>
                  </button>
                </form>

                {/* Connection & Sandbox Helper Controls */}
                <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setShowSbModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium flex items-center justify-between text-gray-200 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-rose-500" />
                      <span>1. ตั้งค่า Supabase URL & Anon Key</span>
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={enterSandboxAdmin}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium flex items-center justify-between text-gray-200 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span>2. ทดสอบใช้งาน Dashboard & คัดลอก SQL Blueprint</span>
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ----------------------------------------------------------------
               AUTHENTICATED ADMIN WORKSPACE
            ---------------------------------------------------------------- */
            <div className="space-y-6">
              {/* Admin Top Status Bar */}
              <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/15 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={gradientBgStyle}>
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-cyber text-sm sm:text-base font-bold text-white">
                        {adminUser.display_name || adminUser.email}
                      </span>
                      <span className="text-[10px] font-cyber px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        ROLE: ADMIN
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      โหมดฐานข้อมูล: {sbConfig.connected ? 'Supabase Cloud Realtime Connected' : 'Local Interactive Sandbox (พร้อมส่งออก SQL & JSON)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {sbConfig.connected && (
                    <button
                      onClick={() => fetchAllFromSupabase()}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>ซิงค์ข้อมูล</span>
                    </button>
                  )}
                  <button
                    onClick={handleAdminLogout}
                    className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              </div>

              {/* Admin Module Navigation Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'rules', label: 'จัดการกฎระเบียบ', icon: BookOpen },
                  { id: 'categories', label: 'หมวดหมู่กฎ', icon: FolderKanban },
                  { id: 'links', label: 'จัดการลิงก์', icon: Link2 },
                  { id: 'theme', label: 'ปรับแต่งเว็บ & ธีม', icon: Palette },
                  { id: 'logs', label: 'ประวัติการแก้ไข', icon: History },
                  { id: 'backup', label: 'สำรองข้อมูล JSON', icon: Database },
                  { id: 'blueprints', label: 'SQL & คู่มือ Deploy', icon: FileCode }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = adminTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setAdminTab(tab.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 border transition ${
                        active
                          ? 'text-white border-transparent shadow-lg'
                          : 'glass-panel-light border-white/10 text-gray-300 hover:text-white'
                      }`}
                      style={active ? gradientBgStyle : {}}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* --------------------------------------------------------------
                  ADMIN TAB 1: DASHBOARD OVERVIEW
              -------------------------------------------------------------- */}
              {adminTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-panel rounded-2xl p-5 border border-white/10">
                      <div className="text-xs text-gray-400">จำนวนกฎระเบียบทั้งหมด</div>
                      <div className="font-cyber text-3xl font-black mt-1">{rules.length}</div>
                      <div className="text-xs text-emerald-400 mt-2">เผยแพร่แล้ว {rules.filter((r) => r.is_published).length} ข้อ</div>
                    </div>
                    <div className="glass-panel rounded-2xl p-5 border border-white/10">
                      <div className="text-xs text-gray-400">หมวดหมู่กฎระเบียบ</div>
                      <div className="font-cyber text-3xl font-black mt-1">{categories.length}</div>
                      <div className="text-xs text-gray-400 mt-2">โครงสร้างหลักของเมือง</div>
                    </div>
                    <div className="glass-panel rounded-2xl p-5 border border-white/10">
                      <div className="text-xs text-gray-400">ลิงก์ด่วนหน้าเว็บไซต์</div>
                      <div className="font-cyber text-3xl font-black mt-1">{quickLinks.length}</div>
                      <div className="text-xs text-gray-400 mt-2">เปิดใช้งาน {quickLinks.filter((l) => l.is_active).length} ลิงก์</div>
                    </div>
                    <div className="glass-panel rounded-2xl p-5 border border-white/10">
                      <div className="text-xs text-gray-400">ยืนยันอ่านกฎสะสม</div>
                      <div className="font-cyber text-3xl font-black mt-1">{totalConfirmationsCount.toLocaleString()}</div>
                      <div className="text-xs text-rose-400 mt-2">แก้ไขล่าสุด: {formatDateTime(settings.updated_at)}</div>
                    </div>
                  </div>

                  {/* Recent Audit Logs Preview */}
                  <div className="glass-panel rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <History className="w-5 h-5 text-rose-500" />
                        <span>ประวัติการแก้ไขล่าสุด (Recent Audit Logs)</span>
                      </h3>
                      <button
                        onClick={() => setAdminTab('logs')}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        ดูทั้งหมด →
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {auditLogs.slice(0, 6).map((log) => (
                        <div
                          key={log.id}
                          className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-cyber px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {log.action}
                            </span>
                            <span className="text-white font-medium">{log.target_summary}</span>
                          </div>
                          <div className="text-gray-400">
                            โดย {log.actor_email} • {formatDateTime(log.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
                  ADMIN TAB 2: RULES MANAGER (CRUD + REORDER)
              -------------------------------------------------------------- */}
              {adminTab === 'rules' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">จัดการกฎระเบียบเมือง Sigma Town</h3>
                      <p className="text-xs text-gray-400">เพิ่ม แก้ไข ลบ จัดลำดับ แนบรูปภาพ และกำหนดระดับความรุนแรงของกฎ</p>
                    </div>
                    <button
                      onClick={() =>
                        setEditingRule({
                          category_id: categories[0]?.id || '',
                          rule_code: `LAW-0${rules.length + 1}`,
                          title: '',
                          content: '',
                          severity: 'STANDARD',
                          image_url: '',
                          reference_url: '',
                          reference_label: '',
                          sort_order: rules.length + 1,
                          is_published: true
                        })
                      }
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg"
                      style={gradientBgStyle}
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มกฎระเบียบใหม่</span>
                    </button>
                  </div>

                  {/* Rule Editor Form Modal/Card */}
                  {editingRule && (
                    <form onSubmit={handleSaveRule} className="glass-panel rounded-2xl p-6 border border-rose-500/40 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-base">
                          {editingRule.id ? `แก้ไขกฎระเบียบ [${editingRule.rule_code}]` : 'สร้างกฎระเบียบใหม่'}
                        </h4>
                        <button type="button" onClick={() => setEditingRule(null)} className="p-1 hover:bg-white/10 rounded-lg">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">รหัสกฎ (Rule Code)</label>
                          <input
                            type="text"
                            required
                            value={editingRule.rule_code}
                            onChange={(e) => setEditingRule({ ...editingRule, rule_code: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">หมวดหมู่</label>
                          <select
                            value={editingRule.category_id}
                            onChange={(e) => setEditingRule({ ...editingRule, category_id: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-sm text-white"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">ระดับความสำคัญ</label>
                          <select
                            value={editingRule.severity}
                            onChange={(e) => setEditingRule({ ...editingRule, severity: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-sm text-white"
                          >
                            <option value="STANDARD">STANDARD (มาตรฐาน)</option>
                            <option value="CRITICAL">CRITICAL (สำคัญมาก)</option>
                            <option value="ZERO-TOLERANCE">ZERO-TOLERANCE (โทษแบนสูงสุด)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-300 mb-1">หัวข้อกฎระเบียบ</label>
                        <input
                          type="text"
                          required
                          value={editingRule.title}
                          onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                          placeholder="ระบุชื่อกฎระเบียบ..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-300 mb-1">รายละเอียดกฎระเบียบ (รองรับข้อความยาว)</label>
                        <textarea
                          rows={5}
                          required
                          value={editingRule.content}
                          onChange={(e) => setEditingRule({ ...editingRule, content: e.target.value })}
                          placeholder="อธิบายรายละเอียดข้อบังคับและบทลงโทษอย่างชัดเจน..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">URL รูปภาพประกอบ (ไม่บังคับ)</label>
                          <input
                            type="url"
                            value={editingRule.image_url || ''}
                            onChange={(e) => setEditingRule({ ...editingRule, image_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">URL ลิงก์อ้างอิง (ไม่บังคับ)</label>
                          <input
                            type="url"
                            value={editingRule.reference_url || ''}
                            onChange={(e) => setEditingRule({ ...editingRule, reference_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">ข้อความปุ่มลิงก์อ้างอิง</label>
                          <input
                            type="text"
                            value={editingRule.reference_label || ''}
                            onChange={(e) => setEditingRule({ ...editingRule, reference_label: e.target.value })}
                            placeholder="เช่น ดูแผนที่เขตปลอดภัย"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingRule.is_published !== false}
                            onChange={(e) => setEditingRule({ ...editingRule, is_published: e.target.checked })}
                            className="rounded accent-rose-600"
                          />
                          <span>เผยแพร่ให้ผู้เล่นเห็นทันที</span>
                        </label>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => setEditingRule(null)}
                            className="px-4 py-2 rounded-xl bg-white/10 text-xs font-medium"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
                            style={gradientBgStyle}
                          >
                            <Save className="w-4 h-4" />
                            <span>บันทึกกฎระเบียบ</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Rules Management Table */}
                  <div className="space-y-2.5">
                    {[...rules]
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((rule, idx) => {
                        const cat = categories.find((c) => c.id === rule.category_id);
                        return (
                          <div
                            key={rule.id}
                            className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-cyber text-xs font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                                  {rule.rule_code}
                                </span>
                                <span className="text-xs text-gray-400">{cat?.name || 'ไม่มีหมวดหมู่'}</span>
                                {!rule.is_published && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">ซ่อนอยู่</span>
                                )}
                              </div>
                              <div className="font-bold text-sm sm:text-base text-white">{rule.title}</div>
                              <div className="text-xs text-gray-400 line-clamp-1">{rule.content}</div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => moveRuleOrder(idx, -1)}
                                disabled={idx === 0}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30"
                                title="เลื่อนขึ้น"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveRuleOrder(idx, 1)}
                                disabled={idx === rules.length - 1}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30"
                                title="เลื่อนลง"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingRule(rule)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                                title="แก้ไข"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => requestDeleteRule(rule)}
                                className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300"
                                title="ลบกฎ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
                  ADMIN TAB 3: CATEGORIES MANAGER
              -------------------------------------------------------------- */}
              {adminTab === 'categories' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">จัดการหมวดหมู่กฎระเบียบ</h3>
                      <p className="text-xs text-gray-400">สร้าง แก้ไข และจัดระเบียบหมวดหมู่ของเมือง</p>
                    </div>
                    <button
                      onClick={() =>
                        setEditingCategory({
                          name: '',
                          slug: '',
                          description: '',
                          badge_code: `SEC-0${categories.length + 1}`,
                          sort_order: categories.length + 1
                        })
                      }
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2"
                      style={gradientBgStyle}
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มหมวดหมู่ใหม่</span>
                    </button>
                  </div>

                  {editingCategory && (
                    <form onSubmit={handleSaveCategory} className="glass-panel rounded-2xl p-6 border border-rose-500/40 space-y-4">
                      <h4 className="font-bold text-base">{editingCategory.id ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">รหัสหมวดหมู่ (เช่น SEC-01)</label>
                          <input
                            type="text"
                            value={editingCategory.badge_code}
                            onChange={(e) => setEditingCategory({ ...editingCategory, badge_code: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-300 mb-1">ชื่อหมวดหมู่</label>
                          <input
                            type="text"
                            required
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">คำอธิบายหมวดหมู่</label>
                        <input
                          type="text"
                          value={editingCategory.description || ''}
                          onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 rounded-xl bg-white/10 text-xs">
                          ยกเลิก
                        </button>
                        <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold text-white" style={gradientBgStyle}>
                          บันทึกหมวดหมู่
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((cat) => (
                        <div key={cat.id} className="glass-panel rounded-2xl p-5 border border-white/10 flex items-start justify-between gap-4">
                          <div>
                            <span className="font-cyber text-xs px-2 py-0.5 rounded bg-white/10 text-rose-400">
                              {cat.badge_code}
                            </span>
                            <h4 className="font-bold text-base mt-2">{cat.name}</h4>
                            <p className="text-xs text-gray-400 mt-1">{cat.description}</p>
                            <div className="text-[11px] text-gray-500 mt-2">
                              จำนวนกฎในหมวดนี้: {rules.filter((r) => r.category_id === cat.id).length} ข้อ
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setEditingCategory(cat)}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => requestDeleteCategory(cat)}
                              className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
                  ADMIN TAB 4: QUICK LINKS MANAGER
              -------------------------------------------------------------- */}
              {adminTab === 'links' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">จัดการลิงก์เว็บไซต์ด่วน (Quick Links)</h3>
                      <p className="text-xs text-gray-400">เพิ่ม แก้ไข ลบ จัดลำดับ และเปิด/ปิดการแสดงผลลิงก์ Discord, Connect, Portal</p>
                    </div>
                    <button
                      onClick={() =>
                        setEditingLink({
                          label: '',
                          url: 'https://',
                          description: '',
                          icon_name: 'Globe',
                          sort_order: quickLinks.length + 1,
                          is_active: true
                        })
                      }
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2"
                      style={gradientBgStyle}
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มลิงก์ใหม่</span>
                    </button>
                  </div>

                  {editingLink && (
                    <form onSubmit={handleSaveLink} className="glass-panel rounded-2xl p-6 border border-rose-500/40 space-y-4">
                      <h4 className="font-bold text-base">{editingLink.id ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์ใหม่'}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">ชื่อลิงก์ที่แสดง</label>
                          <input
                            type="text"
                            required
                            value={editingLink.label}
                            onChange={(e) => setEditingLink({ ...editingLink, label: e.target.value })}
                            placeholder="เช่น DISCORD SERVER"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">URL ปลายทาง</label>
                          <input
                            type="url"
                            required
                            value={editingLink.url}
                            onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">ไอคอน</label>
                          <select
                            value={editingLink.icon_name}
                            onChange={(e) => setEditingLink({ ...editingLink, icon_name: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/15 text-sm text-white"
                          >
                            {Object.keys(ICON_MAP).map((iconKey) => (
                              <option key={iconKey} value={iconKey}>{iconKey}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-300 mb-1">คำอธิบายลิงก์</label>
                          <input
                            type="text"
                            value={editingLink.description || ''}
                            onChange={(e) => setEditingLink({ ...editingLink, description: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                        <div className="pt-4">
                          <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingLink.is_active !== false}
                              onChange={(e) => setEditingLink({ ...editingLink, is_active: e.target.checked })}
                              className="accent-rose-600"
                            />
                            <span>เปิดใช้งานการแสดงผล</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingLink(null)} className="px-4 py-2 rounded-xl bg-white/10 text-xs">
                          ยกเลิก
                        </button>
                        <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold text-white" style={gradientBgStyle}>
                          บันทึกลิงก์
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2.5">
                    {quickLinks
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((link) => {
                        const IconComp = ICON_MAP[link.icon_name] || Globe;
                        return (
                          <div key={link.id} className="glass-panel rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={gradientBgStyle}>
                                <IconComp className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm">{link.label}</span>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded ${
                                      link.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'
                                    }`}
                                  >
                                    {link.is_active ? 'ACTIVE' : 'HIDDEN'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400">{link.url} — {link.description}</div>
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setEditingLink(link)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => requestDeleteLink(link)}
                                className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
                  ADMIN TAB 5: WEBSITE CUSTOMIZER & LIVE THEME PREVIEW
              -------------------------------------------------------------- */}
              {adminTab === 'theme' && (
                <div className="space-y-6">
                  <div className="glass-panel rounded-2xl p-5 border border-white/15 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">ปรับแต่งเว็บไซต์ ธีม และระบบสี (Live Theme Studio)</h3>
                      <p className="text-xs text-gray-400">ปรับแต่งทุกองค์ประกอบ พร้อมดูตัวอย่างแบบ Real-Time ก่อนกดบันทึกให้ผู้เล่นทุกคนเห็น</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPreviewThemeActive(!previewThemeActive)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition ${
                          previewThemeActive
                            ? 'bg-amber-400 text-black border-amber-300'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        <span>{previewThemeActive ? 'กำลังเปิด Live Preview' : 'เปิดโหมด Preview ก่อนบันทึก'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftSettings(DEFAULT_SETTINGS)}
                        className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>ค่าเริ่มต้น</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveThemeSettings}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg"
                        style={gradientBgStyle}
                      >
                        <Save className="w-4 h-4" />
                        <span>บันทึกและเผยแพร่ทันที</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Mini Hero Card Preview */}
                  <div
                    className="rounded-2xl p-6 border relative overflow-hidden"
                    style={{
                      backgroundColor: draftSettings.bg_color,
                      color: draftSettings.text_color,
                      borderColor: `${draftSettings.primary_color}66`,
                      boxShadow: `0 0 ${Math.round(30 * (draftSettings.glow_intensity / 100))}px ${draftSettings.primary_color}44`
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{
                        background: `linear-gradient(${draftSettings.gradient_direction}, ${draftSettings.gradient_start}, ${draftSettings.gradient_end})`
                      }}
                    />
                    <div className="text-[10px] font-cyber uppercase tracking-widest opacity-70 mb-2">
                      LIVE HERO & GRADIENT PREVIEW CARD
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-cyber text-xs font-bold" style={{ color: draftSettings.primary_color }}>
                          {draftSettings.site_name}
                        </div>
                        <h4 className="font-cyber text-xl sm:text-2xl font-black mt-1">{draftSettings.hero_title}</h4>
                        <p className="text-xs opacity-80 mt-1 max-w-2xl">{draftSettings.site_description}</p>
                      </div>
                      <span
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                        style={{
                          background: `linear-gradient(${draftSettings.gradient_direction}, ${draftSettings.gradient_start}, ${draftSettings.gradient_end})`
                        }}
                      >
                        SAMPLE NEON BUTTON
                      </span>
                    </div>
                  </div>

                  {/* Settings Form Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Column 1: Text & Branding */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider text-rose-400">1. ข้อมูลเว็บไซต์และข้อความหลัก</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">ชื่อเว็บไซต์ (Site Name)</label>
                          <input
                            type="text"
                            value={draftSettings.site_name}
                            onChange={(e) => setDraftSettings({ ...draftSettings, site_name: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-300 mb-1">URL โลโก้เว็บไซต์</label>
                          <input
                            type="url"
                            value={draftSettings.logo_url || ''}
                            onChange={(e) => setDraftSettings({ ...draftSettings, logo_url: e.target.value })}
                            placeholder="https://... (เว้นว่างเพื่อใช้โลโก้ Shield 2126)"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-300 mb-1">ชื่อหัวข้อหลัก (Hero Title)</label>
                        <input
                          type="text"
                          value={draftSettings.hero_title}
                          onChange={(e) => setDraftSettings({ ...draftSettings, hero_title: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-300 mb-1">คำอธิบายเว็บไซต์</label>
                        <textarea
                          rows={2}
                          value={draftSettings.site_description}
                          onChange={(e) => setDraftSettings({ ...draftSettings, site_description: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-300 mb-1">ข้อความต้อนรับ (Welcome Notice)</label>
                        <input
                          type="text"
                          value={draftSettings.welcome_message}
                          onChange={(e) => setDraftSettings({ ...draftSettings, welcome_message: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-300 mb-1">ข้อความ Footer</label>
                        <input
                          type="text"
                          value={draftSettings.footer_text}
                          onChange={(e) => setDraftSettings({ ...draftSettings, footer_text: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                        />
                      </div>

                      <div className="pt-2">
                        <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draftSettings.enable_read_confirmation}
                            onChange={(e) => setDraftSettings({ ...draftSettings, enable_read_confirmation: e.target.checked })}
                            className="accent-rose-600 w-4 h-4"
                          />
                          <span>เปิดใช้งานปุ่ม "ยืนยันว่าอ่านกฎแล้ว" สำหรับผู้เล่น</span>
                        </label>
                      </div>
                    </div>

                    {/* Column 2: Colors, Gradient & Glow Intensity */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider text-rose-400">2. ฟอนต์ ระบบสี Gradient และเอฟเฟกต์แสง Neon</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">ฟอนต์เนื้อหาหลัก (Body & Thai Font)</label>
                          <select
                            value={draftSettings.body_font || 'Prompt'}
                            onChange={(e) => setDraftSettings({ ...draftSettings, body_font: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl bg-black/80 border border-white/15 text-xs text-white"
                          >
                            {FONT_OPTIONS.body.map((f) => (
                              <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">ฟอนต์หัวข้อหลัก (Heading & Cyber Font)</label>
                          <select
                            value={draftSettings.heading_font || 'Orbitron'}
                            onChange={(e) => setDraftSettings({ ...draftSettings, heading_font: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl bg-black/80 border border-white/15 text-xs text-white"
                          >
                            {FONT_OPTIONS.heading.map((f) => (
                              <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-300 mb-1">URL ภาพพื้นหลัง (Background Image)</label>
                        <input
                          type="url"
                          value={draftSettings.bg_image_url || ''}
                          onChange={(e) => setDraftSettings({ ...draftSettings, bg_image_url: e.target.value })}
                          placeholder="https://... (เว้นว่างเพื่อใช้พื้นหลัง Cyber Grid 2126)"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">สีพื้นหลัง</label>
                          <input
                            type="color"
                            value={draftSettings.bg_color}
                            onChange={(e) => setDraftSettings({ ...draftSettings, bg_color: e.target.value })}
                            className="w-full h-10 rounded-lg bg-transparent cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">สีตัวอักษร</label>
                          <input
                            type="color"
                            value={draftSettings.text_color}
                            onChange={(e) => setDraftSettings({ ...draftSettings, text_color: e.target.value })}
                            className="w-full h-10 rounded-lg bg-transparent cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">สีหลัก (Primary)</label>
                          <input
                            type="color"
                            value={draftSettings.primary_color}
                            onChange={(e) => setDraftSettings({ ...draftSettings, primary_color: e.target.value })}
                            className="w-full h-10 rounded-lg bg-transparent cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">สีรอง (Secondary)</label>
                          <input
                            type="color"
                            value={draftSettings.secondary_color}
                            onChange={(e) => setDraftSettings({ ...draftSettings, secondary_color: e.target.value })}
                            className="w-full h-10 rounded-lg bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">สี Gradient เริ่มต้น</label>
                          <input
                            type="color"
                            value={draftSettings.gradient_start}
                            onChange={(e) => setDraftSettings({ ...draftSettings, gradient_start: e.target.value })}
                            className="w-full h-10 rounded-lg bg-transparent cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">สี Gradient ปลายทาง</label>
                          <input
                            type="color"
                            value={draftSettings.gradient_end}
                            onChange={(e) => setDraftSettings({ ...draftSettings, gradient_end: e.target.value })}
                            className="w-full h-10 rounded-lg bg-transparent cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">ทิศทางการไล่เฉดสี</label>
                          <select
                            value={draftSettings.gradient_direction}
                            onChange={(e) => setDraftSettings({ ...draftSettings, gradient_direction: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl bg-black/80 border border-white/15 text-xs text-white"
                          >
                            <option value="90deg">แนวนอนซ้ายไปขวา (90deg)</option>
                            <option value="135deg">แนวทแยง Cyber (135deg)</option>
                            <option value="180deg">แนวตั้งบนลงล่าง (180deg)</option>
                            <option value="45deg">แนวทแยงขึ้น (45deg)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-gray-300 mb-1">
                          <span>ความสว่างและความเข้มของเอฟเฟกต์ Neon Glow</span>
                          <span className="font-cyber text-rose-400">{draftSettings.glow_intensity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={draftSettings.glow_intensity}
                          onChange={(e) => setDraftSettings({ ...draftSettings, glow_intensity: Number(e.target.value) })}
                          className="w-full accent-rose-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
                  ADMIN TAB 6: AUDIT LOGS VIEWER
              -------------------------------------------------------------- */}
              {adminTab === 'logs' && (
                <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-rose-500" />
                    <span>บันทึกประวัติการแก้ไขระบบทั้งหมด (Audit Logs)</span>
                  </h3>
                  <div className="space-y-2.5">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-xl bg-black/50 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-cyber px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {log.action}
                          </span>
                          <span className="font-mono text-gray-400">[{log.target_table}]</span>
                          <span className="text-white font-medium">{log.target_summary}</span>
                        </div>
                        <div className="text-gray-400">
                          ผู้ดำเนินการ: <strong className="text-gray-200">{log.actor_email}</strong> • {formatDateTime(log.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
                  ADMIN TAB 7: BACKUP & RESTORE SYSTEM
              -------------------------------------------------------------- */}
              {adminTab === 'backup' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Download className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold">ส่งออกข้อมูลสำรอง (Export JSON Snapshot)</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      สำรองข้อมูลกฎระเบียบทั้งหมด หมวดหมู่ การตั้งค่าธีมเว็บไซต์ และลิงก์ด่วนออกมาเป็นไฟล์ JSON มาตรฐาน เพื่อเก็บรักษาความปลอดภัยของข้อมูล
                    </p>
                    <button
                      onClick={handleExportBackup}
                      className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>ดาวน์โหลดไฟล์สำรองข้อมูล (.JSON)</span>
                    </button>
                  </div>

                  <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold">กู้คืนข้อมูลจากไฟล์สำรอง (Import JSON)</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      นำเข้าไฟล์สำรองข้อมูล JSON ระบบจะตรวจสอบโครงสร้างความถูกต้องและแสดงหน้าต่างยืนยันก่อนเขียนทับข้อมูลเดิมเพื่อป้องกันอุบัติเหตุ
                    </p>
                    <label className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black hover:bg-gray-200 text-xs font-bold cursor-pointer transition">
                      <Upload className="w-4 h-4" />
                      <span>เลือกไฟล์ Backup (.JSON) เพื่อกู้คืน</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportBackupFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
                  ADMIN TAB 8: COMPLETE SQL SCHEMA, ENV & DEPLOYMENT BLUEPRINTS
              -------------------------------------------------------------- */}
              {adminTab === 'blueprints' && (
                <div className="glass-panel rounded-2xl p-6 border border-white/15 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-rose-500" />
                        <span>ชุดไฟล์ติดตั้งระบบจริง (SQL Schema, RLS, .env & Vercel Guide)</span>
                      </h3>
                      <p className="text-xs text-gray-400">
                        คัดลอกหรือดาวน์โหลดไฟล์โครงสร้างฐานข้อมูล Supabase และคู่มือ Deploy ขึ้นระบบออนไลน์จริงได้ทันที
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'sql', label: '1. schema.sql (ตาราง + RLS)' },
                        { id: 'env', label: '2. .env.example' },
                        { id: 'admin', label: '3. สร้าง Admin คนแรก' },
                        { id: 'deploy', label: '4. คู่มือติดตั้ง & Deploy Vercel' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setBlueprintTab(item.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                            blueprintTab === item.id
                              ? 'bg-rose-600 text-white'
                              : 'bg-white/10 text-gray-300 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {blueprintTab === 'sql' && (
                    <div className="space-y-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => copyToClipboard(SUPABASE_SQL_SCHEMA, 'schema.sql')}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอก SQL</span>
                        </button>
                        <button
                          onClick={() => downloadTextFile(SUPABASE_SQL_SCHEMA, 'sigma_town_schema.sql')}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ดาวน์โหลด schema.sql</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-black/80 border border-white/10 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[460px]">
                        {SUPABASE_SQL_SCHEMA}
                      </pre>
                    </div>
                  )}

                  {blueprintTab === 'env' && (
                    <div className="space-y-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => copyToClipboard(ENV_EXAMPLE_CONTENT, '.env.example')}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอก .env.example</span>
                        </button>
                        <button
                          onClick={() => downloadTextFile(ENV_EXAMPLE_CONTENT, '.env.example')}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ดาวน์โหลด .env.example</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-black/80 border border-white/10 text-xs font-mono text-amber-300 overflow-x-auto">
                        {ENV_EXAMPLE_CONTENT}
                      </pre>
                    </div>
                  )}

                  {blueprintTab === 'admin' && (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => copyToClipboard(FIRST_ADMIN_SQL, 'First Admin SQL')}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอกคำสั่ง SQL</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-black/80 border border-white/10 text-xs font-mono text-sky-300 overflow-x-auto">
                        {FIRST_ADMIN_SQL}
                      </pre>
                    </div>
                  )}

                  {blueprintTab === 'deploy' && (
                    <div className="space-y-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => copyToClipboard(DEPLOYMENT_GUIDE_MD, 'Deployment Guide')}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอกคู่มือ</span>
                        </button>
                        <button
                          onClick={() => downloadTextFile(DEPLOYMENT_GUIDE_MD, 'DEPLOYMENT_GUIDE.md')}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ดาวน์โหลด DEPLOYMENT_GUIDE.md</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-black/80 border border-white/10 text-xs font-sans text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {DEPLOYMENT_GUIDE_MD}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ====================================================================
          FOOTER
      ==================================================================== */}
      <footer className="relative z-10 border-t border-white/10 glass-panel mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="font-cyber tracking-wider text-center sm:text-left">
            {activeTheme.footer_text}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>HTTPS ENCRYPTED</span>
            </span>
            <span>•</span>
            <span>RLS ZERO-TRUST PROTECTED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
