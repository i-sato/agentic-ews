-- v0.2.2: minimisasi identitas. Jalankan setelah 001 dan 002.
-- PERINGATAN: menghapus kolom nama dan instansi dari private.alias_map. Nama hanya ada di sheet sumber.
alter table private.alias_map drop column if exists nama;
alter table private.alias_map drop column if exists instansi;
alter table private.alias_map drop column if exists person_key; -- indeksnya ikut terhapus
alter table private.alias_map
  add column if not exists kunci_orang_noreg text,  -- HMAC no. registrasi (tanpa batch), untuk catatan lintas batch bila no. registrasi stabil
  add column if not exists kunci_orang_nama text;   -- HMAC nama ternormalisasi (hash saja; nama tidak disimpan), cadangan bila no. registrasi tidak stabil
create index if not exists alias_map_ko_noreg on private.alias_map(kunci_orang_noreg);
create index if not exists alias_map_ko_nama on private.alias_map(kunci_orang_nama);

alter table pembatalan_catatan add column if not exists mode_kunci text check (mode_kunci in ('noreg','nama')); -- person_key berisi kunci_orang_* sesuai mode

insert into pengaturan values
 ('noreg_stabil_lintas_batch','"belum_diverifikasi"'),  -- ya | tidak | belum_diverifikasi
 ('catatan_lintas_batch_aktif','false')
 on conflict do nothing;
-- Catatan lintas batch ("kemungkinan sama") baru boleh diaktifkan setelah admin memverifikasi apakah no. registrasi
-- tetap sama untuk orang yang sama di batch berbeda. 'ya' -> kunci_orang_noreg; 'tidak' -> kunci_orang_nama.

-- Pembukaan identitas hanya lewat fungsi ini: admin, alasan wajib, selalu tercatat.
create or replace function public.buka_identitas(p_alias text, p_alasan text)
returns text language plpgsql security definer set search_path = public, private as $$
declare v text;
begin
  if not is_admin() then raise exception 'tidak berwenang'; end if;
  if p_alasan is null or length(trim(p_alasan)) < 10 then raise exception 'alasan wajib (minimal 10 karakter)'; end if;
  select no_registrasi into v from private.alias_map where alias = p_alias;
  insert into audit_log(user_id, aksi, objek, alasan) values (auth.uid(), 'buka_identitas', p_alias, p_alasan);
  return v;
end $$;
revoke all on function public.buka_identitas(text, text) from public, anon;
grant execute on function public.buka_identitas(text, text) to authenticated;
