-- Task 17 correction: shared sneaker-10-v1 rating rubric.
-- Forward-only. Does not edit accepted Task 11/12 migrations.
--
-- PUBLIC COMPOSITES (Eazy Score, Community Score, My Rating): 0–100, derived.
-- DIMENSIONS: ten equal-weight 0–10 half-step fields (0 is a legitimate score).
-- Retired: manually entered overall; user quality; eazy details (renamed/replaced).

-- ---------------------------------------------------------------------------
-- Helpers: half-step domain and composite derivation
-- ---------------------------------------------------------------------------

create or replace function public.is_half_step_score_0_10(p_value numeric)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_value is not null
    and p_value >= 0
    and p_value <= 10
    and (p_value * 2) = trunc(p_value * 2);
$$;

revoke all on function public.is_half_step_score_0_10(numeric) from public;
revoke all on function public.is_half_step_score_0_10(numeric)
  from anon, authenticated;

create or replace function public.compute_sneaker10_score(
  p_look numeric,
  p_outfit numeric,
  p_material numeric,
  p_craftsmanship numeric,
  p_maintenance numeric,
  p_comfort numeric,
  p_collection numeric,
  p_value numeric,
  p_resale_potential numeric,
  p_acquisition_ease numeric
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select round(
    p_look
    + p_outfit
    + p_material
    + p_craftsmanship
    + p_maintenance
    + p_comfort
    + p_collection
    + p_value
    + p_resale_potential
    + p_acquisition_ease
  )::integer;
$$;

revoke all on function public.compute_sneaker10_score(
  numeric, numeric, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, numeric
) from public;
revoke all on function public.compute_sneaker10_score(
  numeric, numeric, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, numeric
) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- user_ratings: drop incompatible pre-v1 rows (no silent field remapping)
-- ---------------------------------------------------------------------------

delete from public.user_ratings;

alter table public.user_ratings
  drop constraint if exists user_ratings_look_check,
  drop constraint if exists user_ratings_comfort_check,
  drop constraint if exists user_ratings_quality_check,
  drop constraint if exists user_ratings_outfit_check,
  drop constraint if exists user_ratings_value_check,
  drop constraint if exists user_ratings_overall_check;

alter table public.user_ratings
  drop column if exists quality,
  drop column if exists overall;

alter table public.user_ratings
  alter column look type numeric(3, 1) using look::numeric(3, 1),
  alter column comfort type numeric(3, 1) using comfort::numeric(3, 1),
  alter column outfit type numeric(3, 1) using outfit::numeric(3, 1),
  alter column value type numeric(3, 1) using value::numeric(3, 1);

alter table public.user_ratings
  add column if not exists material numeric(3, 1),
  add column if not exists craftsmanship numeric(3, 1),
  add column if not exists maintenance numeric(3, 1),
  add column if not exists collection numeric(3, 1),
  add column if not exists resale_potential numeric(3, 1),
  add column if not exists acquisition_ease numeric(3, 1),
  add column if not exists score integer not null default 0,
  add column if not exists methodology_version text not null default 'sneaker-10-v1';

-- Columns above were nullable during add for material/*; complete product requires all set.
-- With empty table after delete, enforce NOT NULL next.

alter table public.user_ratings
  alter column material set not null,
  alter column craftsmanship set not null,
  alter column maintenance set not null,
  alter column collection set not null,
  alter column resale_potential set not null,
  alter column acquisition_ease set not null,
  alter column look set not null,
  alter column comfort set not null,
  alter column outfit set not null,
  alter column value set not null;

alter table public.user_ratings
  drop constraint if exists user_ratings_look_half_step,
  drop constraint if exists user_ratings_outfit_half_step,
  drop constraint if exists user_ratings_material_half_step,
  drop constraint if exists user_ratings_craftsmanship_half_step,
  drop constraint if exists user_ratings_maintenance_half_step,
  drop constraint if exists user_ratings_comfort_half_step,
  drop constraint if exists user_ratings_collection_half_step,
  drop constraint if exists user_ratings_value_half_step,
  drop constraint if exists user_ratings_resale_potential_half_step,
  drop constraint if exists user_ratings_acquisition_ease_half_step,
  drop constraint if exists user_ratings_score_range,
  drop constraint if exists user_ratings_methodology_version_known;

alter table public.user_ratings
  add constraint user_ratings_look_half_step
    check (look >= 0 and look <= 10 and (look * 2) = trunc(look * 2)),
  add constraint user_ratings_outfit_half_step
    check (outfit >= 0 and outfit <= 10 and (outfit * 2) = trunc(outfit * 2)),
  add constraint user_ratings_material_half_step
    check (material >= 0 and material <= 10 and (material * 2) = trunc(material * 2)),
  add constraint user_ratings_craftsmanship_half_step
    check (
      craftsmanship >= 0
      and craftsmanship <= 10
      and (craftsmanship * 2) = trunc(craftsmanship * 2)
    ),
  add constraint user_ratings_maintenance_half_step
    check (
      maintenance >= 0
      and maintenance <= 10
      and (maintenance * 2) = trunc(maintenance * 2)
    ),
  add constraint user_ratings_comfort_half_step
    check (comfort >= 0 and comfort <= 10 and (comfort * 2) = trunc(comfort * 2)),
  add constraint user_ratings_collection_half_step
    check (
      collection >= 0
      and collection <= 10
      and (collection * 2) = trunc(collection * 2)
    ),
  add constraint user_ratings_value_half_step
    check (value >= 0 and value <= 10 and (value * 2) = trunc(value * 2)),
  add constraint user_ratings_resale_potential_half_step
    check (
      resale_potential >= 0
      and resale_potential <= 10
      and (resale_potential * 2) = trunc(resale_potential * 2)
    ),
  add constraint user_ratings_acquisition_ease_half_step
    check (
      acquisition_ease >= 0
      and acquisition_ease <= 10
      and (acquisition_ease * 2) = trunc(acquisition_ease * 2)
    ),
  add constraint user_ratings_score_range
    check (score between 0 and 100),
  add constraint user_ratings_methodology_version_known
    check (methodology_version = 'sneaker-10-v1');

-- Server-owned composite + methodology: client cannot disagree on score.
create or replace function public.derive_user_rating_composite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    new.look >= 0 and new.look <= 10 and (new.look * 2) = trunc(new.look * 2)
    and new.outfit >= 0 and new.outfit <= 10
      and (new.outfit * 2) = trunc(new.outfit * 2)
    and new.material >= 0 and new.material <= 10
      and (new.material * 2) = trunc(new.material * 2)
    and new.craftsmanship >= 0 and new.craftsmanship <= 10
      and (new.craftsmanship * 2) = trunc(new.craftsmanship * 2)
    and new.maintenance >= 0 and new.maintenance <= 10
      and (new.maintenance * 2) = trunc(new.maintenance * 2)
    and new.comfort >= 0 and new.comfort <= 10
      and (new.comfort * 2) = trunc(new.comfort * 2)
    and new.collection >= 0 and new.collection <= 10
      and (new.collection * 2) = trunc(new.collection * 2)
    and new.value >= 0 and new.value <= 10
      and (new.value * 2) = trunc(new.value * 2)
    and new.resale_potential >= 0 and new.resale_potential <= 10
      and (new.resale_potential * 2) = trunc(new.resale_potential * 2)
    and new.acquisition_ease >= 0 and new.acquisition_ease <= 10
      and (new.acquisition_ease * 2) = trunc(new.acquisition_ease * 2)
  ) then
    raise exception 'user_ratings dimensions must be 0–10 in 0.5 steps'
      using errcode = '23514';
  end if;

  new.methodology_version := 'sneaker-10-v1';
  new.score := public.compute_sneaker10_score(
    new.look,
    new.outfit,
    new.material,
    new.craftsmanship,
    new.maintenance,
    new.comfort,
    new.collection,
    new.value,
    new.resale_potential,
    new.acquisition_ease
  );
  return new;
end;
$$;

drop trigger if exists user_ratings_derive_composite_trigger on public.user_ratings;
create trigger user_ratings_derive_composite_trigger
  before insert or update of
    look,
    outfit,
    material,
    craftsmanship,
    maintenance,
    comfort,
    collection,
    value,
    resale_potential,
    acquisition_ease,
    score,
    methodology_version
  on public.user_ratings
  for each row
  execute function public.derive_user_rating_composite();

-- ---------------------------------------------------------------------------
-- eazy_assessments: align to the same ten dimensions (deliberate remap)
-- ---------------------------------------------------------------------------

-- Drop rows that cannot map without inventing resale/acquisition semantics.
-- Deterministic seed is reapplied after reset; editorial fixtures are rebuilt.
delete from public.eazy_assessments;

alter table public.eazy_assessments
  drop constraint if exists eazy_assessments_look_check,
  drop constraint if exists eazy_assessments_comfort_check,
  drop constraint if exists eazy_assessments_quality_check,
  drop constraint if exists eazy_assessments_outfit_check,
  drop constraint if exists eazy_assessments_value_check,
  drop constraint if exists eazy_assessments_maintenance_check,
  drop constraint if exists eazy_assessments_material_check,
  drop constraint if exists eazy_assessments_details_check,
  drop constraint if exists eazy_assessments_collection_check,
  drop constraint if exists eazy_assessments_overall_check,
  drop constraint if exists eazy_assessments_score_check;

alter table public.eazy_assessments
  drop column if exists quality,
  drop column if exists details,
  drop column if exists overall;

alter table public.eazy_assessments
  alter column look type numeric(3, 1) using look::numeric(3, 1),
  alter column comfort type numeric(3, 1) using comfort::numeric(3, 1),
  alter column outfit type numeric(3, 1) using outfit::numeric(3, 1),
  alter column value type numeric(3, 1) using value::numeric(3, 1),
  alter column maintenance type numeric(3, 1) using maintenance::numeric(3, 1),
  alter column material type numeric(3, 1) using material::numeric(3, 1),
  alter column collection type numeric(3, 1) using collection::numeric(3, 1);

alter table public.eazy_assessments
  add column if not exists craftsmanship numeric(3, 1),
  add column if not exists resale_potential numeric(3, 1),
  add column if not exists acquisition_ease numeric(3, 1);

alter table public.eazy_assessments
  add constraint eazy_assessments_look_half_step
    check (
      look is null
      or (look >= 0 and look <= 10 and (look * 2) = trunc(look * 2))
    ),
  add constraint eazy_assessments_outfit_half_step
    check (
      outfit is null
      or (outfit >= 0 and outfit <= 10 and (outfit * 2) = trunc(outfit * 2))
    ),
  add constraint eazy_assessments_material_half_step
    check (
      material is null
      or (
        material >= 0
        and material <= 10
        and (material * 2) = trunc(material * 2)
      )
    ),
  add constraint eazy_assessments_craftsmanship_half_step
    check (
      craftsmanship is null
      or (
        craftsmanship >= 0
        and craftsmanship <= 10
        and (craftsmanship * 2) = trunc(craftsmanship * 2)
      )
    ),
  add constraint eazy_assessments_maintenance_half_step
    check (
      maintenance is null
      or (
        maintenance >= 0
        and maintenance <= 10
        and (maintenance * 2) = trunc(maintenance * 2)
      )
    ),
  add constraint eazy_assessments_comfort_half_step
    check (
      comfort is null
      or (
        comfort >= 0
        and comfort <= 10
        and (comfort * 2) = trunc(comfort * 2)
      )
    ),
  add constraint eazy_assessments_collection_half_step
    check (
      collection is null
      or (
        collection >= 0
        and collection <= 10
        and (collection * 2) = trunc(collection * 2)
      )
    ),
  add constraint eazy_assessments_value_half_step
    check (
      value is null
      or (value >= 0 and value <= 10 and (value * 2) = trunc(value * 2))
    ),
  add constraint eazy_assessments_resale_potential_half_step
    check (
      resale_potential is null
      or (
        resale_potential >= 0
        and resale_potential <= 10
        and (resale_potential * 2) = trunc(resale_potential * 2)
      )
    ),
  add constraint eazy_assessments_acquisition_ease_half_step
    check (
      acquisition_ease is null
      or (
        acquisition_ease >= 0
        and acquisition_ease <= 10
        and (acquisition_ease * 2) = trunc(acquisition_ease * 2)
      )
    ),
  add constraint eazy_assessments_score_range
    check (score is null or (score between 0 and 100));

create or replace function public.derive_eazy_assessment_composite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  all_present boolean;
begin
  all_present :=
    new.look is not null
    and new.outfit is not null
    and new.material is not null
    and new.craftsmanship is not null
    and new.maintenance is not null
    and new.comfort is not null
    and new.collection is not null
    and new.value is not null
    and new.resale_potential is not null
    and new.acquisition_ease is not null;

  if all_present then
    if not (
      new.look >= 0 and new.look <= 10 and (new.look * 2) = trunc(new.look * 2)
      and new.outfit >= 0 and new.outfit <= 10
        and (new.outfit * 2) = trunc(new.outfit * 2)
      and new.material >= 0 and new.material <= 10
        and (new.material * 2) = trunc(new.material * 2)
      and new.craftsmanship >= 0 and new.craftsmanship <= 10
        and (new.craftsmanship * 2) = trunc(new.craftsmanship * 2)
      and new.maintenance >= 0 and new.maintenance <= 10
        and (new.maintenance * 2) = trunc(new.maintenance * 2)
      and new.comfort >= 0 and new.comfort <= 10
        and (new.comfort * 2) = trunc(new.comfort * 2)
      and new.collection >= 0 and new.collection <= 10
        and (new.collection * 2) = trunc(new.collection * 2)
      and new.value >= 0 and new.value <= 10
        and (new.value * 2) = trunc(new.value * 2)
      and new.resale_potential >= 0 and new.resale_potential <= 10
        and (new.resale_potential * 2) = trunc(new.resale_potential * 2)
      and new.acquisition_ease >= 0 and new.acquisition_ease <= 10
        and (new.acquisition_ease * 2) = trunc(new.acquisition_ease * 2)
    ) then
      raise exception 'eazy_assessments dimensions must be 0–10 in 0.5 steps'
        using errcode = '23514';
    end if;

    -- Same force as user_ratings: no foreign methodology label with a
    -- sneaker-10-v1-derived composite.
    new.methodology_version := 'sneaker-10-v1';
    new.score := public.compute_sneaker10_score(
      new.look,
      new.outfit,
      new.material,
      new.craftsmanship,
      new.maintenance,
      new.comfort,
      new.collection,
      new.value,
      new.resale_potential,
      new.acquisition_ease
    );
  else
    -- Incomplete editorial rows have no composite (do not leave a stale score).
    new.score := null;
  end if;

  return new;
end;
$$;

drop trigger if exists eazy_assessments_derive_composite_trigger
  on public.eazy_assessments;
create trigger eazy_assessments_derive_composite_trigger
  before insert or update of
    look,
    outfit,
    material,
    craftsmanship,
    maintenance,
    comfort,
    collection,
    value,
    resale_potential,
    acquisition_ease,
    score,
    methodology_version
  on public.eazy_assessments
  for each row
  execute function public.derive_eazy_assessment_composite();

revoke all on function public.derive_user_rating_composite() from public;
revoke all on function public.derive_user_rating_composite() from anon, authenticated;
revoke all on function public.derive_eazy_assessment_composite() from public;
revoke all on function public.derive_eazy_assessment_composite() from anon, authenticated;


-- ---------------------------------------------------------------------------
-- rating_aggregates: ten canonical averages + derived Community Score
-- ---------------------------------------------------------------------------

alter table public.rating_aggregates
  drop constraint if exists rating_aggregates_score_check;

alter table public.rating_aggregates
  drop column if exists quality_avg,
  drop column if exists overall_avg;

alter table public.rating_aggregates
  add column if not exists material_avg numeric(4, 2),
  add column if not exists craftsmanship_avg numeric(4, 2),
  add column if not exists maintenance_avg numeric(4, 2),
  add column if not exists collection_avg numeric(4, 2),
  add column if not exists resale_potential_avg numeric(4, 2),
  add column if not exists acquisition_ease_avg numeric(4, 2),
  add column if not exists methodology_version text;

alter table public.rating_aggregates
  add constraint rating_aggregates_score_range
    check (score is null or (score between 0 and 100));

-- Refresh only methodology-compatible ratings (currently sneaker-10-v1).
create or replace function public.refresh_rating_aggregates(p_product_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.products
    where id = p_product_id
  ) then
    return;
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_product_id::text, 0)
  );

  if not exists (
    select 1
    from public.products
    where id = p_product_id
  ) then
    return;
  end if;

  update public.rating_aggregates as ra
  set
    rating_count = s.rating_count,
    look_avg = s.look_avg,
    outfit_avg = s.outfit_avg,
    material_avg = s.material_avg,
    craftsmanship_avg = s.craftsmanship_avg,
    maintenance_avg = s.maintenance_avg,
    comfort_avg = s.comfort_avg,
    collection_avg = s.collection_avg,
    value_avg = s.value_avg,
    resale_potential_avg = s.resale_potential_avg,
    acquisition_ease_avg = s.acquisition_ease_avg,
    score = s.score,
    methodology_version = s.methodology_version,
    updated_at = now()
  from (
    select
      count(*)::int as rating_count,
      round(avg(ur.look)::numeric, 2) as look_avg,
      round(avg(ur.outfit)::numeric, 2) as outfit_avg,
      round(avg(ur.material)::numeric, 2) as material_avg,
      round(avg(ur.craftsmanship)::numeric, 2) as craftsmanship_avg,
      round(avg(ur.maintenance)::numeric, 2) as maintenance_avg,
      round(avg(ur.comfort)::numeric, 2) as comfort_avg,
      round(avg(ur.collection)::numeric, 2) as collection_avg,
      round(avg(ur.value)::numeric, 2) as value_avg,
      round(avg(ur.resale_potential)::numeric, 2) as resale_potential_avg,
      round(avg(ur.acquisition_ease)::numeric, 2) as acquisition_ease_avg,
      -- Community Score mirrors Eazy: round(sum of unrounded mean dimensions).
      case
        when count(*) = 0 then null
        else round(
          avg(ur.look)
          + avg(ur.outfit)
          + avg(ur.material)
          + avg(ur.craftsmanship)
          + avg(ur.maintenance)
          + avg(ur.comfort)
          + avg(ur.collection)
          + avg(ur.value)
          + avg(ur.resale_potential)
          + avg(ur.acquisition_ease)
        )::int
      end as score,
      case
        when count(*) = 0 then null
        else 'sneaker-10-v1'::text
      end as methodology_version
    from public.user_ratings as ur
    where ur.product_id = p_product_id
      and ur.methodology_version = 'sneaker-10-v1'
  ) as s
  where ra.product_id = p_product_id;
end;
$$;

revoke execute on function public.refresh_rating_aggregates(uuid)
  from public;
revoke execute on function public.refresh_rating_aggregates(uuid)
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Column-level grants: dimensions + private_note only (not score / methodology)
-- ---------------------------------------------------------------------------

revoke insert on table public.user_ratings from authenticated;
revoke update on table public.user_ratings from authenticated;

grant insert (
  product_id,
  user_id,
  look,
  outfit,
  material,
  craftsmanship,
  maintenance,
  comfort,
  collection,
  value,
  resale_potential,
  acquisition_ease,
  private_note
)
  on table public.user_ratings
  to authenticated;

grant update (
  look,
  outfit,
  material,
  craftsmanship,
  maintenance,
  comfort,
  collection,
  value,
  resale_potential,
  acquisition_ease,
  private_note
)
  on table public.user_ratings
  to authenticated;
