import React, { useState } from 'react';
import { Box } from '@mui/material';
import { DataTable, StatusBadge, EmptyState, TextInput, Skeleton } from '../../../common/components';
import { useListTravelersQuery } from '../travelerApi';
import { useDebounce } from '../../../common/hooks/useDebounce';
import type { TravelerProfile } from '../profile.types';
import type { Column } from '../../../common/components';

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
  const [page] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useListTravelersQuery({
    page,
    limit: 20,
    q: debouncedSearch || undefined,
  });

  if (isLoading) {
    return (
      <Box data-testid="traveler-table-loading">
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </Box>
    );
  }

  const travelers = data?.travelers ?? [];

  return (
    <Box data-testid="traveler-table">
      <Box sx={{ mb: 2 }}>
        <TextInput
          name="traveler-search"
          label="Search travelers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        <DataTable<TravelerProfile>
          columns={COLUMNS}
          rows={travelers}
          loading={isLoading}
        />
      )}
    </Box>
  );
}
