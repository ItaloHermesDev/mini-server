import { getWebhookEvents } from "@/lib/db";
import { parseWebhookPayload, type ParsedWebhookEvent } from "@/lib/monday";
import { EventCard } from "./event-card";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

function countByKind(events: ParsedWebhookEvent[]) {
  return events.reduce<Record<string, number>>((acc, event) => {
    acc[event.kind] = (acc[event.kind] ?? 0) + 1;
    return acc;
  }, {});
}

export default async function EventosPage() {
  let events: ParsedWebhookEvent[] = [];
  let error: string | null = null;

  try {
    const rows = await getWebhookEvents(100);
    events = rows.map((row) =>
      parseWebhookPayload(row.id, row.payload, row.created_at)
    );
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Erro ao carregar eventos do banco";
  }

  const stats = countByKind(events);

  return (
    <div className="min-h-screen bg-[#f5f3ff]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-3xl bg-gradient-to-br from-[#6161ff] to-[#7b61ff] p-8 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-violet-100">
                monday.com webhooks
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Eventos recebidos
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-violet-100">
                Visualização dos payloads salvos em{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5">
                  webhook_events
                </code>
                , incluindo criação de itens e movimentação entre grupos.
              </p>
            </div>
            <RefreshButton />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total" value={events.length} />
            <StatCard label="Itens criados" value={stats.create_pulse ?? 0} />
            <StatCard
              label="Movimentações"
              value={stats.move_pulse_into_group ?? 0}
            />
            <StatCard label="Validações" value={stats.challenge ?? 0} />
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        {!error && events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-zinc-900">
              Nenhum evento ainda
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Cadastre o webhook no monday.com ou envie um POST para{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5">
                /api/webhook
              </code>
              .
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-wide text-violet-100">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
