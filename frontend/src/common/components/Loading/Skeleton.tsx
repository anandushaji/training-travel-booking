import React from 'react';
import { Skeleton as MuiSkeleton, SkeletonProps as MuiSkeletonProps } from '@mui/material';

export interface SkeletonProps extends MuiSkeletonProps {
  count?: number;
}

export function Skeleton({ count = 1, ...rest }: SkeletonProps): React.ReactElement {
  if (count === 1) {
    return <MuiSkeleton {...rest} />;
  }
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <MuiSkeleton key={i} {...rest} />
      ))}
    </>
  );
}
