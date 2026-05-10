import React, { useState, useEffect, useRef } from 'react';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { useValidatePolicyQuery } from '../policyApi';

// Module-level concurrency gate — max 10 simultaneous in-flight policy calls
let inFlightPolicyRequests = 0;

/** Exposed for test isolation — resets the module-level counter. */
export function _resetPolicyCounterForTesting(): void {
  inFlightPolicyRequests = 0;
}

export interface PolicyBadgeProps {
  offerId: string;
  amount: number;
  currency: string;
}

export function PolicyBadge({ offerId, amount, currency }: PolicyBadgeProps): React.ReactElement {
  const [hasSlot, setHasSlot] = useState(false);
  const didIncrementRef = useRef(false);

  // Acquire a concurrency slot on mount
  useEffect(() => {
    if (inFlightPolicyRequests < 10) {
      inFlightPolicyRequests++;
      didIncrementRef.current = true;
      setHasSlot(true);
    }
    return () => {
      if (didIncrementRef.current) {
        inFlightPolicyRequests = Math.max(0, inFlightPolicyRequests - 1);
        didIncrementRef.current = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError } = useValidatePolicyQuery(
    { offerId, amount, currency },
    { skip: !hasSlot },
  );

  if (!hasSlot || isLoading) {
    return <CircularProgress size={16} aria-label="Validating policy" />;
  }

  if (isError) {
    return <Chip label="POLICY UNKNOWN" size="small" />;
  }

  if (data?.compliant === true) {
    return <Chip label="COMPLIANT" color="success" size="small" />;
  }

  return <Chip label="EXCEEDS POLICY" color="warning" size="small" />;
}
