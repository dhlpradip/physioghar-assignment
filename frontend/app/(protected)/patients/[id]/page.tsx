'use client';

import { useParams } from 'next/navigation';
import { PhysioDeskApp } from '../../../../components/organisms/PhysioDeskApp';

export function PatientPage() {
  const params = useParams<{ id: string }>();
  const patientId = Number(params.id);
  return (
    <PhysioDeskApp
      initialView="Patient profile"
      patientId={Number.isFinite(patientId) ? patientId : undefined}
    />
  );
}

export { PatientPage as default };
