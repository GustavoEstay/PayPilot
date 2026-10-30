import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  args: { children: "Approved", tone: "success", dot: true },
  argTypes: {
    tone: {
      control: "select",
      options: ["neutral", "success", "danger", "warning", "info", "brand"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PaymentStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge tone="success" dot>
        Approved
      </Badge>
      <Badge tone="danger" dot>
        Rejected
      </Badge>
      <Badge tone="info" dot>
        Refunded
      </Badge>
      <Badge tone="warning" dot>
        Pending
      </Badge>
      <Badge tone="brand">Applied by Copilot</Badge>
    </div>
  ),
};
