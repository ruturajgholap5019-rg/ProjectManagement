import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 25,
  onPageChange,
  isLoading = false,
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <div>
        {totalItems !== undefined ? (
          <span>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{totalItems === 0 ? 0 : startIdx}</strong> to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{endIdx}</strong> of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> entries
          </span>
        ) : (
          <span>Page {currentPage} of {totalPages}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-main)',
            color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: '0.80rem',
            fontWeight: 600,
            cursor: currentPage <= 1 || isLoading ? 'not-allowed' : 'pointer',
            opacity: currentPage <= 1 ? 0.5 : 1,
          }}
        >
          <ChevronLeft size={15} /> Prev
        </button>

        <span style={{ padding: '0 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-main)',
            color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: '0.80rem',
            fontWeight: 600,
            cursor: currentPage >= totalPages || isLoading ? 'not-allowed' : 'pointer',
            opacity: currentPage >= totalPages ? 0.5 : 1,
          }}
        >
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
