import { ClinicalView } from "@/components/clinical-view";
import { PatientDetail } from "@/components/patients-view";
export const metadata = { title: "Karta pacjenta" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PatientDetail id={id}>
      <ClinicalView patientId={id} />
    </PatientDetail>
  );
}
