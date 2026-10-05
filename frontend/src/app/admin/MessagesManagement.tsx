"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin";
import { Pagination } from "@/components/ui/Pagination";
import { SearchIcon } from "@/components/ui/icons";

const SUBJECT_TABS = ["All", "General", "Order issue", "Wholesale", "Export", "Bulk orders"] as const;
const PAGE_SIZE = 12;
const searchClass =
  "w-full rounded-xl border border-paper-200 bg-white py-2.5 pr-3 pl-10 text-sm text-ink-900 outline-none transition focus:border-masala-500 focus:ring-2 focus:ring-masala-500/15";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-paper-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 transition hover:border-masala-300 disabled:cursor-not-allowed disabled:opacity-50";

type MessageSubject = Exclude<(typeof SUBJECT_TABS)[number], "All">;
type MessageRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  subject: MessageSubject;
  message: string;
  source: "contact" | "bulk_order";
  details: Record<string, unknown>;
  status: "new" | "read";
  created_at: string;
};
type MessagePage = {
  items: MessageRecord[];
  page: number;
  page_size: number;
  total_count: number;
};

function formatReceivedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function MessagesManagement({ token }: { token: string }) {
  const [subject, setSubject] = useState<(typeof SUBJECT_TABS)[number]>("All");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loadedQueryKey, setLoadedQueryKey] = useState("");
  const [result, setResult] = useState<MessagePage>({ items: [], page: 1, page_size: PAGE_SIZE, total_count: 0 });
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
  if (subject !== "All") query.set("subject", subject);
  if (search) query.set("search", search);
  const queryString = query.toString();
  const requestKey = `${token}?${queryString}`;
  const loading = loadedQueryKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    void adminRequest<MessagePage>(`/api/admin/messages?${queryString}`, token)
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setError("");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Messages could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoadedQueryKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString, requestKey, token]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const changeStatus = async (message: MessageRecord) => {
    const status = message.status === "new" ? "read" : "new";
    setBusyMessageId(message.id);
    setError("");
    try {
      const updated = await adminRequest<MessageRecord>(`/api/admin/messages/${message.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setResult((current) => ({
        ...current,
        items: current.items.map((item) => item.id === updated.id ? updated : item),
      }));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Message status could not be updated.");
    } finally {
      setBusyMessageId(null);
    }
  };

  return (
    <section className="mt-7 space-y-5">
      <header>
        <h2 className="font-display text-xl font-semibold text-ink-950">Messages</h2>
        <p className="mt-1 text-sm text-ink-500">Contact notes and bulk-order enquiries submitted by customers.</p>
      </header>

      <div role="tablist" aria-label="Filter messages by subject" className="flex gap-2 overflow-x-auto border-b border-paper-200 pb-2">
        {SUBJECT_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={subject === tab}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${subject === tab ? "bg-masala-700 text-white" : "text-ink-600 hover:bg-paper-100"}`}
            onClick={() => { setSubject(tab); setPage(1); }}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="message-search" className="sr-only">Search messages</label>
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input id="message-search" type="search" className={searchClass} placeholder="Search name, email, company or message" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} />
        </div>
        <button type="submit" className={secondaryButton}>Search</button>
      </form>

      {error ? <p role="alert" className="rounded-xl border border-chili-100 bg-chili-50 p-3 text-sm text-chili-700">{error}</p> : null}
      <p className="text-sm text-ink-500" aria-live="polite">
        {loading ? "Loading messages…" : `${result.total_count} ${result.total_count === 1 ? "message" : "messages"}`}
      </p>

      {loading ? null : result.items.length ? (
        <div className="divide-y divide-paper-200 border-y border-paper-200">
          {result.items.map((message) => (
            <article key={message.id} className={`py-5 ${message.status === "new" ? "bg-saffron-50/40" : "bg-white"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink-950">{message.name}</h3>
                    <span className="chip">{message.subject}</span>
                    <span className={`chip ${message.status === "new" ? "border-saffron-300 bg-saffron-50 text-ink-800" : "border-paper-200 bg-paper-100 text-ink-500"}`}>
                      {message.status === "new" ? "New" : "Read"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{formatReceivedAt(message.created_at)} · {message.source === "bulk_order" ? "Bulk-order form" : "Contact form"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">
                    <a className="underline decoration-paper-300 underline-offset-2 hover:text-masala-800" href={`mailto:${message.email}`}>{message.email}</a>
                    {message.phone ? <a className="underline decoration-paper-300 underline-offset-2 hover:text-masala-800" href={`tel:${message.phone}`}>{message.phone}</a> : null}
                    {message.company_name ? <span>{message.company_name}</span> : null}
                  </div>
                  {typeof message.details.monthly_volume === "string" ? <p className="mt-2 text-xs font-semibold text-ink-600">Monthly volume: {message.details.monthly_volume}</p> : null}
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">{message.message}</p>
                </div>
                <button type="button" className={`${secondaryButton} shrink-0`} disabled={busyMessageId === message.id} onClick={() => void changeStatus(message)}>
                  {busyMessageId === message.id ? "Saving…" : message.status === "new" ? "Mark read" : "Mark new"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="rounded-2xl border border-dashed border-paper-300 bg-white px-5 py-10 text-center text-sm text-ink-500">No messages match this subject and search.</p>}

      {!loading && result.total_count > 0 ? (
        <Pagination page={result.page} pageSize={result.page_size} total={result.total_count} itemLabel="messages" ariaLabel="Messages pagination" onPageChange={setPage} />
      ) : null}
    </section>
  );
}
