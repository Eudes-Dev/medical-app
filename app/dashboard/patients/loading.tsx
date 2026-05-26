import { PatientTableSkeleton } from "@/components/patients/patient-table-skeleton";

export default function PatientsLoading() {
  return (
    <div className="p-4">
      <PatientTableSkeleton />
    </div>
  );
}
