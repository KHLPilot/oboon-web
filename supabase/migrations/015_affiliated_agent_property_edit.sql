BEGIN;

-- 소속(approved) 상담사는 자신이 소속된 현장의 기본 정보 수정 가능
DROP POLICY IF EXISTS "properties_affiliated_agent_update" ON properties;
CREATE POLICY "properties_affiliated_agent_update" ON properties
    FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = properties.id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = properties.id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    );

-- 하위 상세 테이블은 소속 상담사에게 편집(추가/수정/삭제) 허용
DROP POLICY IF EXISTS "property_locations_affiliated_agent_manage" ON property_locations;
CREATE POLICY "property_locations_affiliated_agent_manage" ON property_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_locations.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_locations.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    );

DROP POLICY IF EXISTS "property_specs_affiliated_agent_manage" ON property_specs;
CREATE POLICY "property_specs_affiliated_agent_manage" ON property_specs
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_specs.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_specs.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    );

DROP POLICY IF EXISTS "property_timeline_affiliated_agent_manage" ON property_timeline;
CREATE POLICY "property_timeline_affiliated_agent_manage" ON property_timeline
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_timeline.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_timeline.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    );

DROP POLICY IF EXISTS "property_facilities_affiliated_agent_manage" ON property_facilities;
CREATE POLICY "property_facilities_affiliated_agent_manage" ON property_facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_facilities.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_facilities.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    );

DROP POLICY IF EXISTS "property_unit_types_affiliated_agent_manage" ON property_unit_types;
CREATE POLICY "property_unit_types_affiliated_agent_manage" ON property_unit_types
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_unit_types.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM property_agents pa
            WHERE pa.property_id = property_unit_types.properties_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
        )
    );

COMMIT;
