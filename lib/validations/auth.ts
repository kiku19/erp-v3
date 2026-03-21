import { z } from "zod";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().default(false),
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Please enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const checkEmailSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const resendVerificationSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

const companySetupSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companySize: z.string().min(1, "Please select a company size"),
  industry: z.string().min(1, "Please select an industry"),
  userRole: z.string().min(1, "Please select your role"),
  country: z.string().min(1, "Please select a country"),
  currency: z.string().min(1, "Please select a currency"),
});

type LoginInput = z.infer<typeof loginSchema>;
type SignupInput = z.infer<typeof signupSchema>;
type CheckEmailInput = z.infer<typeof checkEmailSchema>;
type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
type CompanySetupInput = z.infer<typeof companySetupSchema>;

export {
  loginSchema,
  signupSchema,
  passwordSchema,
  checkEmailSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  companySetupSchema,
  type LoginInput,
  type SignupInput,
  type CheckEmailInput,
  type VerifyEmailInput,
  type ResendVerificationInput,
  type CompanySetupInput,
};
