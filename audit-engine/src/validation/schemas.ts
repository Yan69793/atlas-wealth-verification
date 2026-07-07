import { z } from 'zod';

// Login request schema
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// Ingest request schema
export const ingestSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM'),
});

export type IngestInput = z.infer<typeof ingestSchema>;

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Nome do arquivo é obrigatório'),
  size: z.number().max(50 * 1024 * 1024, 'Arquivo não pode exceder 50MB'), // 50MB max
  mimetype: z.enum(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'], {
    message: 'Apenas arquivos Excel (.xlsx, .xls) são permitidos',
  }),
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;

// Validation helper function
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessages = result.error.issues.map((e: z.ZodIssue) => e.message).join(', ');
  return { success: false, error: errorMessages };
}
