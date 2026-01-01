import z from "zod";

export const verifyOTPSchema = z.object({
  otp: z.string().min(6).max(6),
}).superRefine((data, ctx) => {
  if (data.otp.length !== 6) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "OTP must be 6 digits" });
  }
});