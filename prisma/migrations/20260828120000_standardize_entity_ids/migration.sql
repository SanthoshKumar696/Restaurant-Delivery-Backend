BEGIN;

-- Preserve every old UUID before changing any primary or foreign-key column.
CREATE TEMP TABLE _tenant_id_map (old_id uuid PRIMARY KEY, new_id varchar(20) NOT NULL);
INSERT INTO _tenant_id_map (old_id, new_id)
SELECT id, 'T' || lpad(row_number() OVER (ORDER BY created_at, id)::text, 3, '0')
FROM tenants;

CREATE TEMP TABLE _branch_id_map (old_id uuid PRIMARY KEY, new_id varchar(20) NOT NULL);
INSERT INTO _branch_id_map (old_id, new_id)
SELECT id, 'B' || lpad(row_number() OVER (ORDER BY created_at, id)::text, 3, '0')
FROM branches;

CREATE TEMP TABLE _id_maps (
    table_oid oid PRIMARY KEY,
    table_name text NOT NULL,
    map_name text NOT NULL,
    column_name text NOT NULL
);

DO $$
DECLARE
    primary_key record;
    map_name text;
BEGIN
    FOR primary_key IN
        SELECT table_ref.oid AS table_oid,
               table_ref.relname AS table_name,
               column_ref.attname AS column_name
        FROM pg_constraint constraint_ref
        JOIN pg_class table_ref ON table_ref.oid = constraint_ref.conrelid
        JOIN pg_namespace namespace_ref ON namespace_ref.oid = table_ref.relnamespace
        JOIN pg_attribute column_ref
          ON column_ref.attrelid = table_ref.oid
         AND column_ref.attnum = constraint_ref.conkey[1]
        WHERE constraint_ref.contype = 'p'
          AND namespace_ref.nspname = 'public'
          AND array_length(constraint_ref.conkey, 1) = 1
          AND column_ref.atttypid = 'uuid'::regtype
          AND table_ref.relname NOT IN ('tenants', 'branches', 'captains', 'tenant_settings', 'branch_settings')
    LOOP
        map_name := '_id_map_' || primary_key.table_oid::text;
        EXECUTE format('CREATE TEMP TABLE %I (old_id uuid PRIMARY KEY, new_id integer NOT NULL)', map_name);
        EXECUTE format(
            'INSERT INTO %I (old_id, new_id) SELECT %I, row_number() OVER (ORDER BY %I)::integer FROM %I',
            map_name,
            primary_key.column_name,
            primary_key.column_name,
            primary_key.table_name
        );
        INSERT INTO _id_maps (table_oid, table_name, map_name, column_name)
        VALUES (primary_key.table_oid, primary_key.table_name, map_name, primary_key.column_name);
    END LOOP;
END $$;

CREATE TEMP TABLE _foreign_keys AS
SELECT constraint_ref.conname,
       constraint_ref.conrelid AS local_table_oid,
       constraint_ref.confrelid AS referenced_table_oid,
       constraint_ref.conkey[1] AS local_column_number,
       pg_get_constraintdef(constraint_ref.oid) AS definition
FROM pg_constraint constraint_ref
JOIN pg_namespace namespace_ref ON namespace_ref.oid = constraint_ref.connamespace
WHERE constraint_ref.contype = 'f'
  AND namespace_ref.nspname = 'public'
  AND array_length(constraint_ref.conkey, 1) = 1;

DO $$
DECLARE
    foreign_key record;
BEGIN
    FOR foreign_key IN SELECT conname, local_table_oid FROM _foreign_keys LOOP
        EXECUTE format(
            'ALTER TABLE %I DROP CONSTRAINT %I',
            (SELECT relname FROM pg_class WHERE oid = foreign_key.local_table_oid),
            foreign_key.conname
        );
    END LOOP;
END $$;

-- Temporarily make all former UUID columns text so old values can be mapped.
DO $$
DECLARE
    column_item record;
BEGIN
    FOR column_item IN
        SELECT table_ref.relname AS table_name, column_catalog.attname AS column_name
        FROM pg_class table_ref
        JOIN pg_namespace namespace_ref ON namespace_ref.oid = table_ref.relnamespace
        JOIN pg_attribute column_catalog ON column_catalog.attrelid = table_ref.oid
        WHERE namespace_ref.nspname = 'public'
                    AND table_ref.relkind = 'r'
          AND column_catalog.atttypid = 'uuid'::regtype
          AND column_catalog.attnum > 0
          AND NOT column_catalog.attisdropped
    LOOP
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE text USING %I::text',
            column_item.table_name,
            column_item.column_name,
            column_item.column_name
        );
    END LOOP;
END $$;

UPDATE tenants tenant_ref
SET id = map_ref.new_id
FROM _tenant_id_map map_ref
WHERE tenant_ref.id = map_ref.old_id::text;

UPDATE branches branch_ref
SET id = map_ref.new_id
FROM _branch_id_map map_ref
WHERE branch_ref.id = map_ref.old_id::text;

DO $$
DECLARE
    id_map record;
BEGIN
    FOR id_map IN SELECT table_name, map_name, column_name FROM _id_maps LOOP
        EXECUTE format(
            'UPDATE %I entity_ref SET %I = map_ref.new_id::text FROM %I map_ref WHERE entity_ref.%I = map_ref.old_id::text',
            id_map.table_name,
            id_map.column_name,
            id_map.map_name,
            id_map.column_name
        );
    END LOOP;

    EXECUTE format(
        'UPDATE captains entity_ref SET id = map_ref.new_id::text FROM %I map_ref WHERE entity_ref.id = map_ref.old_id::text',
        (SELECT map_name FROM _id_maps WHERE table_name = 'staff_users')
    );
END $$;

DO $$
DECLARE
    foreign_key record;
    target_map_name text;
