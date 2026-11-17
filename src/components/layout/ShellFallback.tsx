export function ShellFallback() {
  return (
    <div className="flex h-full flex-col" aria-busy="true">
      <div className="h-11 shrink-0 border-b bg-sidebar" />
      <div className="flex min-h-0 flex-1">
        <div className="w-[250px] shrink-0 border-r bg-sidebar" />
        <div className="flex-1" />
      </div>
    </div>
  );
}
