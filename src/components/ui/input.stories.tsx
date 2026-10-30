import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  args: { label: "Search", placeholder: "ID or merchant" },
  decorators: [(Story) => <div className="w-64">{Story()}</div>],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DateInput: Story = { args: { label: "From", type: "date", min: "2026-08-31" } };
