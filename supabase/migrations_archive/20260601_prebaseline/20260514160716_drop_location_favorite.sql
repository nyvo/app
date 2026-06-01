drop index if exists teacher_locations_one_favorite_per_org;
alter table teacher_locations drop column if exists is_favorite;
