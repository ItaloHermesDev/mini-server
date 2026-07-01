export type MondayLabel = {
  index?: number;
  text?: string;
  style?: {
    color?: string;
    border?: string;
    var_name?: string;
  };
  is_done?: boolean;
};

export type MondayColumnValue = {
  label?: MondayLabel;
  date?: string;
  from?: string;
  to?: string;
  personsAndTeams?: Array<{ id: number; kind: string }>;
  post_id?: string | null;
};

export type MondayEventBase = {
  app?: string;
  type?: string;
  triggerTime?: string;
  subscriptionId?: number;
  isRetry?: boolean;
  userId?: number;
  boardId?: number;
  pulseId?: number;
  triggerUuid?: string;
};

export type MondayCreatePulseEvent = MondayEventBase & {
  type: "create_pulse";
  pulseName?: string;
  groupId?: string;
  groupName?: string;
  groupColor?: string;
  isTopGroup?: boolean;
  columnValues?: Record<string, MondayColumnValue>;
};

export type MondayMovePulseEvent = MondayEventBase & {
  type: "move_pulse_into_group";
  sourceGroupId?: string;
  destGroupId?: string;
  destGroup?: {
    id?: string;
    title?: string;
    color?: string;
    is_top_group?: boolean;
  };
};

export type MondayEvent = MondayCreatePulseEvent | MondayMovePulseEvent;

export type WebhookPayload =
  | { challenge: string }
  | { event: MondayEvent };

export type ParsedWebhookEvent = {
  id: number;
  createdAt: string;
  kind: "challenge" | "create_pulse" | "move_pulse_into_group" | "other";
  title: string;
  subtitle?: string;
  triggerTime?: string;
  boardId?: number;
  pulseId?: number;
  subscriptionId?: number;
  isRetry?: boolean;
  details: Array<{ label: string; value: string; color?: string }>;
  columnTags: Array<{ label: string; value: string; color?: string }>;
  raw: unknown;
};

const EVENT_LABELS: Record<string, string> = {
  create_pulse: "Item criado",
  move_pulse_into_group: "Item movido",
};

const COLUMN_LABELS: Record<string, string> = {
  status: "Status",
  data: "Data",
  person: "Responsável",
  cronograma__1: "Cronograma",
  color_mkrzdyt2: "Marca",
  color_mkrzv2pf: "Canal",
  color_mkrzadej: "Prioridade",
  color_mkt3jbvt: "Etapa",
  multiple_person_mkrzfj6a: "Equipe",
};

export function parseWebhookPayload(
  id: number,
  payload: unknown,
  createdAt: string | Date
): ParsedWebhookEvent {
  const createdAtIso =
    createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);

  if (
    typeof payload === "object" &&
    payload !== null &&
    "challenge" in payload &&
    typeof (payload as { challenge: unknown }).challenge === "string"
  ) {
    return {
      id,
      createdAt: createdAtIso,
      kind: "challenge",
      title: "Validação de URL",
      subtitle: "Cadastro do webhook no monday.com",
      details: [],
      columnTags: [],
      raw: payload,
    };
  }

  const record = payload as { event?: MondayEvent };
  const event = record.event;

  if (!event?.type) {
    return {
      id,
      createdAt: createdAtIso,
      kind: "other",
      title: "Evento desconhecido",
      details: [],
      columnTags: [],
      raw: payload,
    };
  }

  const base = {
    id,
    createdAt: createdAtIso,
    triggerTime: event.triggerTime,
    boardId: event.boardId,
    pulseId: event.pulseId,
    subscriptionId: event.subscriptionId,
    isRetry: event.isRetry,
    details: [
      { label: "Board ID", value: String(event.boardId ?? "—") },
      { label: "Pulse ID", value: String(event.pulseId ?? "—") },
      { label: "Subscription", value: String(event.subscriptionId ?? "—") },
    ],
    raw: payload,
  };

  if (event.type === "create_pulse") {
    const createEvent = event as MondayCreatePulseEvent;

    return {
      ...base,
      kind: "create_pulse",
      title: createEvent.pulseName ?? "Sem nome",
      subtitle: createEvent.groupName ?? createEvent.groupId,
      columnTags: extractColumnTags(createEvent.columnValues),
      details: [
        ...base.details,
        { label: "Grupo", value: createEvent.groupName ?? "—" },
        {
          label: "Usuário",
          value: String(createEvent.userId ?? "—"),
        },
      ],
    };
  }

  if (event.type === "move_pulse_into_group") {
    const moveEvent = event as MondayMovePulseEvent;

    return {
      ...base,
      kind: "move_pulse_into_group",
      title: `Item #${moveEvent.pulseId ?? "?"}`,
      subtitle: moveEvent.destGroup?.title ?? moveEvent.destGroupId,
      details: [
        ...base.details,
        {
          label: "Origem",
          value: moveEvent.sourceGroupId ?? "—",
        },
        {
          label: "Destino",
          value: moveEvent.destGroup?.title ?? moveEvent.destGroupId ?? "—",
          color: moveEvent.destGroup?.color,
        },
      ],
      columnTags: [],
    };
  }

  return {
    ...base,
    kind: "other",
    title: EVENT_LABELS[event.type] ?? event.type,
    subtitle: event.type,
    columnTags: [],
  };
}

function extractColumnTags(
  columnValues?: Record<string, MondayColumnValue>
): Array<{ label: string; value: string; color?: string }> {
  if (!columnValues) {
    return [];
  }

  return Object.entries(columnValues)
    .map(([key, value]) => formatColumnValue(key, value))
    .filter((item): item is { label: string; value: string; color?: string } =>
      Boolean(item)
    );
}

function formatColumnValue(
  key: string,
  value: MondayColumnValue
): { label: string; value: string; color?: string } | null {
  const label = COLUMN_LABELS[key] ?? key;

  if (value.label?.text) {
    return {
      label,
      value: value.label.text,
      color: value.label.style?.color,
    };
  }

  if (value.date) {
    return { label, value: value.date };
  }

  if (value.from && value.to) {
    return { label, value: `${value.from} → ${value.to}` };
  }

  if (value.personsAndTeams?.length) {
    const ids = value.personsAndTeams.map((p) => p.id).join(", ");
    return { label, value: ids };
  }

  return null;
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function getEventKindLabel(kind: ParsedWebhookEvent["kind"]): string {
  const labels: Record<ParsedWebhookEvent["kind"], string> = {
    challenge: "Validação",
    create_pulse: "Item criado",
    move_pulse_into_group: "Movimentação",
    other: "Outro",
  };

  return labels[kind];
}

export function getEventKindColor(kind: ParsedWebhookEvent["kind"]): string {
  const colors: Record<ParsedWebhookEvent["kind"], string> = {
    challenge: "bg-amber-100 text-amber-800 border-amber-200",
    create_pulse: "bg-emerald-100 text-emerald-800 border-emerald-200",
    move_pulse_into_group: "bg-violet-100 text-violet-800 border-violet-200",
    other: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };

  return colors[kind];
}
