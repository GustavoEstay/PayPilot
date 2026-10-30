import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

async function ask(page: Page, prompt: string) {
  const input = page.getByLabel("Message the copilot");
  await input.fill(prompt);
  await input.press("Enter");
}

async function getPayment(request: APIRequestContext, id: string) {
  const res = await request.get(`/api/payments?q=${id}`);
  const body = (await res.json()) as {
    items: { id: string; status: string; refundedAmount: number }[];
  };
  return body.items.find((p) => p.id === id)!;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Payments overview" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "AI copilot" })).toBeVisible();
  await expect(page.getByText("Mock provider")).toBeVisible();
});

test("explains a sales drop with a chart (analyzeSalesDrop)", async ({ page }) => {
  await page.getByRole("button", { name: "Why did sales drop in the last 7 days?" }).click();

  const card = page.getByTestId("sales-drop-card");
  await expect(card).toBeVisible();
  await expect(card.locator(".recharts-responsive-container")).toBeVisible();
  await expect(card).toContainText("Main drivers");

  const reply = page.getByTestId("message-assistant").last();
  await expect(reply).toContainText(/Approved volume fell \d+%/);
  await expect(reply).toContainText("Issuer unavailable");
});

test("filters the dashboard table from chat (filterPayments)", async ({ page }) => {
  await page
    .getByRole("button", { name: "Show rejected card payments from the last 7 days" })
    .click();

  const card = page.getByTestId("filter-applied-card");
  await expect(card).toBeVisible();
  const matches = Number((await card.getByText(/\d+ matches/).textContent())!.match(/\d+/)![0]);

  await expect(page.getByTestId("copilot-filter-badge")).toBeVisible();
  await expect(page.getByLabel("Status")).toHaveValue("rejected");
  await expect(page.getByLabel("Method")).toHaveValue("card");
  await expect(page.getByLabel("From")).toHaveValue("2026-10-23");
  await expect(page.getByTestId("results-count")).toHaveText(`${matches} payments`);

  const rows = page.getByTestId("payment-row");
  await expect(rows.first()).toContainText("Rejected");
  await expect(rows.first()).toContainText("Card");
});

test("refund only executes after human confirmation (proposeRefund)", async ({ page, request }) => {
  const before = await getPayment(request, "PAY-0426");
  expect(before.status).toBe("approved");

  await ask(page, "Refund $5 of PAY-0426 because goodwill gesture");

  const card = page.getByTestId("refund-confirm-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Needs approval");
  await expect(card).toContainText("$5.00");
  await expect(page.getByTestId("message-assistant").last()).toContainText(
    "Nothing has been refunded yet",
  );

  // The model proposed it, but nothing moved yet.
  expect((await getPayment(request, "PAY-0426")).refundedAmount).toBe(before.refundedAmount);

  await card.getByRole("button", { name: "Confirm refund" }).click();
  await expect(page.getByTestId("refund-success")).toBeVisible();
  await expect(card).toContainText("Refunded");

  const after = await getPayment(request, "PAY-0426");
  expect(after.refundedAmount).toBeCloseTo(before.refundedAmount + 5, 2);
});

test("cancelling a refund proposal moves no money", async ({ page, request }) => {
  const before = await getPayment(request, "PAY-0426");
  await ask(page, "Refund $5 of PAY-0426 because testing cancel");
  const card = page.getByTestId("refund-confirm-card");
  await card.getByRole("button", { name: "Cancel" }).click();
  await expect(card).toContainText("No refund was made.");
  expect((await getPayment(request, "PAY-0426")).refundedAmount).toBe(before.refundedAmount);
});
