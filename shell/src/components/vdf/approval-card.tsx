'use client';

interface ApprovalCardData {
  proposal: string;
  reasoning: string;
  actions: {
    accept: { skill: string; params: Record<string, unknown> };
    modify?: { skill: string; params: Record<string, unknown> };
    reject: { skill: string; params: Record<string, unknown> };
  };
}

interface Props {
  data: ApprovalCardData | null | undefined;
  variant?: string;
}

export default function ApprovalCard({ data }: Props) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-48 bg-surface-hover rounded mb-2" />
        <div className="h-3 w-full bg-surface-hover rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
      <h4 className="text-sm font-semibold text-foreground mb-2">Proposed Action</h4>
      <p className="text-sm text-foreground mb-2">{data.proposal}</p>
      <p className="text-xs text-muted mb-4">{data.reasoning}</p>
      <div className="flex gap-2">
        <button className="px-4 py-2 rounded-md text-sm bg-success text-white hover:opacity-90">
          Accept
        </button>
        {data.actions.modify && (
          <button className="px-4 py-2 rounded-md text-sm border border-border text-foreground hover:bg-surface-hover">
            Modify
          </button>
        )}
        <button className="px-4 py-2 rounded-md text-sm bg-danger text-white hover:opacity-90">
          Reject
        </button>
      </div>
    </div>
  );
}
