BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM staff_users
    WHERE email IS NOT NULL AND btrim(email) <> ''
    GROUP BY lower(btrim(email))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce global staff email uniqueness: duplicate normalized emails must be resolved first';
  END IF;
END $$;

UPDATE staff_users
SET email = NULLIF(lower(btrim(email)), '')
WHERE email IS NOT NULL
  AND email IS DISTINCT FROM NULLIF(lower(btrim(email)), '');

CREATE UNIQUE INDEX staff_users_email_normalized_key
  ON staff_users (lower(btrim(email)))
  WHERE email IS NOT NULL;

CREATE INDEX staff_users_email_idx
  ON staff_users (email)
  WHERE email IS NOT NULL;

COMMIT;
