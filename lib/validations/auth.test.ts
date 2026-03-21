import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  checkEmailSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  companySetupSchema,
} from "./auth";

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "admin@acme.com",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email");
    }
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = loginSchema.safeParse({
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = loginSchema.safeParse({
      email: "admin@acme.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("password");
    }
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "admin@acme.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({
      email: "admin@acme.com",
    });
    expect(result.success).toBe(false);
  });

  it("strips extra fields", () => {
    const result = loginSchema.safeParse({
      email: "admin@acme.com",
      password: "securepass123",
      extraField: "should be removed",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("extraField");
    }
  });

  it("accepts optional rememberMe boolean", () => {
    const result = loginSchema.safeParse({
      email: "admin@acme.com",
      password: "securepass123",
      rememberMe: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rememberMe).toBe(true);
    }
  });

  it("defaults rememberMe to false", () => {
    const result = loginSchema.safeParse({
      email: "admin@acme.com",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rememberMe).toBe(false);
    }
  });
});

describe("signupSchema", () => {
  const validSignup = {
    fullName: "John Doe",
    email: "john@acme.com",
    password: "Secure1!pass",
    confirmPassword: "Secure1!pass",
  };

  it("accepts valid signup data", () => {
    const result = signupSchema.safeParse(validSignup);
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = signupSchema.safeParse({ ...validSignup, fullName: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({ ...validSignup, email: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: "secure1!pass",
      confirmPassword: "secure1!pass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without lowercase", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: "SECURE1!PASS",
      confirmPassword: "SECURE1!PASS",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: "Secure!pass",
      confirmPassword: "Secure!pass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without special character", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: "Secure1pass",
      confirmPassword: "Secure1pass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: "Se1!p",
      confirmPassword: "Se1!p",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      confirmPassword: "Different1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });
});

describe("checkEmailSchema", () => {
  it("accepts valid email", () => {
    const result = checkEmailSchema.safeParse({ email: "test@acme.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = checkEmailSchema.safeParse({ email: "bad" });
    expect(result.success).toBe(false);
  });
});

describe("verifyEmailSchema", () => {
  it("accepts valid token", () => {
    const result = verifyEmailSchema.safeParse({ token: "abc-123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty token", () => {
    const result = verifyEmailSchema.safeParse({ token: "" });
    expect(result.success).toBe(false);
  });
});

describe("resendVerificationSchema", () => {
  it("accepts valid email", () => {
    const result = resendVerificationSchema.safeParse({ email: "a@b.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = resendVerificationSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });
});

describe("companySetupSchema", () => {
  const valid = {
    tenantId: "tenant-123",
    companyName: "Acme Corp",
    companySize: "11-50",
    industry: "technology",
    userRole: "ceo",
    country: "india",
    currency: "INR",
  };

  it("accepts valid data", () => {
    expect(companySetupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing tenantId", () => {
    const result = companySetupSchema.safeParse({ ...valid, tenantId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects company name shorter than 2 characters", () => {
    const result = companySetupSchema.safeParse({ ...valid, companyName: "A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("companyName");
    }
  });

  it("rejects empty company size", () => {
    const result = companySetupSchema.safeParse({ ...valid, companySize: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty country", () => {
    const result = companySetupSchema.safeParse({ ...valid, country: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing currency", () => {
    const result = companySetupSchema.safeParse({ ...valid, currency: "" });
    expect(result.success).toBe(false);
  });
});
