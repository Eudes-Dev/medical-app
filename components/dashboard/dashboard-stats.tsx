/**
 * Composants DashboardStats
 *
 * Affiche les statistiques du jour sur le dashboard:
 * - Nombre de rendez-vous aujourd'hui (TodayAppointmentsCard)
 * - Liste des 5 prochains rendez-vous (UpcomingAppointmentsCard)
 *
 * Ces composants sont des Server Components qui récupèrent les données
 * via la Server Action getDashboardStats().
 *
 * @module components/dashboard/dashboard-stats
 */

import { Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/app/dashboard/actions";

/**
 * Formatage de l'heure pour l'affichage.
 *
 * Convertit une Date en format "HH:MM" (ex: "10:30").
 *
 * @param date - Date à formater
 * @returns Heure formatée en "HH:MM"
 */
function formatTime(date: Date): string {
  // Utiliser toLocaleTimeString avec options pour avoir le format HH:MM
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // Format 24h
  });
}

/**
 * Formatage de la date pour l'affichage.
 *
 * Convertit une Date en format "DD/MM/YYYY" (ex: "29/01/2026").
 *
 * @param date - Date à formater
 * @returns Date formatée en "DD/MM/YYYY"
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Composant TodayAppointmentsCard.
 *
 * Affiche le nombre de rendez-vous prévus aujourd'hui.
 * Utilisé dans la grille de statistiques du dashboard.
 *
 * @returns JSX de la carte "Rendez-vous aujourd'hui"
 */
export async function TodayAppointmentsCard() {
  // Récupérer les statistiques via Server Action
  // Note: getDashboardStats() lève une UnauthorizedError si l'utilisateur n'est pas authentifié
  // Le middleware devrait normalement empêcher l'accès, mais cette vérification est une sécurité défensive
  const stats = await getDashboardStats();

  const todayCount = stats.todayAppointmentsCount;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Rendez-vous aujourd&apos;hui
        </CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{todayCount}</div>
        <p className="text-xs text-muted-foreground">
          {todayCount === 0
            ? "Aucun rendez-vous prévu"
            : todayCount === 1
              ? "1 rendez-vous prévu"
              : `${todayCount} rendez-vous prévus`}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Composant UpcomingAppointmentsCard.
 *
 * Affiche la liste des 5 prochains rendez-vous (CONFIRMED ou PENDING).
 * Utilisé dans la section principale du dashboard.
 *
 * @returns JSX de la carte "Prochains rendez-vous"
 */
export async function UpcomingAppointmentsCard() {
  // Récupérer les statistiques via Server Action
  // Note: getDashboardStats() lève une UnauthorizedError si l'utilisateur n'est pas authentifié
  // Le middleware devrait normalement empêcher l'accès, mais cette vérification est une sécurité défensive
  const stats = await getDashboardStats();

  const upcoming = stats.upcomingAppointments;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Prochains rendez-vous
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          // Aucun RDV à venir
          <div className="text-center py-4 text-muted-foreground text-sm">
            Aucun rendez-vous à venir
          </div>
        ) : (
          // Liste des prochains RDV
          <div className="space-y-4">
            {upcoming.map((appointment) => {
              // Formater l'heure de début pour l'affichage
              const timeStr = formatTime(appointment.startTime);
              // Formater la date pour vérifier si c'est aujourd'hui ou plus tard
              const dateStr = formatDate(appointment.startTime);
              const todayStr = formatDate(new Date());
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Badge avec l'heure */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563eb]/10 text-[#2563eb] font-medium text-sm">
                      {timeStr}
                    </div>
                    {/* Informations du patient */}
                    <div>
                      <p className="font-medium">
                        {appointment.patient.firstName}{" "}
                        {appointment.patient.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.type}
                        {isToday ? (
                          <span className="ml-2 text-xs">(Aujourd&apos;hui)</span>
                        ) : (
                          <span className="ml-2 text-xs">({dateStr})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Badge de statut */}
                  <div
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      appointment.status === "CONFIRMED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {appointment.status === "CONFIRMED" ? "Confirmé" : "En attente"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
