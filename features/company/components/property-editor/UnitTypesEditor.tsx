"use client";

import UnitTypesPage from "@/features/company/components/units/UnitTypesPage";

export type UnitTypesEditorProps = {
  propertyId?: number;
  embedded?: boolean;
  onAfterSave?: () => void | Promise<void>;
};

export default function UnitTypesEditor(props: UnitTypesEditorProps) {
  return <UnitTypesPage {...props} />;
}
