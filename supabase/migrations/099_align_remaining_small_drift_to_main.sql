-- Align the last small drift items to the current main DB shape.
-- Safe on both environments.
--
-- Included:
-- - remaining constraint diffs
-- - remaining policy expression diffs
--
-- Excluded:
-- - enum sort_order alignment (would require enum recreation / heavier migration)

BEGIN;

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------
DO $constraints$
BEGIN
  IF to_regclass('public.consultations') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'consultations'
        AND column_name = 'no_show_by'
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.consultations'::regclass
        AND conname = 'consultations_no_show_by_check'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE public.consultations
        ADD CONSTRAINT consultations_no_show_by_check
        CHECK (
          (no_show_by IS NULL)
          OR ((no_show_by)::text = ANY ((ARRAY['customer'::character varying, 'agent'::character varying])::text[]))
        )
      $sql$;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.consultations'::regclass
        AND conname = 'consultations_status_check'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE public.consultations
        DROP CONSTRAINT consultations_status_check,
        ADD CONSTRAINT consultations_status_check
        CHECK (
          ((status)::text = ANY ((ARRAY[
            'requested'::character varying,
            'pending'::character varying,
            'confirmed'::character varying,
            'visited'::character varying,
            'contracted'::character varying,
            'cancelled'::character varying,
            'no_show'::character varying
          ])::text[]))
        )
      $sql$;
    END IF;
  END IF;

  IF to_regclass('public.property_requests') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.property_requests'::regclass
        AND conname = 'property_requests_status_check'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE public.property_requests
        ADD CONSTRAINT property_requests_status_check
        CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
      $sql$;
    END IF;
  END IF;

  IF to_regclass('public.property_agents') IS NOT NULL THEN
    EXECUTE $sql$
      ALTER TABLE public.property_agents
      DROP CONSTRAINT IF EXISTS property_agents_status_check,
      ADD CONSTRAINT property_agents_status_check
      CHECK (
        ((status)::text = ANY ((ARRAY[
          'pending'::character varying,
          'approved'::character varying,
          'rejected'::character varying,
          'withdrawn'::character varying
        ])::text[]))
      )
    $sql$;
  END IF;

  IF to_regclass('public.term_consents') IS NOT NULL THEN
    EXECUTE $sql$
      ALTER TABLE public.term_consents
      DROP CONSTRAINT IF EXISTS term_consents_term_id_fkey,
      ADD CONSTRAINT term_consents_term_id_fkey
        FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE RESTRICT
    $sql$;

    EXECUTE $sql$
      ALTER TABLE public.term_consents
      DROP CONSTRAINT IF EXISTS term_consents_user_id_fkey,
      ADD CONSTRAINT term_consents_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
    $sql$;
  END IF;

  IF to_regclass('public.visit_confirm_requests') IS NOT NULL THEN
    EXECUTE $sql$
      ALTER TABLE public.visit_confirm_requests
      DROP CONSTRAINT IF EXISTS visit_confirm_requests_status_check,
      ADD CONSTRAINT visit_confirm_requests_status_check
      CHECK (
        ((status)::text = ANY ((ARRAY[
          'pending'::character varying,
          'approved'::character varying,
          'rejected'::character varying
        ])::text[]))
      )
    $sql$;
  END IF;

  IF to_regclass('public.visit_logs') IS NOT NULL THEN
    EXECUTE $sql$
      ALTER TABLE public.visit_logs
      DROP CONSTRAINT IF EXISTS visit_logs_method_check,
      ADD CONSTRAINT visit_logs_method_check
      CHECK (
        ((method)::text = ANY ((ARRAY[
          'gps'::character varying,
          'manual'::character varying
        ])::text[]))
      )
    $sql$;
  END IF;
END;
$constraints$;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "properties_affiliated_agent_update" ON public.properties;
CREATE POLICY "properties_affiliated_agent_update"
  ON public.properties
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = properties.id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = properties.id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  );

DROP POLICY IF EXISTS "property_agents_select" ON public.property_agents;
CREATE POLICY "property_agents_select"
  ON public.property_agents
  FOR SELECT
  TO public
  USING (
    (((status)::text = 'approved'::text) OR (agent_id = auth.uid()) OR (
      EXISTS (
        SELECT 1
        FROM profiles
        WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))
      )
    ))
  );

DROP POLICY IF EXISTS "property_facilities_affiliated_agent_manage" ON public.property_facilities;
CREATE POLICY "property_facilities_affiliated_agent_manage"
  ON public.property_facilities
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_facilities.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_facilities.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  );

DROP POLICY IF EXISTS "property_image_assets_delete_manageable" ON public.property_image_assets;
CREATE POLICY "property_image_assets_delete_manageable"
  ON public.property_image_assets
  FOR DELETE
  TO public
  USING (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM properties pr
        WHERE ((pr.id = property_image_assets.property_id) AND (pr.created_by = auth.uid()))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM property_agents pa
        WHERE (
          (pa.property_id = property_image_assets.property_id)
          AND (pa.agent_id = auth.uid())
          AND ((pa.status)::text = 'approved'::text)
        )
      )
    )
  );

