import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Metric: Story = {
  render: () => (
    <Card className="w-64 p-4">
      <p className="text-xs font-medium text-slate-500">Approval rate</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">80.2%</p>
      <p className="mt-0.5 text-[11px] text-slate-400">Excludes pending</p>
    </Card>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div>
          <CardTitle>Refund proposal</CardTitle>
          <CardDescription>PAY-0426 · Brooklyn Audio</CardDescription>
        </div>
        <Badge tone="warning">Needs approval</Badge>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button size="sm" variant="danger">
          Confirm refund
        </Button>
        <Button size="sm" variant="secondary">
          Cancel
        </Button>
      </CardContent>
    </Card>
  ),
};
