"use client";

import { useRouter } from "next/navigation";

export function RefreshButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
    >
      Atualizar
    </button>
  );
}
