-- =====================================================================
--  주식회사 채움 · 견적의뢰 시스템 DB 스키마  (Supabase SQL Editor에서 한 번 실행)
--  - 여러 번 실행해도 안전합니다(idempotent).
--  - 테이블은 모두 직접 접근이 막혀 있고(RLS, 정책 없음), 아래 RPC 함수로만 접근합니다.
--  - 로그인 토큰(app_sessions)으로 권한을 판단합니다. 기본 관리자: admin / 1234
--    ※ 운영 시작 직후 관리자 화면 > 사용자 관리에서 반드시 비밀번호를 바꾸세요.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- 테이블
create table if not exists public.companies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,                    -- 의뢰회사명
  biz_no         text not null unique,             -- 사업자등록번호 (숫자 10자리)
  zipcode        text,
  address        text not null,
  address_detail text,
  phone          text not null,                    -- 회사 전화번호
  fax            text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.sites (          -- 사업장 (회사 1 : 사업장 n)
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  site_name   text not null,
  manager     text not null,                       -- 담당자
  contact     text not null,                       -- 담당자 연락처
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sites_company_idx on public.sites(company_id);

create table if not exists public.site_files (     -- 사업장 첨부파일 (실제 파일은 Storage)
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  file_name   text not null,
  file_path   text not null,
  file_size   bigint,
  created_at  timestamptz not null default now()
);
create index if not exists site_files_site_idx on public.site_files(site_id);

create table if not exists public.app_users (      -- 사용자 DB (관리자 + 업체 계정)
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique,                -- 관리자: 아이디 / 업체: 사업자등록번호(숫자)
  pass_hash   text not null,
  role        text not null check (role in ('admin','customer')),
  company_id  uuid references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.app_sessions (
  token       uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.app_users(id) on delete cascade,
  expires_at  timestamptz not null
);

create table if not exists public.login_attempts (
  id        bigserial primary key,
  username  text not null,
  at        timestamptz not null default now()
);
create index if not exists login_attempts_idx on public.login_attempts(username, at);

alter table public.companies      enable row level security;
alter table public.sites          enable row level security;
alter table public.site_files     enable row level security;
alter table public.app_users      enable row level security;
alter table public.app_sessions   enable row level security;
alter table public.login_attempts enable row level security;

revoke all on public.companies, public.sites, public.site_files,
              public.app_users, public.app_sessions, public.login_attempts
  from anon, authenticated;

-- ---------------------------------------------------------------- 내부 헬퍼
create or replace function public._digits(t text) returns text
language sql immutable as $$ select regexp_replace(coalesce(t,''), '\D', '', 'g') $$;

-- 사업자등록번호 검증번호(체크섬) 검사 : 가중치 1,3,7,1,3,7,1,3,5 + 9번째 자리×5÷10
create or replace function public._valid_biz(t text) returns boolean
language plpgsql immutable as $$
declare
  d text := public._digits(t);
  w int[] := array[1,3,7,1,3,7,1,3,5];
  s int := 0;
  i int;
begin
  if length(d) <> 10 then return false; end if;
  for i in 1..9 loop
    s := s + substr(d, i, 1)::int * w[i];
  end loop;
  s := s + (substr(d, 9, 1)::int * 5) / 10;
  return ((10 - (s % 10)) % 10) = substr(d, 10, 1)::int;
end $$;

-- 업체 계정 초기 비밀번호 자동 발급 (0/O, 1/I 등 헷갈리는 문자 제외 · 8자리)
create or replace function public._gen_pw() returns text
language sql volatile set search_path = public, extensions as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1), '')
    from generate_series(1, 8)
$$;

create or replace function public._auth(p_token uuid) returns public.app_users
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users;
begin
  select au.* into u
    from public.app_sessions s join public.app_users au on au.id = s.user_id
   where s.token = p_token and s.expires_at > now();
  if not found then raise exception 'AUTH_REQUIRED'; end if;
  return u;
