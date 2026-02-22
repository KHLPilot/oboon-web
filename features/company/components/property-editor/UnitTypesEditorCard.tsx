"use client";

import UnitTypesEditor from "@/features/company/components/property-editor/UnitTypesEditor";

export default function UnitTypesEditorCard({
  propertyId,
  onAfterSave,
}: {
  propertyId: number;
  onAfterSave?: () => void | Promise<void>;
}) {
  return (
    <UnitTypesEditor
      propertyId={propertyId}
      embedded
      onAfterSave={onAfterSave}
    />
  );
}
