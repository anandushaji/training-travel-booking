import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('should render count number of Skeleton elements', () => {
    const { container } = render(<Skeleton count={3} />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons).toHaveLength(3);
  });

  it('should render one Skeleton when count is omitted', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(1);
  });
});