end $$;

create or replace function public._admin(p_token uuid) returns public.app_users
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users;
begin
  u := public._auth(p_token);
  if u.role <> 'admin' then raise exception 'FORBIDDEN'; end if;
  return u;
end $$;

create or replace function public._company_json(cid uuid) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select to_jsonb(c)
         || jsonb_build_object(
              'username', (select a.username from public.app_users a where a.company_id = c.id limit 1),
              'sites', coalesce((
                select jsonb_agg(
                         to_jsonb(s) || jsonb_build_object('files', coalesce((
                           select jsonb_agg(to_jsonb(f) order by f.created_at)
                             from public.site_files f where f.site_id = s.id), '[]'::jsonb))
                         order by s.created_at)
                  from public.sites s where s.company_id = c.id), '[]'::jsonb))
    from public.companies c where c.id = cid
$$;

-- 회사 + 사업장 + 첨부파일을 한 번에 저장(없는 사업장·파일은 삭제)
create or replace function public._save_company(p_cid uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  cid uuid := p_cid;
  biz text := public._digits(p->>'biz_no');
  s jsonb; f jsonb; sid uuid; fid uuid;
  keep_s uuid[] := '{}';
  keep_f uuid[];
begin
  if coalesce(btrim(p->>'name'), '') = '' then raise exception 'ERR:의뢰회사명을 입력하세요.'; end if;
  if not public._valid_biz(biz) then raise exception 'ERR:사업자등록번호가 올바르지 않습니다.'; end if;
  if coalesce(btrim(p->>'address'), '') = '' then raise exception 'ERR:주소를 검색하여 입력하세요.'; end if;
  if coalesce(btrim(p->>'phone'), '') = '' then raise exception 'ERR:회사 전화번호를 입력하세요.'; end if;

  if cid is null then
    insert into public.companies(name, biz_no, zipcode, address, address_detail, phone, fax)
    values (btrim(p->>'name'), biz, nullif(btrim(p->>'zipcode'), ''), btrim(p->>'address'),
            nullif(btrim(p->>'address_detail'), ''), btrim(p->>'phone'), nullif(btrim(p->>'fax'), ''))
    returning id into cid;
  else
    update public.companies
       set name = btrim(p->>'name'), biz_no = biz,
           zipcode = nullif(btrim(p->>'zipcode'), ''), address = btrim(p->>'address'),
           address_detail = nullif(btrim(p->>'address_detail'), ''),
           phone = btrim(p->>'phone'), fax = nullif(btrim(p->>'fax'), ''), updated_at = now()
     where id = cid;
    if not found then raise exception 'ERR:업체를 찾을 수 없습니다.'; end if;
  end if;

  for s in select * from jsonb_array_elements(coalesce(p->'sites', '[]'::jsonb)) loop
    if coalesce(btrim(s->>'site_name'), '') = '' then raise exception 'ERR:사업장명을 입력하세요.'; end if;
    if coalesce(btrim(s->>'manager'), '') = '' then raise exception 'ERR:담당자를 입력하세요.'; end if;
    if coalesce(btrim(s->>'contact'), '') = '' then raise exception 'ERR:담당자 연락처를 입력하세요.'; end if;

    sid := nullif(s->>'id', '')::uuid;
    if sid is not null and exists (select 1 from public.sites where id = sid and company_id = cid) then
      update public.sites
         set site_name = btrim(s->>'site_name'), manager = btrim(s->>'manager'),
             contact = btrim(s->>'contact'), updated_at = now()
       where id = sid;
    else
      insert into public.sites(company_id, site_name, manager, contact)
      values (cid, btrim(s->>'site_name'), btrim(s->>'manager'), btrim(s->>'contact'))
      returning id into sid;
    end if;
    keep_s := keep_s || sid;

    keep_f := '{}';
    for f in select * from jsonb_array_elements(coalesce(s->'files', '[]'::jsonb)) loop
      fid := nullif(f->>'id', '')::uuid;
      if fid is not null and exists (select 1 from public.site_files where id = fid and site_id = sid) then
        keep_f := keep_f || fid;
      else
        if coalesce(f->>'file_path', '') !~ '^[A-Za-z0-9_./-]{3,200}$' or (f->>'file_path') like '%..%' then
          raise exception 'ERR:첨부파일 정보가 올바르지 않습니다.';
        end if;
        insert into public.site_files(site_id, file_name, file_path, file_size)
        values (sid, left(coalesce(nullif(f->>'file_name', ''), 'file'), 200), f->>'file_path',
                nullif(f->>'file_size', '')::bigint)
        returning id into fid;
        keep_f := keep_f || fid;
      end if;
    end loop;
    delete from public.site_files where site_id = sid and id <> all(keep_f);
  end loop;

  delete from public.sites where company_id = cid and id <> all(keep_s);
  return cid;
exception when unique_violation then
  raise exception 'ERR:이미 등록된 사업자등록번호입니다.';
end $$;

-- ---------------------------------------------------------------- 공개 RPC
-- 로그인 : 실패·잠금은 예외 대신 {ok:false}로 돌려줍니다(실패 기록이 롤백되지 않도록)
create or replace function public.login(p_username text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  uname text := lower(regexp_replace(btrim(coalesce(p_username, '')), '[-\s]', '', 'g'));
  u public.app_users;
  t uuid;
begin
  delete from public.login_attempts where at < now() - interval '1 day';
  if (select count(*) from public.login_attempts
       where username = uname and at > now() - interval '10 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'LOCKED');
  end if;
  select * into u from public.app_users where username = uname;
  if not found or u.pass_hash <> crypt(coalesce(p_password, ''), u.pass_hash) then
    insert into public.login_attempts(username) values (uname);
    return jsonb_build_object('ok', false, 'error', 'BAD_LOGIN');
  end if;
  delete from public.login_attempts where username = uname;
  delete from public.app_sessions where expires_at < now();
  insert into public.app_sessions(user_id, expires_at)
  values (u.id, now() + interval '8 hours') returning token into t;
  return jsonb_build_object('ok', true, 'token', t, 'role', u.role,
                            'username', u.username, 'company_id', u.company_id);
end $$;

create or replace function public.logout(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.app_sessions where token = p_token;
  return jsonb_build_object('ok', true);
end $$;

-- 업체 신규등록 : 회사·사업장·첨부파일 저장 + 사용자 DB에 업체 계정(사업자번호/비밀번호) 생성
create or replace function public.register_company(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  cid uuid;
  biz text := public._digits(p->>'biz_no');
  pw text := nullif(p->>'password', '');
begin
  if pw is null then pw := public._gen_pw();           -- 입력이 없으면 자동 발급
  elsif length(pw) < 4 then raise exception 'ERR:비밀번호는 4자 이상 입력하세요.'; end if;
  if jsonb_array_length(coalesce(p->'sites', '[]'::jsonb)) < 1 then
    raise exception 'ERR:사업장을 1개 이상 입력하세요.';
  end if;
  if exists (select 1 from public.app_users where username = biz) then
    raise exception 'ERR:이미 등록된 사업자등록번호입니다.';
  end if;
  cid := public._save_company(null, p);
  insert into public.app_users(username, pass_hash, role, company_id)
  values (biz, crypt(pw, gen_salt('bf')), 'customer', cid);
  return jsonb_build_object('ok', true, 'company_id', cid, 'username', biz, 'password', pw);
end $$;

-- ---------------------------------------------------------------- 로그인 후 RPC
create or replace function public.my_company(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users;
begin
  u := public._auth(p_token);
  if u.company_id is null then raise exception 'FORBIDDEN'; end if;
  return public._company_json(u.company_id);
end $$;

-- 업체 수정(업체 본인) / 관리자는 신규·수정 모두 가능
create or replace function public.save_company(p_token uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  u public.app_users;
  cid uuid;
  biz text := public._digits(p->>'biz_no');
  pw text := nullif(p->>'password', '');
begin
  u := public._auth(p_token);
  if pw is not null and length(pw) < 4 then raise exception 'ERR:비밀번호는 4자 이상 입력하세요.'; end if;

  if u.role = 'admin' then
    cid := nullif(p->>'id', '')::uuid;
    if cid is null then                               -- 관리자 신규등록
      if pw is null then pw := public._gen_pw(); end if;
      if exists (select 1 from public.app_users where username = biz) then
        raise exception 'ERR:이미 등록된 사업자등록번호입니다.';
      end if;
      cid := public._save_company(null, p);
      insert into public.app_users(username, pass_hash, role, company_id)
      values (biz, crypt(pw, gen_salt('bf')), 'customer', cid);
      return jsonb_build_object('ok', true, 'company_id', cid, 'username', biz, 'password', pw);
    end if;
  else
    cid := u.company_id;
    if cid is null then raise exception 'FORBIDDEN'; end if;
  end if;

  perform public._save_company(cid, p);
  if exists (select 1 from public.app_users where company_id = cid and role = 'customer') then
    update public.app_users set username = biz
     where company_id = cid and role = 'customer' and username <> biz;
    if pw is not null then
      update public.app_users set pass_hash = crypt(pw, gen_salt('bf'))
       where company_id = cid and role = 'customer';
    end if;
  elsif pw is not null then
    insert into public.app_users(username, pass_hash, role, company_id)
    values (biz, crypt(pw, gen_salt('bf')), 'customer', cid);
  end if;
  return jsonb_build_object('ok', true, 'company_id', cid);
exception when unique_violation then
  raise exception 'ERR:이미 등록된 사업자등록번호입니다.';
end $$;

create or replace function public.delete_company(p_token uuid, p_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users; cid uuid;
begin
  u := public._auth(p_token);
  if u.role = 'admin' then cid := p_id; else cid := u.company_id; end if;
  if cid is null then raise exception 'FORBIDDEN'; end if;
  delete from public.companies where id = cid;       -- 사업장·파일·업체 계정까지 함께 삭제
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.delete_site(p_token uuid, p_site_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users;
begin
  u := public._auth(p_token);
  if u.role = 'admin' then
    delete from public.sites where id = p_site_id;
  else
    delete from public.sites where id = p_site_id and company_id = u.company_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- 관리자 전용 RPC
create or replace function public.list_companies(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._admin(p_token);
  return coalesce((select jsonb_agg(public._company_json(c.id) order by c.name) from public.companies c), '[]'::jsonb);
end $$;

create or replace function public.list_users(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._admin(p_token);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id, 'username', a.username, 'role', a.role, 'company_id', a.company_id,
             'company_name', c.name, 'created_at', a.created_at) order by a.created_at)
      from public.app_users a left join public.companies c on c.id = a.company_id), '[]'::jsonb);
end $$;

create or replace function public.save_user(p_token uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  me public.app_users;
  uid uuid := nullif(p->>'id', '')::uuid;
  uname text := lower(regexp_replace(btrim(coalesce(p->>'username', '')), '[-\s]', '', 'g'));
  pw text := nullif(p->>'password', '');
  r text := coalesce(nullif(p->>'role', ''), 'admin');
  cid uuid := nullif(p->>'company_id', '')::uuid;
  old public.app_users;
begin
  me := public._admin(p_token);
  if r not in ('admin', 'customer') then raise exception 'ERR:구분이 올바르지 않습니다.'; end if;
  if r = 'customer' and cid is null then raise exception 'ERR:업체 계정은 업체를 선택하세요.'; end if;
  if r = 'admin' then cid := null; end if;
  if pw is not null and length(pw) < 4 then raise exception 'ERR:비밀번호는 4자 이상 입력하세요.'; end if;

  if uid is null then
    if length(uname) < 2 then raise exception 'ERR:아이디를 2자 이상 입력하세요.'; end if;
    if pw is null then raise exception 'ERR:비밀번호는 4자 이상 입력하세요.'; end if;
    insert into public.app_users(username, pass_hash, role, company_id)
    values (uname, crypt(pw, gen_salt('bf')), r, cid);
  else
    select * into old from public.app_users where id = uid;
    if not found then raise exception 'ERR:사용자를 찾을 수 없습니다.'; end if;
    if old.role = 'admin' and r <> 'admin'
       and not exists (select 1 from public.app_users where role = 'admin' and id <> uid) then
      raise exception 'ERR:마지막 관리자 계정은 변경할 수 없습니다.';
    end if;
    if length(uname) < 2 then uname := old.username; end if;
    update public.app_users
       set username = uname, role = r, company_id = cid,
           pass_hash = case when pw is null then pass_hash else crypt(pw, gen_salt('bf')) end
     where id = uid;
    if pw is not null then delete from public.app_sessions where user_id = uid and uid <> me.id; end if;
  end if;
  return jsonb_build_object('ok', true);
exception when unique_violation then
  raise exception 'ERR:이미 사용 중인 아이디입니다.';
end $$;

create or replace function public.delete_user(p_token uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me public.app_users; t public.app_users;
begin
  me := public._admin(p_token);
  select * into t from public.app_users where id = p_id;
  if not found then return jsonb_build_object('ok', true); end if;
  if t.id = me.id then raise exception 'ERR:로그인 중인 본인 계정은 삭제할 수 없습니다.'; end if;
  if t.role = 'admin' and not exists (select 1 from public.app_users where role = 'admin' and id <> t.id) then
    raise exception 'ERR:마지막 관리자 계정은 삭제할 수 없습니다.';
  end if;
  delete from public.app_users where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.change_password(p_token uuid, p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare u public.app_users;
begin
  u := public._auth(p_token);
  if u.pass_hash <> crypt(coalesce(p_old, ''), u.pass_hash) then raise exception 'ERR:현재 비밀번호가 맞지 않습니다.'; end if;
  if coalesce(length(p_new), 0) < 4 then raise exception 'ERR:새 비밀번호는 4자 이상 입력하세요.'; end if;
  update public.app_users set pass_hash = crypt(p_new, gen_salt('bf')) where id = u.id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- 권한
revoke execute on function public._digits(text), public._valid_biz(text), public._auth(uuid),
  public._admin(uuid), public._company_json(uuid), public._save_company(uuid, jsonb), public._gen_pw()
  from public, anon, authenticated;

grant execute on function
  public.login(text, text), public.logout(uuid), public.register_company(jsonb),
  public.my_company(uuid), public.save_company(uuid, jsonb), public.delete_company(uuid, uuid),
  public.delete_site(uuid, uuid), public.list_companies(uuid), public.list_users(uuid),
  public.save_user(uuid, jsonb), public.delete_user(uuid, uuid),
  public.change_password(uuid, text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------- 기본 관리자 (admin / 1234)
insert into public.app_users(username, pass_hash, role)
values ('admin', extensions.crypt('1234', extensions.gen_salt('bf')), 'admin')
on conflict (username) do nothing;

-- ---------------------------------------------------------------- 파일 저장소 (Storage)
-- 파일 경로는 추측 불가능한 무작위 값이며, 경로 목록은 로그인한 관리자·해당 업체에게만 RPC로 제공됩니다.
insert into storage.buckets (id, name, public, file_size_limit)
values ('quote-files', 'quote-files', true, 10485760)          -- 10MB
on conflict (id) do update set public = true, file_size_limit = 10485760;

drop policy if exists "cheum quote upload" on storage.objects;
create policy "cheum quote upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'quote-files');

notify pgrst, 'reload schema';
