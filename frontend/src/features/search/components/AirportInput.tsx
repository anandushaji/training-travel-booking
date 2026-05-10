import React, { useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import { useSearchAirportsQuery } from '../flightApi';
import type { AirportOption } from '../search.types';

export interface AirportInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (iata: string) => void;
  error?: string | undefined;
  'aria-label'?: string;
}

export function AirportInput({
  name,
  label,
  value,
  onChange,
  error,
  'aria-label': ariaLabel,
}: AirportInputProps): React.ReactElement {
  const [query, setQuery] = useState('');
  // Cache the last selected option so the label stays visible even when the
  // options list changes after selection (e.g. query was updated by Autocomplete).
  const [cachedSelected, setCachedSelected] = useState<AirportOption | null>(null);

  const { data: airports, isFetching } = useSearchAirportsQuery(
    { q: query },
    { skip: query.length < 2 },
  );

  const options: AirportOption[] = airports ?? [];

  // Prefer a live match from current results; fall back to the cached selection
  // so the label is never lost when the options list refreshes.
  const selectedOption: AirportOption | null = value
    ? (options.find((o) => o.iata === value) ?? cachedSelected)
    : null;

  return (
    <Autocomplete<AirportOption>
      options={options}
      loading={isFetching}
      value={selectedOption}
      onInputChange={(_, newInputValue, reason) => {
        // Only drive the API query when the user is actually typing.
        // Ignore 'reset' (Autocomplete sets inputValue to the label on selection)
        // to prevent a re-query that would wipe the selected option from the list.
        if (reason === 'input') {
          setQuery(newInputValue);
        } else if (reason === 'clear') {
          setQuery('');
        }
      }}
      onChange={(_, newValue) => {
        if (newValue) {
          onChange(newValue.iata);
          setCachedSelected(newValue);
        } else {
          onChange('');
          setCachedSelected(null);
          setQuery('');
        }
      }}
      getOptionLabel={(option) =>
        `${option.iata} \u2014 ${option.city}, ${option.name}`
      }
      isOptionEqualToValue={(option, val) => option.iata === val.iata}
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          label={label}
          size="small"
          fullWidth
          error={!!error}
          helperText={error}
          inputProps={{
            ...params.inputProps,
            'aria-label': ariaLabel ?? label,
          }}
          // MUI Autocomplete types several InputLabelProps fields as T|undefined;
          // cast to satisfy exactOptionalPropertyTypes on TextField's prop type.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          InputLabelProps={params.InputLabelProps as any}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isFetching ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
