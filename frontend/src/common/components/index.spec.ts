import { describe, it, expect } from 'vitest';
import * as barrel from './index';

const REQUIRED_EXPORTS = [
  'Header', 'Sidebar', 'Footer', 'PageContainer',
  'Button', 'IconButton', 'LoadingButton',
  'FormField', 'TextInput', 'SelectInput', 'DatePickerInput', 'NumberInput',
  'DataTable', 'StatusBadge', 'CurrencyDisplay', 'Card', 'ClickableCard',
  'Alert', 'GlobalSnackbar', 'Modal', 'ConfirmDialog',
  'Spinner', 'Skeleton', 'LoadingOverlay',
  'EmptyState',
  'ErrorBoundary',
];

describe('common/components barrel export', () => {
  it('should export all required components', () => {
    for (const name of REQUIRED_EXPORTS) {
      expect((barrel as Record<string, unknown>)[name], `${name} should be exported`).toBeDefined();
    }
  });

  it('should export at least 25 named exports', () => {
    const exportedNames = Object.keys(barrel).filter((k) => {
      const v = (barrel as Record<string, unknown>)[k];
      // React.forwardRef components have typeof === 'object'; plain components === 'function'
      return typeof v === 'function' || (typeof v === 'object' && v !== null);
    });
    expect(exportedNames.length).toBeGreaterThanOrEqual(25);
  });
});
