-- 018: Split "A + B" client rows into separate entries, reassigning
-- engagements and projects. Runs idempotently over any remaining combined rows.

DO $$
DECLARE
  r RECORD;
  parts TEXT[];
  name1 TEXT;
  name2 TEXT;
  id1 UUID;
  id2 UUID;
BEGIN
  FOR r IN SELECT id, name FROM clients WHERE name LIKE '%+%' LOOP
    parts := string_to_array(r.name, '+');
    name1 := trim(parts[1]);
    name2 := CASE WHEN array_length(parts,1) >= 2 THEN trim(parts[2]) ELSE NULL END;

    SELECT id INTO id1 FROM clients WHERE lower(name) = lower(name1) LIMIT 1;
    IF id1 IS NULL THEN
      INSERT INTO clients (name, aliases, notes) VALUES (name1, '{}', '') RETURNING id INTO id1;
    END IF;

    id2 := NULL;
    IF name2 IS NOT NULL AND length(name2) > 0 THEN
      SELECT id INTO id2 FROM clients WHERE lower(name) = lower(name2) LIMIT 1;
      IF id2 IS NULL THEN
        INSERT INTO clients (name, aliases, notes) VALUES (name2, '{}', '') RETURNING id INTO id2;
      END IF;
    END IF;

    UPDATE engagements SET client_id = id1 WHERE client_id = r.id;

    UPDATE projects
      SET client_id = id1,
          client_id_2 = COALESCE(client_id_2, id2)
      WHERE client_id = r.id;

    UPDATE projects
      SET client_id_2 = id1
      WHERE client_id_2 = r.id;

    DELETE FROM clients WHERE id = r.id;
  END LOOP;
END $$;