BEGIN
    FOR foreign_key IN
        SELECT foreign_key_ref.*, referenced_table_ref.relname AS referenced_table,
               local_table_ref.relname AS local_table,
               local_column_ref.attname AS local_column
        FROM _foreign_keys foreign_key_ref
        JOIN pg_class referenced_table_ref ON referenced_table_ref.oid = foreign_key_ref.referenced_table_oid
        JOIN pg_class local_table_ref ON local_table_ref.oid = foreign_key_ref.local_table_oid
        JOIN pg_attribute local_column_ref
          ON local_column_ref.attrelid = foreign_key_ref.local_table_oid
         AND local_column_ref.attnum = foreign_key_ref.local_column_number
    LOOP
        target_map_name := CASE foreign_key.referenced_table
            WHEN 'tenants' THEN '_tenant_id_map'
            WHEN 'branches' THEN '_branch_id_map'
            ELSE (SELECT id_map_ref.map_name FROM _id_maps id_map_ref WHERE id_map_ref.table_name = foreign_key.referenced_table)
        END;
        IF target_map_name IS NOT NULL THEN
            EXECUTE format(
                'UPDATE %I entity_ref SET %I = map_ref.new_id::text FROM %I map_ref WHERE entity_ref.%I = map_ref.old_id::text',
                foreign_key.local_table,
                foreign_key.local_column,
                target_map_name,
                foreign_key.local_column
            );
        END IF;
    END LOOP;
END $$;

-- Convert each former UUID primary key and foreign key to its final type.
DO $$
DECLARE
    id_map record;
    foreign_key record;
    referenced_table text;
    target_type text;
BEGIN
    FOR id_map IN SELECT table_name, column_name FROM _id_maps LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE integer USING %I::integer', id_map.table_name, id_map.column_name, id_map.column_name);
    END LOOP;

    ALTER TABLE captains ALTER COLUMN id TYPE integer USING id::integer;
    ALTER TABLE tenants ALTER COLUMN id TYPE varchar(20) USING id::varchar(20);
    ALTER TABLE branches ALTER COLUMN id TYPE varchar(20) USING id::varchar(20);

    FOR foreign_key IN
        SELECT foreign_key_ref.*, referenced_table_ref.relname AS referenced_table
        FROM _foreign_keys foreign_key_ref
        JOIN pg_class referenced_table_ref ON referenced_table_ref.oid = foreign_key_ref.referenced_table_oid
    LOOP
        target_type := CASE
            WHEN foreign_key.referenced_table IN ('tenants', 'branches') THEN 'varchar(20)'
            ELSE 'integer'
        END;
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s',
            (SELECT relname FROM pg_class WHERE oid = foreign_key.local_table_oid),
            (SELECT attname FROM pg_attribute WHERE attrelid = foreign_key.local_table_oid AND attnum = foreign_key.local_column_number),
            target_type,
            (SELECT attname FROM pg_attribute WHERE attrelid = foreign_key.local_table_oid AND attnum = foreign_key.local_column_number),
            target_type
        );
    END LOOP;

    FOR foreign_key IN
        SELECT column_ref.attrelid AS table_oid, table_ref.relname AS table_name, column_ref.attname AS column_name
        FROM pg_class table_ref
        JOIN pg_namespace namespace_ref ON namespace_ref.oid = table_ref.relnamespace
        JOIN pg_attribute column_ref ON column_ref.attrelid = table_ref.oid
        WHERE namespace_ref.nspname = 'public'
                    AND table_ref.relkind = 'r'
          AND column_ref.atttypid = 'text'::regtype
          AND column_ref.attnum > 0
          AND NOT EXISTS (
              SELECT 1 FROM _foreign_keys fk
              WHERE fk.local_table_oid = column_ref.attrelid
                AND fk.local_column_number = column_ref.attnum
          )
          AND NOT (table_ref.relname IN ('tenants', 'branches') AND column_ref.attname = 'id')
          AND (column_ref.attname = 'idempotency_key' OR column_ref.attname = 'entity_id')
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE varchar(100)', foreign_key.table_name, foreign_key.column_name);
    END LOOP;
END $$;

-- Add independent sequences to every converted integer primary key.
DO $$
DECLARE
    id_map record;
    sequence_name text;
BEGIN
    FOR id_map IN SELECT table_name FROM _id_maps LOOP
        sequence_name := id_map.table_name || '_id_seq';
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', sequence_name);
        EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM %I), 1), (SELECT COUNT(*) > 0 FROM %I))', sequence_name, id_map.table_name, id_map.table_name);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L)', id_map.table_name, sequence_name);
        EXECUTE format('ALTER SEQUENCE %I OWNED BY %I.id', sequence_name, id_map.table_name);
    END LOOP;
END $$;

CREATE SEQUENCE IF NOT EXISTS tenant_id_seq;
SELECT setval('tenant_id_seq', COALESCE((SELECT MAX(substring(id FROM 2)::integer) FROM tenants WHERE id ~ '^T[0-9]+$'), 1), (SELECT COUNT(*) > 0 FROM tenants));

CREATE SEQUENCE IF NOT EXISTS branch_id_seq;
SELECT setval('branch_id_seq', COALESCE((SELECT MAX(substring(id FROM 2)::integer) FROM branches WHERE id ~ '^B[0-9]+$'), 1), (SELECT COUNT(*) > 0 FROM branches));

DO $$
DECLARE
    foreign_key record;
BEGIN
    FOR foreign_key IN SELECT conname, local_table_oid, definition FROM _foreign_keys LOOP
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I %s',
            (SELECT relname FROM pg_class WHERE oid = foreign_key.local_table_oid),
            foreign_key.conname,
            foreign_key.definition
        );
    END LOOP;
END $$;

COMMIT;
