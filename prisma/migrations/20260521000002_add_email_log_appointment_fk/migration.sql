-- AddForeignKey: EmailLog.appointmentId → Appointment.id (story 6.1 improvement)
-- onDelete SetNull : suppression d'un RDV conserve le log email (appointmentId → null)
ALTER TABLE "email_logs"
  ADD CONSTRAINT "email_logs_appointment_id_fkey"
  FOREIGN KEY ("appointment_id")
  REFERENCES "appointments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
