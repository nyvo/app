-- Add is_favorite column to teacher_locations
alter table teacher_locations
  add column is_favorite boolean not null default false;

-- Ensure at most one favorite per organization
create unique index teacher_locations_one_favorite_per_org
  on teacher_locations (organization_id)
  where (is_favorite = true);
