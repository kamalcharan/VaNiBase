'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useShellConfig } from '../../lib/shell-config';

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
  data: DataTableData | Record<string, unknown>[] | null | undefined;
  variant?: string;
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  onRowClick?: string | ((row: Record<string, unknown>) => void);
  /** Entity type for row click navigation (e.g., 'client') */
  entityType?: string;
  /** Field name in row data containing the entity ID. Defaults to 'id'. */
  entityIdField?: string;
}

function inferColumnType(value: unknown): Column['type'] {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  return 'text';
}

function autoLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DataTable({ data, variant: _variant, sortable, paginated, pageSize: propPageSize, onRowClick, entityType, entityIdField }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const router = useRouter();
  const shellConfig = useShellConfig();

  const isClickable = !!(entityType || onRowClick);

  const handleRowClick = useCallback((row: Record<string, unknown>) => {
    // Custom callback handler takes priority
    if (typeof onRowClick === 'function') {
      onRowClick(row);
      return;
    }

    // Entity navigation
    if (entityType && shellConfig.entities) {
      const entity = shellConfig.entities.find((e) => e.type === entityType);
      if (entity) {
        const idField = entityIdField || entity.idField || 'id';
        const entityId = row[idField];
        if (entityId) {
          router.push(`${entity.detailRoute}/${entityId}`);
        }
      }
    }
  }, [entityType, entityIdField, onRowClick, shellConfig.entities, router]);

  // Normalize data: accept raw arrays OR { columns, rows } objects
  const tableData: DataTableData | null = useMemo(() => {
    if (!data) return null;

    // Already in { columns, rows } shape
    if (!Array.isArray(data) && 'columns' in data && 'rows' in data) {
      return data as DataTableData;
    }

    // Raw array — auto-generate columns from first item
    const arr = Array.isArray(data) ? data : null;
    if (!arr || arr.length === 0) return null;

    const sample = arr[0] as Record<string, unknown>;
    const columns: Column[] = Object.keys(sample)
      .filter((key) => {
        const val = sample[key];
        // Skip complex nested objects and arrays
        return val === null || val === undefined || typeof val !== 'object' || val instanceof Date;
      })
      .map((key) => ({
        key,
        label: autoLabel(key),
        sortable: true,
        type: inferColumnType(sample[key]),
      }));

    return {
      columns,
      rows: arr as Record<string, unknown>[],
      sortable: sortable,
      paginated: paginated,
      pageSize: propPageSize,
      onRowClick: typeof onRowClick === 'string' ? onRowClick : undefined,
    };
  }, [data, sortable, paginated, propPageSize, onRowClick]);

  const effectivePageSize = tableData?.pageSize || propPageSize || 10;

  const sorted = useMemo(() => {
    if (!tableData?.rows) return [];
    if (!sortKey) return tableData.rows;
    return [...tableData.rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tableData?.rows, sortKey, sortDir]);

  const isPaginated = tableData?.paginated ?? paginated ?? true;
  const rows = isPaginated ? sorted.slice(page * effectivePageSize, (page + 1) * effectivePageSize) : sorted;
  const totalPages = Math.ceil(sorted.length / effectivePageSize);

  if (!tableData) {
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
    if (col.type === 'number') return Number(value).toLocaleString();
    return String(value);
  };

  const alignClass = (col: Column) => {
    if (col.align === 'right') return 'text-right';
    if (col.align === 'center') return 'text-center';
    if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage') return 'text-right';
    return 'text-left';
  };

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-hover">
              {tableData.columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 font-medium text-muted ${alignClass(col)} ${
                    (col.sortable ?? tableData.sortable ?? sortable) ? 'cursor-pointer select-none hover:text-foreground' : ''
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => (col.sortable ?? tableData.sortable ?? sortable) && handleSort(col.key)}
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
                <td colSpan={tableData.columns.length} className="px-3 py-6 text-center text-muted">
                  No data
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-border last:border-0 transition-colors ${
                    isClickable ? 'cursor-pointer hover:bg-surface-hover' : 'hover:bg-surface-hover'
                  }`}
                  onClick={isClickable ? () => handleRowClick(row) : undefined}
                >
                  {tableData.columns.map((col) => (
                    <td key={col.key} className={`px-3 py-2 ${alignClass(col)}`}>
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
      {isPaginated && totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted">
          <span>
            Page {page + 1} of {totalPages} ({sorted.length} rows)
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