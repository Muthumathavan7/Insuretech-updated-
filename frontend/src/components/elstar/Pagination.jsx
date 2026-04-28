import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  pageSize, 
  onPageChange, 
  onPageSizeChange 
}) {
  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if at edges
      if (currentPage <= 3) {
        end = Math.min(4, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
      }
      
      // Add ellipsis before range if needed
      if (start > 2) pages.push('...');
      
      // Add range
      for (let i = start; i <= end; i++) pages.push(i);
      
      // Add ellipsis after range if needed
      if (end < totalPages - 1) pages.push('...');
      
      // Always show last page
      if (totalPages > 1) pages.push(totalPages);
    }
    
    return pages;
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border" data-testid="pagination">
      {/* Info and Page Size */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span data-testid="pagination-info">
          Showing <span className="font-medium text-foreground">{startItem}</span> to{' '}
          <span className="font-medium text-foreground">{endItem}</span> of{' '}
          <span className="font-medium text-foreground">{totalItems}</span> results
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="elstar-select !py-1 !px-2 !w-auto text-sm"
            data-testid="page-size-select"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-1" data-testid="pagination-nav">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 hover:bg-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="First page"
          data-testid="pagination-first"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        
        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 hover:bg-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
          data-testid="pagination-prev"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors
                  ${currentPage === page 
                    ? 'ai-gradient text-white' 
                    : 'hover:bg-secondary'
                  }`}
                data-testid={`pagination-page-${page}`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Mobile Page Indicator */}
        <span className="sm:hidden px-3 text-sm font-medium">
          {currentPage} / {totalPages}
        </span>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 hover:bg-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next page"
          data-testid="pagination-next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 hover:bg-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Last page"
          data-testid="pagination-last"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