DROP POLICY IF EXISTS "property_image_assets_insert_manageable" ON public.property_image_assets;
CREATE POLICY "property_image_assets_insert_manageable"
  ON public.property_image_assets
  FOR INSERT
  TO public
  WITH CHECK (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM properties pr
        WHERE ((pr.id = property_image_assets.property_id) AND (pr.created_by = auth.uid()))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM property_agents pa
        WHERE (
          (pa.property_id = property_image_assets.property_id)
          AND (pa.agent_id = auth.uid())
          AND ((pa.status)::text = 'approved'::text)
        )
      )
    )
  );

DROP POLICY IF EXISTS "property_image_assets_select_manageable" ON public.property_image_assets;
CREATE POLICY "property_image_assets_select_manageable"
  ON public.property_image_assets
  FOR SELECT
  TO public
  USING (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM properties pr
        WHERE ((pr.id = property_image_assets.property_id) AND (pr.created_by = auth.uid()))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM property_agents pa
        WHERE (
          (pa.property_id = property_image_assets.property_id)
          AND (pa.agent_id = auth.uid())
          AND ((pa.status)::text = 'approved'::text)
        )
      )
    )
  );

DROP POLICY IF EXISTS "property_image_assets_update_manageable" ON public.property_image_assets;
CREATE POLICY "property_image_assets_update_manageable"
  ON public.property_image_assets
  FOR UPDATE
  TO public
  USING (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM properties pr
        WHERE ((pr.id = property_image_assets.property_id) AND (pr.created_by = auth.uid()))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM property_agents pa
        WHERE (
          (pa.property_id = property_image_assets.property_id)
          AND (pa.agent_id = auth.uid())
          AND ((pa.status)::text = 'approved'::text)
        )
      )
    )
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM properties pr
        WHERE ((pr.id = property_image_assets.property_id) AND (pr.created_by = auth.uid()))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM property_agents pa
        WHERE (
          (pa.property_id = property_image_assets.property_id)
          AND (pa.agent_id = auth.uid())
          AND ((pa.status)::text = 'approved'::text)
        )
      )
    )
  );

DROP POLICY IF EXISTS "property_locations_affiliated_agent_manage" ON public.property_locations;
CREATE POLICY "property_locations_affiliated_agent_manage"
  ON public.property_locations
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_locations.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_locations.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  );

DROP POLICY IF EXISTS "property_specs_affiliated_agent_manage" ON public.property_specs;
CREATE POLICY "property_specs_affiliated_agent_manage"
  ON public.property_specs
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_specs.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_specs.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  );

DROP POLICY IF EXISTS "property_timeline_affiliated_agent_manage" ON public.property_timeline;
CREATE POLICY "property_timeline_affiliated_agent_manage"
  ON public.property_timeline
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_timeline.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_timeline.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  );

DROP POLICY IF EXISTS "property_unit_types_affiliated_agent_manage" ON public.property_unit_types;
CREATE POLICY "property_unit_types_affiliated_agent_manage"
  ON public.property_unit_types
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_unit_types.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM property_agents pa
      WHERE (
        (pa.property_id = property_unit_types.properties_id)
        AND (pa.agent_id = auth.uid())
        AND ((pa.status)::text = 'approved'::text)
      )
    )
  );

DROP POLICY IF EXISTS "property_validation_profiles_insert_manageable" ON public.property_validation_profiles;
CREATE POLICY "property_validation_profiles_insert_manageable"
  ON public.property_validation_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.deleted_at IS NULL))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM properties pr
        WHERE (((pr.id)::text = property_validation_profiles.property_id) AND (pr.created_by = auth.uid()))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM property_agents pa
        WHERE (
          ((pa.property_id)::text = property_validation_profiles.property_id)
          AND (pa.agent_id = auth.uid())
          AND ((pa.status)::text = 'approved'::text)
        )
      )
    )
  );

DROP POLICY IF EXISTS "property_validation_profiles_select_manageable" ON public.property_validation_profiles;
CREATE POLICY "property_validation_profiles_select_manageable"
  ON public.property_validation_profiles
  FOR SELECT
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.deleted_at IS NULL))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM properties pr
        WHERE (((pr.id)::text = property_validation_profiles.property_id) AND (pr.created_by = auth.uid()))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM property_agents pa
        WHERE (
          ((pa.property_id)::text = property_validation_profiles.property_id)
          AND (pa.agent_id = auth.uid())
          AND ((pa.status)::text = 'approved'::text)
        )
      )
    )
  );

DROP POLICY IF EXISTS "property_validation_profiles_update_manageable" ON public.property_validation_profiles;
CREATE POLICY "property_validation_profiles_update_manageable"
  ON public.property_validation_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.deleted_at IS NULL))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM properties pr
        WHERE (((pr.id)::text = property_validation_profiles.property_id) AND (pr.created_by = auth.uid()))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM property_agents pa
        WHERE (
          ((pa.property_id)::text = property_validation_profiles.property_id)
          AND (pa.agent_id = auth.uid())
          AND ((pa.status)::text = 'approved'::text)
        )
      )
    )
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.deleted_at IS NULL))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM properties pr
        WHERE (((pr.id)::text = property_validation_profiles.property_id) AND (pr.created_by = auth.uid()))
      )
    ) OR (
      EXISTS (
        SELECT 1
        FROM property_agents pa
        WHERE (
          ((pa.property_id)::text = property_validation_profiles.property_id)
          AND (pa.agent_id = auth.uid())
          AND ((pa.status)::text = 'approved'::text)
        )
      )
    )
  );

COMMIT;
