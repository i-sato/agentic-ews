-- Skema produksi MVP-1. Jalankan di Supabase (akun sendiri).
create extension if not exists pgcrypto;
create schema if not exists private;

create table roles(id text primary key, deskripsi text);
insert into roles values ('admin','Semua peran (MVP-1)'),('operator','MVP-2'),('reviewer','MVP-2'),('viewer','MVP-2');

create table users(
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null, role_id text not null references roles(id) default 'admin',
  aktif boolean not null default true, must_change_password boolean not null default false,
  created_at timestamptz default now());

create table tahun_anggaran(tahun int primary key);
create table pk_dokumen(
  id uuid primary key default gen_random_uuid(), tahun int not null references tahun_anggaran(tahun),
  sumber text not null, storage_path text, checksum text, created_at timestamptz default now());
create table pk_profil(
  id uuid primary key default gen_random_uuid(), tahun int not null references tahun_anggaran(tahun),
  versi int not null default 1, pk_dokumen_id uuid references pk_dokumen(id),
  status text not null check (status in ('terbaca','terbaca_dengan_peringatan','gagal_dibaca')),
  rule_pack text not null default 'talenta_digital_v1',
  profil jsonb not null, peringatan jsonb default '[]', agent_run_id uuid,
  unique (tahun, versi));
create table tim_kerja_registry(
  kode text primary key, nama text not null, rule_pack text, aktif boolean default true);
insert into tim_kerja_registry values ('talenta_digital','Talenta Digital','talenta_digital_v1',true);

create table program_ref(
  id serial primary key, tahun int not null, tema text not null, pelatihan text not null,
  alias text, tautan_contoh text, level text check (level in ('Fundamental','Intermediate')));

create table batch(
  id uuid primary key default gen_random_uuid(),
  id_pelatihan text, tema text, alias text, nama_program text,
  level text check (level in ('Fundamental','Intermediate')),
  level_source text check (level_source in ('nama_berkas','manual','program_ref','belum')),
  tahun int references tahun_anggaran(tahun),
  tanggal_mulai date, tanggal_selesai date, cross_year boolean default false,
  nama_berkas text not null, sheet_url text, total_modul int,
  masuk_capaian_pk boolean not null default false,
  validasi_status text not null default 'perlu_validasi'
    check (validasi_status in ('valid','valid_dengan_peringatan','perlu_validasi','ditolak')),
  created_by uuid references users(id), created_at timestamptz default now());

create table peserta_masked(
  id uuid primary key default gen_random_uuid(), batch_id uuid not null references batch(id) on delete cascade,
  alias text not null, status_daftar text, modul_selesai int not null, total_modul int not null,
  onboarding boolean not null, lulus boolean not null, batal boolean not null default false,
  unique (batch_id, alias));

create table private.alias_map(
  alias text primary key, batch_id uuid not null, nama text, no_registrasi text, instansi text,
  person_key text, created_at timestamptz default now());
create index on private.alias_map(person_key);
create table pembatalan_catatan(
  person_key text primary key, batch_id_asal uuid references batch(id),
  catatan text, dikonfirmasi boolean default false);

create table snapshot(
  id uuid primary key default gen_random_uuid(), batch_id uuid not null references batch(id),
  diambil_pada timestamptz default now(), peserta_aktif int, onboarding int, lulus int,
  capaian numeric, sumber text);

create table validation_items(
  id uuid primary key default gen_random_uuid(), batch_id uuid references batch(id),
  jenis text not null check (jenis in ('level','id_pelatihan','tema_tidak_dikenal','lintas_tahun','lms_tidak_cocok','tab_hilang','pk_formula','lainnya')),
  detail jsonb, saran jsonb, status text default 'terbuka' check (status in ('terbuka','diterima','diubah','ditolak')),
  diputuskan_oleh uuid references users(id), diputuskan_pada timestamptz);

create table ews_hasil(
  id uuid primary key default gen_random_uuid(), tahun int, periode_awal date, periode_akhir date,
  batch_id uuid references batch(id), tingkat text check (tingkat in ('aman','waspada','kritis','belum_dapat_dinilai')),
  metrik jsonb not null, analisis jsonb, agent_run_id uuid, created_at timestamptz default now());

