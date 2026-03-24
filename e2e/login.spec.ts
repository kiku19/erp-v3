import { test, expect } from "@playwright/test";

const STORY_URL = "/iframe.html?id=auth-authlayout--with-login-content&viewMode=story";
const FORM_URL = "/iframe.html?id=login-loginform--default&viewMode=story";
const FORM_ERROR_URL = "/iframe.html?id=login-loginform--with-server-error&viewMode=story";
const FORM_LOADING_URL = "/iframe.html?id=login-loginform--loading&viewMode=story";

test.describe("Login Page", () => {
  test("renders both panels with branding and form", async ({ page }) => {
    await page.goto(STORY_URL);
    await expect(page.getByText("Opus E1").first()).toBeVisible();
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("branding panel shows hero text and features", async ({ page }) => {
    await page.goto(STORY_URL);
    await expect(page.getByText(/Streamline your/)).toBeVisible();
    await expect(page.getByText("Real-time inventory tracking")).toBeVisible();
    await expect(page.getByText("Automated financial reporting")).toBeVisible();
    await expect(page.getByText("Multi-location support")).toBeVisible();
  });

  test("branding panel shows testimonial", async ({ page }) => {
    await page.goto(STORY_URL);
    await expect(page.getByText(/order processing time/)).toBeVisible();
    await expect(page.getByText("Sarah Chen")).toBeVisible();
  });
});

test.describe("Login Form", () => {
  test("renders email and password inputs", async ({ page }) => {
    await page.goto(FORM_URL);
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true }).first()).toBeVisible();
  });

  test("renders sign in button and links", async ({ page }) => {
    await page.goto(FORM_URL);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Forgot password?")).toBeVisible();
    await expect(page.getByText("Sign up")).toBeVisible();
  });

  test("shows validation errors for empty form submission", async ({ page }) => {
    await page.goto(FORM_URL);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Please enter a valid email address")).toBeVisible();
    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
  });

  test("shows server error message", async ({ page }) => {
    await page.goto(FORM_ERROR_URL);
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("shows loading state with disabled button", async ({ page }) => {
    await page.goto(FORM_LOADING_URL);
    const btn = page.getByRole("button", { name: /signing in/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });
});
