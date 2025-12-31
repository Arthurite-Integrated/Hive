import { AUTH_LOGIN_TYPES } from "#constants/auth/auth";
import z from "zod";

export const loginInstructorSchema = z.object({
  loginType: z.enum(Object.values(AUTH_LOGIN_TYPES)),
  email: z.email(),
  password: z.string().min(8).max(100).optional(),
}).superRefine((data, ctx) => {
  if (data.loginType === AUTH_LOGIN_TYPES.PASSWORD) {
    if (!data.password) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Password is required" });
    }
  }
});