import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box } from '@mui/material';
import { FormField, TextInput, LoadingButton } from '../../../common/components';
import { useAuth } from '../../../common/hooks/useAuth';
import { useAppDispatch } from '../../../app/hooks';
import { addNotification } from '../../notifications/notificationSlice';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps): React.ReactElement {
  const dispatch = useAppDispatch();
  const { login, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues): Promise<void> => {
    try {
      await login(data);
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      dispatch(addNotification({ message, severity: 'error' }));
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <FormField label="Email address" error={errors.email?.message} required>
        <TextInput
          {...register('email')}
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          fullWidth
          error={Boolean(errors.email)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
      </FormField>

      <FormField label="Password" error={errors.password?.message} required>
        <TextInput
          {...register('password')}
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          fullWidth
          error={Boolean(errors.password)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
      </FormField>

      <LoadingButton
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        loading={isLoading}
        sx={{ mt: 1 }}
      >
        Sign in
      </LoadingButton>
    </Box>
  );
}
