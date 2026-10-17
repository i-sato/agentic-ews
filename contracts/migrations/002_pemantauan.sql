-- v0.2: multi-batch, pembaruan harian dari tautan sheet, parameter EWS, ringkasan harian.
-- Jalankan setelah 001.

alter table batch
  add column if not exists sheet_id text,
  add column if not exists sheet_gid text,
  add column if not exists tab_nama text not null default 'All Pendaftar Web',
  add column if not exists dipantau boolean not null default true,
  add column if not exists last_fetch_at timestamptz,
  add column if not exists last_fetch_status text check (last_fetch_status in ('ok','tidak_berubah','gagal','tab_hilang','akses_ditolak')),
  add column if not exists last_fetch_error text,
  add column if not exists last_checksum text;
-- satu batch per ID pelatihan per TA (unggahan/fetch ulang = snapshot baru, bukan batch baru)
create unique index if not exists batch_unik_id_ta on batch(id_pelatihan, tahun) where id_pelatihan is not null;
create unique index if not exists batch_unik_sheet on batch(sheet_id, sheet_gid) where sheet_id is not null;

-- mapping alias dipakai ulang: kunci baris stabil per batch
alter table private.alias_map add column if not exists kunci_baris text;
create unique index if not exists alias_map_kunci on private.alias_map(batch_id, kunci_baris) where kunci_baris is not null;

-- snapshot harian (agregat). Satu per batch per hari (WIB).
alter table snapshot
  add column if not exists tanggal date,
  add column if not exists histogram jsonb,
  add column if not exists total_modul int,
  add column if not exists checksum text,
  add column if not exists berubah boolean default true,
  add column if not exists anomali jsonb default '[]',
  add column if not exists pemicu text check (pemicu in ('cron','manual','unggah'));
create unique index if not exists snapshot_harian on snapshot(batch_id, tanggal);

create table if not exists ews_parameter(
  rule_pack text not null default 'talenta_digital_v1', kunci text not null, nilai numeric not null,
  deskripsi text, diubah_oleh uuid references users(id), diubah_pada timestamptz default now(),
  primary key(rule_pack, kunci));
insert into ews_parameter(rule_pack,kunci,nilai,deskripsi) values
 ('talenta_digital_v1','pantauAkhirPersen',40,'Fase Pantau jika persen durasi berjalan < nilai'),
 ('talenta_digital_v1','aktifAkhirPersen',75,'Fase Akhir jika persen durasi berjalan >= nilai'),
 ('talenta_digital_v1','sisaHariAkhir',7,'Fase Akhir jika sisa hari <= nilai'),
 ('talenta_digital_v1','rKritisAktif',0.75,'Kritis di fase Aktif jika R >= nilai'),
 ('talenta_digital_v1','rKritisAkhir',0.5,'Kritis di fase Akhir jika R >= nilai'),
 ('talenta_digital_v1','staleHari',2,'Data basi jika tidak diperbarui > hari'),
 ('talenta_digital_v1','graceHari',7,'Pemantauan berlanjut N hari setelah tanggal selesai')
 on conflict do nothing;
create table if not exists ews_parameter_log(
  id bigserial primary key, waktu timestamptz default now(), user_id uuid, rule_pack text, kunci text, lama numeric, baru numeric, alasan text);

create table if not exists ews_perubahan_tingkat(
  id uuid primary key default gen_random_uuid(), tanggal date not null, tahun int,
  batch_id uuid references batch(id), -- null = portofolio
  dari text, ke text not null, alasan text, k int, b int, r numeric, fase text, agent_run_id uuid);

create table if not exists fetch_log(
  id uuid primary key default gen_random_uuid(), batch_id uuid references batch(id) on delete cascade,
  waktu timestamptz default now(), pemicu text check (pemicu in ('cron','manual')),
  hasil text, ringkasan jsonb, durasi_ms int, agent_run_id uuid);

create table if not exists ringkasan_harian(
  tanggal date not null, tahun int not null, isi jsonb not null, agent_run_id uuid, primary key(tanggal, tahun));

create table if not exists pengaturan(kunci text primary key, nilai jsonb not null, diubah_pada timestamptz default now());
insert into pengaturan values ('ai_aktif','true'),('pemantauan_harian_aktif','true'),('jam_pemantauan_wib','"07:00"') on conflict do nothing;

alter table agent_runs add column if not exists pemicu text default 'manual' check (pemicu in ('manual','terjadwal'));

do $$ declare t text; begin
 foreach t in array array['ews_parameter','ews_parameter_log','ews_perubahan_tingkat','fetch_log','ringkasan_harian','pengaturan']
 loop execute format('alter table %I enable row level security', t);
      execute format('create policy %I on %I for all using (is_admin()) with check (is_admin())', t||'_admin', t); end loop; end $$;
