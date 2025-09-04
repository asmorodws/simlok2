import { type VariantProps, cva } from 'class-variance-authority';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';
import { Button } from './Button';

/**
 * Table component variants
 */
const tableVariants = cva(
  'w-full caption-bottom text-sm',
  {
    variants: {
      variant: {
        default: 'border-collapse',
        bordered: 'border border-gray-200 border-collapse',
        striped: 'border-collapse',
      },
      size: {
        sm: '[&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1',
        default: '[&_th]:px-4 [&_th]:py-2 [&_td]:px-4 [&_td]:py-2',
        lg: '[&_th]:px-6 [&_th]:py-3 [&_td]:px-6 [&_td]:py-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface Column<T = any> {
  /**
   * Unique key for the column
   */
  key: string;
  /**
   * Column header title
   */
  title: string;
  /**
   * Data key to access value from row object
   */
  dataIndex?: keyof T;
  /**
   * Custom render function for the cell
   */
  render?: (value: any, record: T, index: number) => React.ReactNode;
  /**
   * Whether column is sortable
   */
  sortable?: boolean;
  /**
   * Column width
   */
  width?: string | number;
  /**
   * Column alignment
   */
  align?: 'left' | 'center' | 'right';
  /**
   * Whether column is fixed
   */
  fixed?: 'left' | 'right';
}

export interface TableProps<T = any>
  extends React.TableHTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  /**
   * Table columns configuration
   */
  columns: Column<T>[];
  /**
   * Table data
   */
  data: T[];
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Empty state content
   */
  emptyText?: React.ReactNode;
  /**
   * Row key accessor
   */
  rowKey?: keyof T | ((record: T) => string | number);
  /**
   * Row selection configuration
   */
  rowSelection?: {
    selectedRowKeys?: (string | number)[];
    onSelect?: (record: T, selected: boolean, selectedRows: T[]) => void;
    onSelectAll?: (selected: boolean, selectedRows: T[], changeRows: T[]) => void;
  };
  /**
   * Sort configuration
   */
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  /**
   * Sort change handler
   */
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
  /**
   * Row click handler
   */
  onRowClick?: (record: T, index: number) => void;
  /**
   * Pagination configuration
   */
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
  };
}

/**
 * Get row key for a record
 */
function getRowKey<T>(record: T, rowKey: TableProps<T>['rowKey'], index: number): string | number {
  if (typeof rowKey === 'function') {
    return rowKey(record);
  }
  if (typeof rowKey === 'string') {
    return (record as any)[rowKey] ?? index;
  }
  return index;
}

/**
 * Reusable Table component with sorting, pagination, and selection
 * 
 * @example
 * ```tsx
 * const columns: Column<User>[] = [
 *   {
 *     key: 'name',
 *     title: 'Name',
 *     dataIndex: 'name',
 *     sortable: true,
 *   },
 *   {
 *     key: 'email',
 *     title: 'Email',
 *     dataIndex: 'email',
 *   },
 *   {
 *     key: 'actions',
 *     title: 'Actions',
 *     render: (_, record) => (
 *       <Button size="sm" onClick={() => handleEdit(record)}>
 *         Edit
 *       </Button>
 *     ),
 *   },
 * ];
 * 
 * <Table
 *   columns={columns}
 *   data={users}
 *   loading={loading}
 *   rowKey="id"
 *   pagination={{
 *     current: page,
 *     pageSize: 10,
 *     total: totalUsers,
 *     onChange: handlePageChange,
 *   }}
 * />
 * ```
 */
const Table = forwardRef<HTMLTableElement, TableProps>(
  (
    {
      columns,
      data,
      loading = false,
      emptyText = 'No data available',
      rowKey,
      rowSelection,
      sortConfig,
      onSortChange,
      onRowClick,
      pagination,
      className,
      variant,
      size,
      ...props
    },
    ref
  ) => {
    const handleSort = (key: string) => {
      if (!onSortChange) return;

      const direction =
        sortConfig?.key === key && sortConfig?.direction === 'asc' ? 'desc' : 'asc';
      onSortChange(key, direction);
    };

    const renderSortIcon = (column: Column) => {
      if (!column.sortable || !sortConfig || sortConfig.key !== column.key) {
        return <ChevronDown className="h-4 w-4 opacity-50" />;
      }

      return sortConfig.direction === 'asc' ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      );
    };

    const getCellValue = (record: any, column: Column) => {
      if (column.render) {
        const index = data.indexOf(record);
        return column.render(
          column.dataIndex ? record[column.dataIndex] : record,
          record,
          index
        );
      }
      
      return column.dataIndex ? record[column.dataIndex] : '';
    };

    return (
      <div className="space-y-4">
        {/* Table */}
        <div className="overflow-x-auto">
          <table
            ref={ref}
            className={cn(
              tableVariants({ variant, size }),
              variant === 'striped' && '[&_tbody_tr:nth-child(even)]:bg-gray-50',
              className
            )}
            {...props}
          >
            {/* Header */}
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {rowSelection && (
                  <th className="w-12 text-left font-medium text-gray-900">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) => {
                        if (rowSelection.onSelectAll) {
                          rowSelection.onSelectAll(e.target.checked, data, data);
                        }
                      }}
                    />
                  </th>
                )}
                
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'text-left font-medium text-gray-900',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.sortable && 'cursor-pointer select-none hover:bg-gray-100'
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{column.title}</span>
                      {column.sortable && renderSortIcon(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + (rowSelection ? 1 : 0)}
                    className="py-8 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (rowSelection ? 1 : 0)}
                    className="py-8 text-center text-gray-500"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                data.map((record, index) => {
                  const key = getRowKey(record, rowKey, index);
                  const isSelected = rowSelection?.selectedRowKeys?.includes(key);

                  return (
                    <tr
                      key={key}
                      className={cn(
                        'border-b border-gray-200 hover:bg-gray-50',
                        onRowClick && 'cursor-pointer',
                        isSelected && 'bg-blue-50'
                      )}
                      onClick={() => onRowClick?.(record, index)}
                    >
                      {rowSelection && (
                        <td>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={(e) => {
                              if (rowSelection.onSelect) {
                                rowSelection.onSelect(record, e.target.checked, data);
                              }
                            }}
                          />
                        </td>
                      )}
                      
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            'text-gray-900',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                        >
                          {getCellValue(record, column)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.current - 1) * pagination.pageSize) + 1} to{' '}
              {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
                disabled={pagination.current <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <span className="text-sm text-gray-700">
                Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
                disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

Table.displayName = 'Table';

export { Table, tableVariants };
