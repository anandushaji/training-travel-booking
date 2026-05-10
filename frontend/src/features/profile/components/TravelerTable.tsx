import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DataTable, StatusBadge, EmptyState, TextInput, Skeleton, Alert } from '../../../common/components';
import { useListTravelersQuery } from '../travelerApi';
import { useDebounce } from '../../../common/hooks/useDebounce';
import type { TravelerProfile } from '../profile.types';
import type { Column } from '../../../common/components';
import { ROUTES } from '../../../routes/routes.config';

const ACTIVE_COLOR_MAP: Record<string, 'success' | 'error'> = {
  Active: 'success',
  Inactive: 'error',
};

const COLUMNS: Column<TravelerProfile>[] = [
  { key: 'fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'jobTitle', label: 'Job Title' },
  {
    key: 'active',
    label: 'Status',
    render: (_value, row) => (
      <StatusBadge
        status={row.active ? 'Active' : 'Inactive'}
        statusColorMap={ACTIVE_COLOR_MAP}
      />
    ),
  },
];

export function TravelerTable(): React.ReactElement {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError } = useListTravelersQuery({
    page,
    limit: 20,
    q: debouncedSearch || undefined,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // reset to first page on new search
  };

  if (isLoading) {
    return (
      <Box data-testid="traveler-table-loading">
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box data-testid="traveler-table-error">
        <Alert severity="error" message="Could not load travelers. Please try again." />
      </Box>
    );
  }

  const travelers = data?.travelers ?? [];
  const pagination = data?.pagination;

  return (
    <Box data-testid="traveler-table">
      <Box sx={{ mb: 2 }}>
        <TextInput
          name="traveler-search"
          label="Search travelers"
          value={search}
          onChange={handleSearchChange}
          data-testid="traveler-search"
        />
      </Box>

      {travelers.length === 0 ? (
        <Box data-testid="traveler-empty">
          <EmptyState
            title="No travelers found"
            description="Try adjusting your search."
          />
        </Box>
      ) : (
        <>
          <DataTable<TravelerProfile>
            columns={COLUMNS}
            rows={travelers}
            loading={isLoading}
            defaultRowsPerPage={20}
            rowsPerPageOptions={[20]}
            onRowClick={(row) => {
              const path = ROUTES.ADMIN_TRAVELER_DETAIL.replace(':travelerId', row.id);
              navigate(path);
            }}
          />
          {pagination && pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                data-testid="traveler-pagination-prev"
              >
                Previous
              </Button>
              <Typography variant="body2">
                Page {pagination.currentPage} of {pagination.totalPages}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                data-testid="traveler-pagination-next"
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
