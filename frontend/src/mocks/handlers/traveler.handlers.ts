import { http, HttpResponse } from 'msw';
import type { TravelerProfile, TravelerPreferences, TravelerListResponse } from '../../features/profile/profile.types';

export const mockTraveler: TravelerProfile = {
  id: 'traveler-1',
  employeeId: 'EMP-001',
  email: 'alice@corp.com',
  firstName: 'Alice',
  lastName: 'Smith',
  fullName: 'Alice Smith',
  department: 'Engineering',
  jobTitle: 'Senior Engineer',
  level: 'L5',
  costCenter: 'CC-ENG-001',
  approvalRequired: false,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
};

const mockPreferences: TravelerPreferences = {
  seatPreference: 'WINDOW',
  mealPreference: 'STANDARD',
  specialRequests: '',
  frequentFlyerNumbers: [],
  loyaltyPrograms: [],
  notifications: {
    email: true,
    sms: false,
  },
};

export const travelerHandlers = [
  http.get('http://localhost/api/travelers', () =>
    HttpResponse.json<TravelerListResponse>({
      travelers: [mockTraveler],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        limit: 20,
      },
    }),
  ),

  http.get('http://localhost/api/travelers/:id', () =>
    HttpResponse.json<TravelerProfile>(mockTraveler),
  ),

  http.patch('http://localhost/api/travelers/:id', async ({ request }) => {
    const body = await request.json() as Partial<TravelerProfile>;
    return HttpResponse.json<TravelerProfile>({ ...mockTraveler, ...body });
  }),

  http.delete('http://localhost/api/travelers/:id', () =>
    new HttpResponse(null, { status: 200 }),
  ),

  http.get('http://localhost/api/travelers/:id/preferences', () =>
    HttpResponse.json<TravelerPreferences>(mockPreferences),
  ),

  http.put('http://localhost/api/travelers/:id/preferences', async ({ request }) => {
    const body = await request.json() as Partial<TravelerPreferences>;
    return HttpResponse.json<TravelerPreferences>({ ...mockPreferences, ...body });
  }),
];
