-- One-time backfill: copy legacy users.manager_id into user_managers.
-- Safe to re-run (unique pair + ON CONFLICT). Run after TypeORM sync creates user_managers.

INSERT INTO user_managers (user_id, manager_id)
SELECT id, manager_id
FROM users
WHERE manager_id IS NOT NULL
ON CONFLICT DO NOTHING;
