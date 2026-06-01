import { SkeletonTable } from './Skeleton';
import { Pagination } from './Pagination';

export const Table = ({ columns, data, isLoading, pagination, onPageChange }) => {
  if (isLoading) {
    return <SkeletonTable rows={5} columns={columns?.length || 4} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={idx}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-gray-50">
              {columns.map((column, colIdx) => (
                <td 
                  key={colIdx} 
                  className={`px-6 py-4 text-sm text-gray-900 ${
                    column.accessor === 'actions' ? '' : 'whitespace-nowrap'
                  }`}
                >
                  {column.cell ? column.cell(row) : row[column.accessorKey]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
};
