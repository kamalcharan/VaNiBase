'use client';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h2 className="text-2xl font-bold text-primary mb-2">VaNi Shell</h2>
      <p className="text-muted max-w-md">
        Select a view from the sidebar, or start a conversation with VaNi.
      </p>
    </div>
  );
}