create table laporan(
  id uuid primary key default gen_random_uuid(), tahun int not null, bulan int not null check (bulan between 1 and 12),
  versi int not null default 1, status text not null default 'draf' check (status in ('draf','menunggu_tinjauan','disetujui','dibatalkan')),
  isi jsonb not null, template_versi text, storage_path text, agent_run_id uuid,
  disetujui_oleh uuid references users(id), disetujui_pada timestamptz,
  unique (tahun, bulan, versi));

create table agent_runs(
  id uuid primary key default gen_random_uuid(), jenis text not null,
  status text not null default 'menunggu' check (status in ('menunggu','berjalan','selesai','selesai_dengan_peringatan','perlu_keputusan','gagal','dibatalkan')),
  parameter jsonb, model text, dimulai_oleh uuid references users(id), mulai timestamptz default now(), selesai timestamptz);
create table agent_run_steps(
  id uuid primary key default gen_random_uuid(), run_id uuid not null references agent_runs(id) on delete cascade,
  urutan int not null, nama text not null, alat text, status text not null default 'menunggu',
  ringkasan text, data_dikirim_ai jsonb, durasi_ms int, mulai timestamptz, selesai timestamptz, unique(run_id, urutan));
create table knowledge_sources(
  id uuid primary key default gen_random_uuid(), jenis text not null, judul text not null, versi text, ref text);
create table agent_step_sources(step_id uuid references agent_run_steps(id) on delete cascade, source_id uuid references knowledge_sources(id), primary key(step_id, source_id));

create table audit_log(
  id bigserial primary key, waktu timestamptz default now(), user_id uuid, aksi text not null, objek text, alasan text, detail jsonb);
create table data_subject_requests(
  id uuid primary key default gen_random_uuid(), jenis text, diterima date, tenggat date, status text default 'baru', catatan text);
create table incident_log(
  id uuid primary key default gen_random_uuid(), ditemukan timestamptz, deskripsi text, dampak text, notifikasi_pada timestamptz, status text default 'baru');
create table retention_policy(objek text primary key, retensi_hari int not null, tindakan text not null);
create table privacy_inventory(id serial primary key, aktivitas text, tujuan text, dasar text, data_dipakai text, penerima text, retensi text);

-- RLS
do $$ declare t text; begin
 foreach t in array array['users','pk_dokumen','pk_profil','program_ref','batch','peserta_masked','pembatalan_catatan','snapshot','validation_items','ews_hasil','laporan','agent_runs','agent_run_steps','knowledge_sources','agent_step_sources','audit_log','data_subject_requests','incident_log','retention_policy','privacy_inventory','tahun_anggaran','tim_kerja_registry','roles']
 loop execute format('alter table %I enable row level security', t); end loop; end $$;
alter table private.alias_map enable row level security; -- tanpa policy: hanya service role

create or replace function is_admin() returns boolean language sql stable security definer as
$$ select exists(select 1 from public.users where id = auth.uid() and aktif and role_id='admin') $$;

do $$ declare t text; begin
 foreach t in array array['pk_dokumen','pk_profil','program_ref','batch','peserta_masked','pembatalan_catatan','snapshot','validation_items','ews_hasil','laporan','agent_runs','agent_run_steps','knowledge_sources','agent_step_sources','data_subject_requests','incident_log','retention_policy','privacy_inventory','tahun_anggaran','tim_kerja_registry','roles']
 loop execute format('create policy %I on %I for all using (is_admin()) with check (is_admin())', t||'_admin', t); end loop; end $$;
create policy users_self on users for select using (id = auth.uid() or is_admin());
create policy audit_read on audit_log for select using (is_admin());
-- audit_log: tulis hanya lewat service role (server). Tidak ada policy insert/update/delete untuk klien.

-- Realtime untuk Aktivitas Agent
alter publication supabase_realtime add table agent_runs, agent_run_steps;
