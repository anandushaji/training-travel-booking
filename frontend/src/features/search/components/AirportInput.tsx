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

  const { data: airports, isFetching } = useSearchAirportsQuery(
    { q: query },
    { skip: query.length < 2 },
  );

  const options: AirportOption[] = airports ?? [];

  // Find the AirportOption that matches the current IATA value
  const selectedOption = options.find((o) => o.iata === value) ?? null;

  return (
    <Autocomplete<AirportOption>
      options={options}
      loading={isFetching}
      value={selectedOption}
      inputValue={query}
      onInputChange={(_, newInputValue) => {
        setQuery(newInputValue);
      }}
      onChange={(_, newValue) => {
        if (newValue) {
          onChange(newValue.iata);
        } else {
          onChange('');
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
