import { EmptyState, Button } from "../components/ui";

export default function NotFoundPage() {
  return (
    <EmptyState
      title="404 // Off the grid"
      description="This route is not part of the Building Intelligence terminal."
      action={<Button to="/">Back to analysis</Button>}
    />
  );
}
