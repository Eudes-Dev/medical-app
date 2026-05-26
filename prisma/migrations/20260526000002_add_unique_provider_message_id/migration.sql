-- QA SCHEMA-001 : index unique sur provider_message_id.
-- Le webhook Twilio Status (POST /api/webhooks/twilio/status) cible un message
-- par MessageSid ; l'unicité garantit qu'au plus une ligne est mise à jour.
-- NB : Postgres autorise plusieurs NULL sous un index UNIQUE, donc les logs
-- sans providerMessageId (ex: échecs avant réponse provider) ne sont pas affectés.
CREATE UNIQUE INDEX "message_logs_provider_message_id_key" ON "message_logs" ("provider_message_id");
