'use client';

import { useState, useMemo } from 'react';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'badge';
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableData {
  columns: Column[];
  rows: Record<string, unknown>[];
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  onRowClick?: string;
}

interface Props {
  data: DataTableData | null | undefined;
  variant?: string;
}

export default function DataTable({ data }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const pageSize = data?.pageSize || 10;

  const sorted = useMemo(() => {
    if (!data?.rows) return [];
    if (!sortKey) return data.rows;
    return [...data.rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data?.rows, sortKey, sortDir]);

  const paginated = data?.paginated !== false;
  const rows = paginated ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;
  const totalPages = Math.ceil(sorted.length / pageSize);

  if (!data || !data.columns) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-6 w-full bg-surface-hover rounded mb-2" />
        <div className="h-4 w-full bg-surface-hover rounded mb-1" />
        <div className="h-4 w-3/4 bg-surface-hover rounded" />
      </div>
    );
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const formatCell = (value: unknown, col: Column): string => {
    if (value == null) return '-';
    if (col.type === 'currency') return `\u20B9${Number(value).toLocaleString()}`;
    if (col.type === 'percentage') return `${value}%`;
    if (col.type === 'date') return new Date(String(value)).toLocaleDateString();
    return String(value);
  };

  const alignClass = (a?: string) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover">
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 font-medium text-muted ${alignClass(col.align)} ${
                    (col.sortable ?? data.sortable) ? 'cursor-pointer select-none hover:text-foreground' : ''
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => (col.sortable ?? data.sortable) && handleSort(col.key)}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={data.columns.length} className="px-3 py-6 text-center text-muted">
                  No data
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                >
                  {data.columns.map((col) => (
                    <td key={col.key} className={`px-3 py-2 ${alignClass(col.align)}`}>
                      {col.type === 'badge' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {String(row[col.key] ?? '')}
                        </span>
                      ) : (
                        formatCell(row[col.key], col)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded hover:bg-surface-hover disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded hover:bg-surface-hover disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
