import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardActions,
} from "./card";
import { Button } from "./button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card data-testid="card" style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Simple card with a title and content.</p>
      </CardContent>
    </Card>
  ),
};

export const WithAllSections: Story = {
  render: () => (
    <Card data-testid="card" style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description text</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content area of the card.</p>
        <p>It supports multiple children with vertical spacing.</p>
      </CardContent>
      <CardActions>
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm">Save</Button>
      </CardActions>
    </Card>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Card data-testid="card" style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>Confirm Action</CardTitle>
        <CardDescription>Are you sure you want to proceed?</CardDescription>
      </CardHeader>
      <CardActions>
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm">Confirm</Button>
      </CardActions>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card data-testid="card" style={{ maxWidth: 400 }}>
      <CardContent>
        <p>A card with just content, no header or actions.</p>
      </CardContent>
    </Card>
  ),
};
