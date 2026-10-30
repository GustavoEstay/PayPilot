import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Select } from "./select";

const statuses = [
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "refunded", label: "Refunded" },
  { value: "pending", label: "Pending" },
];

const meta = {
  title: "UI/Select",
  component: Select,
  args: { label: "Status", options: statuses, placeholder: "All statuses" },
  decorators: [(Story) => <div className="w-56">{Story()}</div>],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const HiddenLabel: Story = { args: { hideLabel: true } };
export const Disabled: Story = { args: { disabled: true } };

export const Controlled: Story = {
  render: function Controlled(args) {
    const [value, setValue] = useState("rejected");
    return (
      <div className="flex flex-col gap-2">
        <Select {...args} value={value} onChange={(e) => setValue(e.target.value)} />
        <p className="text-xs text-slate-500">Value: {value || "(none)"}</p>
      </div>
    );
  },
};
