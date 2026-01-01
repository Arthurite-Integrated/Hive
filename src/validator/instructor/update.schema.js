export const updateInstructorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});