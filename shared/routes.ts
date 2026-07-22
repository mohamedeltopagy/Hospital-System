import { z } from 'zod';
import { 
  insertUserSchema, users, 
  insertClinicSchema, clinics,
  insertAppointmentSchema, appointments,
  insertMedicalHistorySchema, medicalHistory,
  insertReportSchema, reports,
  insertTreatmentPlanSchema, treatmentPlans,
  insertPrescriptionSchema, prescriptions,
  insertServiceSchema, services,
  loginSchema
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  clinics: {
    list: {
      method: 'GET' as const,
      path: '/api/clinics' as const,
      responses: {
        200: z.array(z.custom<typeof clinics.$inferSelect>()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/clinics/:id' as const,
      responses: {
        200: z.custom<typeof clinics.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  appointments: {
    list: {
      method: 'GET' as const,
      path: '/api/appointments' as const,
      responses: {
        200: z.array(z.custom<typeof appointments.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments' as const,
      input: insertAppointmentSchema,
      responses: {
        201: z.custom<typeof appointments.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  medicalHistory: {
    list: {
      method: 'GET' as const,
      path: '/api/medical-history' as const,
      responses: {
        200: z.array(z.custom<typeof medicalHistory.$inferSelect>()),
      }
    }
  },
  reports: {
    list: {
      method: 'GET' as const,
      path: '/api/reports' as const,
      responses: {
        200: z.array(z.custom<typeof reports.$inferSelect>()),
      }
    }
  },
  treatmentPlans: {
    list: {
      method: 'GET' as const,
      path: '/api/treatment-plans' as const,
      responses: {
        200: z.array(z.custom<typeof treatmentPlans.$inferSelect>()),
      }
    }
  },
  prescriptions: {
    list: {
      method: 'GET' as const,
      path: '/api/prescriptions' as const,
      responses: {
        200: z.array(z.custom<typeof prescriptions.$inferSelect>()),
      }
    }
  },
  users: {
    doctors: {
      method: 'GET' as const,
      path: '/api/doctors' as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      }
    }
  },
  services: {
    list: {
      method: 'GET' as const,
      path: '/api/services' as const,
      responses: {
        200: z.array(z.custom<typeof services.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/services' as const,
      input: insertServiceSchema,
      responses: {
        201: z.custom<typeof services.$inferSelect>(),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}