"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CallListRow } from "@/lib/data/calls";
import { VALID_CATEGORIES } from "@/lib/api/schemas";
import type { Column } from "@tanstack/react-table";

// ── Formatters ──────────────────────────────────────────────────

function fmt(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
}

// ── Style maps ──────────────────────────────────────────────────

const sentimentColors: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-gray-100 text-gray-600",
  negative: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-400",
};

const statusColors: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-700",
  metadata_saved: "bg-gray-100 text-gray-500",
  failed: "bg-red-100 text-red-700",
  analyzing: "bg-blue-100 text-blue-700",
  transcribing: "bg-amber-100 text-amber-700",
};

// ── Sort header helper ──────────────────────────────────────────

function SortHeader({
  column,
  children,
}: {
  column: Column<CallListRow>;
  children: React.ReactNode;
}) {
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

// ── Flag toggle button ──────────────────────────────────────────

function FlagToggle({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: "red" | "amber" | "emerald";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    red: active
      ? "bg-red-100 text-red-700 border-red-300"
      : "bg-background text-muted-foreground border-border",
    amber: active
      ? "bg-amber-100 text-amber-700 border-amber-300"
      : "bg-background text-muted-foreground border-border",
    emerald: active
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : "bg-background text-muted-foreground border-border",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${styles[color]}`}
    >
      {children}
    </button>
  );
}

// ── Column definitions ──────────────────────────────────────────

const columnHelper = createColumnHelper<CallListRow>();

const columns = [
  columnHelper.accessor("call_time_ct", {
    id: "call_time_ct",
    header: ({ column }) => (
      <SortHeader column={column}>Date / Time</SortHeader>
    ),
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {fmtDateTime(getValue())}
      </span>
    ),
    sortingFn: "alphanumeric",
  }),
  columnHelper.accessor("direction", {
    id: "direction",
    header: "Dir",
    enableSorting: false,
    cell: ({ getValue }) => {
      const d = getValue();
      if (d === "inbound")
        return (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">
            In
          </span>
        );
      if (d === "outbound")
        return (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-500">
            Out
          </span>
        );
      return (
        <span className="text-[10px] text-muted-foreground">—</span>
      );
    },
  }),
  columnHelper.display({
    id: "caller",
    header: "Caller",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-sm">
          {row.original.from_name ?? "Unknown"}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.original.from_number ?? "—"}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("agent_name_inferred", {
    id: "agent",
    header: "Agent",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-xs">{getValue() ?? "—"}</span>
    ),
  }),
  columnHelper.accessor("duration_seconds", {
    id: "duration",
    header: ({ column }) => (
      <SortHeader column={column}>Duration</SortHeader>
    ),
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-muted-foreground text-sm">
        {fmt(getValue())}
      </span>
    ),
    sortingFn: "basic",
  }),
  columnHelper.accessor("primary_category", {
    id: "category",
    header: ({ column }) => (
      <SortHeader column={column}>Category</SortHeader>
    ),
    cell: ({ getValue }) => {
      const v = getValue();
      return v ? (
        <Badge variant="secondary" className="text-xs whitespace-nowrap">
          {v}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      );
    },
    sortingFn: "alphanumeric",
  }),
  columnHelper.accessor("sentiment", {
    id: "sentiment",
    header: "Sentiment",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue();
      if (!v || v === "unknown")
        return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            sentimentColors[v] ?? sentimentColors.unknown
          }`}
        >
          {v}
        </span>
      );
    },
  }),
  columnHelper.accessor("short_summary", {
    id: "summary",
    header: "Summary",
    enableSorting: false,
    cell: ({ getValue }) => (
      <p className="max-w-[260px] truncate text-xs text-muted-foreground">
        {getValue() ?? "—"}
      </p>
    ),
  }),
  columnHelper.display({
    id: "flags",
    header: "Flags",
    cell: ({ row }) => {
      const { complaint_flag, follow_up_required, sales_opportunity_flag } =
        row.original;
      return (
        <div className="flex gap-1 flex-wrap min-w-[72px]">
          {complaint_flag && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
              Complaint
            </span>
          )}
          {follow_up_required && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              Follow-up
            </span>
          )}
          {sales_opportunity_flag && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
              Lead
            </span>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor("processing_status", {
    id: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() ?? "unknown";
      return (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
            statusColors[v] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {v.replace(/_/g, " ")}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Link
        href={`/calls/${row.original.id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
      >
        View <ArrowUpRight className="h-3 w-3" />
      </Link>
    ),
  }),
];

// ── Main component ──────────────────────────────────────────────

export function CallExplorer({ calls }: { calls: CallListRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "call_time_ct", desc: true },
  ]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [onlyComplaints, setOnlyComplaints] = useState(false);
  const [onlyFollowUps, setOnlyFollowUps] = useState(false);
  const [onlySalesOpps, setOnlySalesOpps] = useState(false);

  const filtered = useMemo(() => {
    return calls.filter((call) => {
      if (search) {
        const s = search.toLowerCase();
        const hit =
          call.from_name?.toLowerCase().includes(s) ||
          call.from_number?.toLowerCase().includes(s) ||
          call.agent_name_inferred?.toLowerCase().includes(s) ||
          call.short_summary?.toLowerCase().includes(s);
        if (!hit) return false;
      }
      if (category && call.primary_category !== category) return false;
      if (dateFrom && call.call_date && call.call_date < dateFrom) return false;
      if (dateTo && call.call_date && call.call_date > dateTo) return false;
      if (status && call.processing_status !== status) return false;
      if (onlyComplaints && !call.complaint_flag) return false;
      if (onlyFollowUps && !call.follow_up_required) return false;
      if (onlySalesOpps && !call.sales_opportunity_flag) return false;
      return true;
    });
  }, [
    calls,
    search,
    category,
    dateFrom,
    dateTo,
    status,
    onlyComplaints,
    onlyFollowUps,
    onlySalesOpps,
  ]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const hasActiveFilters =
    search ||
    category ||
    dateFrom ||
    dateTo ||
    status ||
    onlyComplaints ||
    onlyFollowUps ||
    onlySalesOpps;

  function clearFilters() {
    setSearch("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setStatus("");
    setOnlyComplaints(false);
    setOnlyFollowUps(false);
    setOnlySalesOpps(false);
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search caller, number, agent, or summary…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 flex-1 min-w-[220px] rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All categories</option>
            {VALID_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All statuses</option>
            <option value="complete">Complete</option>
            <option value="metadata_saved">No recording</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Show only:</span>
          <FlagToggle
            active={onlyComplaints}
            color="red"
            onClick={() => setOnlyComplaints(!onlyComplaints)}
          >
            Complaints
          </FlagToggle>
          <FlagToggle
            active={onlyFollowUps}
            color="amber"
            onClick={() => setOnlyFollowUps(!onlyFollowUps)}
          >
            Follow-ups
          </FlagToggle>
          <FlagToggle
            active={onlySalesOpps}
            color="emerald"
            onClick={() => setOnlySalesOpps(!onlySalesOpps)}
          >
            Sales Opps
          </FlagToggle>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">
            All Calls{" "}
            <span className="ml-1 font-normal text-muted-foreground">
              ({filtered.length} of {calls.length})
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="border-b bg-muted/30 text-xs text-muted-foreground"
                >
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left font-medium">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No calls match the current filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${
                      i % 2 === 1 ? "bg-muted/10" : ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())} · {filtered.length} result
            {filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
