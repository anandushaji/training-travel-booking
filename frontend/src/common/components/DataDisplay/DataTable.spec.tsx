import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, Column } from './DataTable';

interface Row { id: number; name: string; age: number }

const columns: Column<Row>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'age', label: 'Age' },
];

const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `User ${i + 1}`, age: 20 + i }));

describe('DataTable', () => {
  it('should render correct number of rows', () => {
    render(<DataTable columns={columns} rows={makeRows(10)} />);
    // 10 data rows
    const rows = screen.getAllByRole('row');
    // +1 header row
    expect(rows).toHaveLength(11);
  });

  it('should render Skeleton rows when loading', () => {
    render(<DataTable columns={columns} rows={makeRows(5)} loading={true} />);
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should call onSort with column key and direction on header click', async () => {
    const onSort = vi.fn();
    render(<DataTable columns={columns} rows={makeRows(3)} onSort={onSort} />);
    await userEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith('name', 'asc');
    // Second click flips to desc
    await userEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith('name', 'desc');
  });
});
