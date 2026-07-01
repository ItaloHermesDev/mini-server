"use client";

import { useState } from "react";
import {
  formatDateTime,
  getEventKindColor,
  getEventKindLabel,
  type ParsedWebhookEvent,
} from "@/lib/monday";

type EventCardProps = {
  event: ParsedWebhookEvent;
};

export function EventCard({ event }: EventCardProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getEventKindColor(event.kind)}`}
          >
            {getEventKindLabel(event.kind)}
          </span>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{event.title}</h2>
            {event.subtitle ? (
              <p className="text-sm text-zinc-500">{event.subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="text-right text-xs text-zinc-500">
          <p>#{event.id}</p>
          <p>{formatDateTime(event.triggerTime ?? event.createdAt)}</p>
          {event.isRetry ? (
            <p className="font-medium text-amber-600">Retry</p>
          ) : null}
        </div>
      </div>

      {event.columnTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {event.columnTags.map((tag) => (
            <span
              key={`${event.id}-${tag.label}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs"
            >
              <span className="font-medium text-zinc-500">{tag.label}</span>
              <span
                className="rounded-full px-2 py-0.5 font-medium text-zinc-800"
                style={
                  tag.color
                    ? { backgroundColor: `${tag.color}22`, color: tag.color }
                    : undefined
                }
              >
                {tag.value}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {event.details.length > 0 ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {event.details.map((detail) => (
            <div
              key={`${event.id}-${detail.label}`}
              className="rounded-xl bg-zinc-50 px-3 py-2"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {detail.label}
              </dt>
              <dd
                className="mt-1 text-sm font-medium text-zinc-800"
                style={detail.color ? { color: detail.color } : undefined}
              >
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <button
        type="button"
        onClick={() => setShowRaw((current) => !current)}
        className="mt-4 text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        {showRaw ? "Ocultar JSON" : "Ver JSON completo"}
      </button>

      {showRaw ? (
        <pre className="mt-3 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
          {JSON.stringify(event.raw, null, 2)}
        </pre>
      ) : null}
    </article>
  );
}
