import { optOutReminders } from "./actions";

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Lien invalide</h1>
        <p className="text-gray-600">Ce lien de désinscription n&apos;est pas valide.</p>
      </main>
    );
  }

  const result = await optOutReminders(token);

  if (!result.success) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Lien introuvable</h1>
        <p className="text-gray-600">
          Ce lien de désinscription est invalide ou a déjà été utilisé.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">
        Désinscription confirmée
      </h1>
      <p className="text-gray-600">
        Vous ne recevrez plus de rappels automatiques pour vos rendez-vous.
      </p>
    </main>
  );
}
