import React from 'react';
import { Box, Checkbox, FormControlLabel } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { TextInput, Button, Alert } from '../../../common/components';
import { useUpdateTravelerMutation } from '../travelerApi';
import type { TravelerProfile, UpdateTravelerRequest } from '../profile.types';

interface ProfileFormValues {
  fullName: string;
  department: string;
  jobTitle: string;
  costCenter: string;
  approvalRequired: boolean;
}

interface ProfileFormProps {
  profile: TravelerProfile;
}

export function ProfileForm({ profile }: ProfileFormProps): React.ReactElement {
  const [updateTraveler, { isLoading, isSuccess, isError, error }] =
    useUpdateTravelerMutation();

  const { register, control, handleSubmit } = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: profile.fullName ?? '',
      department: profile.department,
      jobTitle: profile.jobTitle ?? '',
      costCenter: profile.costCenter ?? '',
      approvalRequired: profile.approvalRequired ?? false,
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    const body: UpdateTravelerRequest = {
      name: values.fullName || undefined,
      department: values.department,
      jobTitle: values.jobTitle || undefined,
      costCenter: values.costCenter || undefined,
      approvalRequired: values.approvalRequired,
    };
    await updateTraveler({ id: profile.id, ...body });
  };

  return (
    <Box
      component="form"
      data-testid="profile-form"
      onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}
    >
      {/* Editable identity field */}
      <TextInput
        label="Full Name"
        data-testid="field-fullName"
        {...register('fullName')}
      />
      {/* Read-only fields */}
      <TextInput
        name="email"
        label="Email"
        value={profile.email}
        InputProps={{ readOnly: true }}
        data-testid="field-email"
      />
      <TextInput
        name="employeeId"
        label="Employee ID"
        value={profile.employeeId}
        InputProps={{ readOnly: true }}
        data-testid="field-employeeId"
      />
      {profile.manager && (
        <TextInput
          name="manager"
          label="Manager"
          value={profile.manager.name}
          InputProps={{ readOnly: true }}
          data-testid="field-manager"
        />
      )}

      {/* Editable fields */}
      <TextInput
        label="Department"
        data-testid="field-department"
        {...register('department')}
      />
      <TextInput
        label="Job Title"
        data-testid="field-jobTitle"
        {...register('jobTitle')}
      />
      <TextInput
        label="Cost Center"
        data-testid="field-costCenter"
        {...register('costCenter')}
      />
      <Controller
        name="approvalRequired"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Checkbox
                {...field}
                checked={field.value}
                data-testid="field-approvalRequired"
              />
            }
            label="Approval Required"
          />
        )}
      />

      {isSuccess && (
        <Alert severity="success" message="Profile updated successfully." data-testid="profile-success" />
      )}
      {isError && (
        <Alert
          severity="error"
          message={
            (error as { data?: { message?: string } })?.data?.message ??
            'Failed to update profile. Please try again.'
          }
          data-testid="profile-error"
        />
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        data-testid="profile-submit"
      >
        {isLoading ? 'Saving…' : 'Save Changes'}
      </Button>
    </Box>
  );
}
