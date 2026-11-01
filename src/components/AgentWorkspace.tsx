import { useEffect, useMemo, useState } from "react";
import {
  Archive, ArrowUpRight, CheckCircle2, Circle, Clock3, ListFilter, ListTodo, PauseCircle,
  Plus, Search, Sparkles, X,
} from "lucide-react";
import { useStore, type Bot } from "@/state/store";
import { cn } from "@/lib/cn";

type Props = { bot: Bot; onClose: () => void };
type Filter = "all" | "active" | "waiting" | "archived";

function taskState(task: NonNullable<Bot["tasks"]>[number]) {
  if (task.busy) return { label: "Đang chạy", tone: "text-accent", Icon: Clock3, key: "active" as const };
  if (task.waitingForTeammates) return { label: "Chờ Agent khác", tone: "text-warning", Icon: PauseCircle, key: "waiting" as const };
  if (task.closedBy || task.archivedAt) return { label: "Đã lưu trữ", tone: "text-ink-tertiary", Icon: Archive, key: "archived" as const };
  return { label: "Đang chờ", tone: "text-ink-secondary", Icon: Circle, key: "all" as const };
}

function taskDate(task: NonNullable<Bot["tasks"]>[number]): string | null {
  const value = task.updatedAt ?? task.createdAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function AgentWorkspace({ bot, onClose }: Props) {
  const { dispatch } = useStore();
  const tasks = bot.tasks ?? [];
  const activeCount = tasks.filter((task) => task.busy).length;
  const waitingCount = tasks.filter((task) => !task.busy && task.waitingForTeammates).length;
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return tasks.filter((task) => {
      const state = taskState(task);
      const matchesFilter = filter === "all" || state.key === filter;
      const matchesQuery = !normalizedQuery || (task.title ?? "").toLocaleLowerCase("vi").includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    }).slice(0, 30);
  }, [tasks, filter, query]);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: tasks.length },
    { id: "active", label: "Đang chạy", count: activeCount },
    { id: "waiting", label: "Đang chờ", count: waitingCount },
    { id: "archived", label: "Lưu trữ", count: tasks.filter((task) => Boolean(task.closedBy || task.archivedAt)).length },
  ];

  return (
    <>
      <button
        type="button"
        aria-label="Đóng Agent Workspace"
        onClick={onClose}
        className="absolute inset-0 z-30 cursor-default bg-black/35 backdrop-blur-[2px] lg:hidden"
      />
      <aside
        aria-label="Agent Workspace"
        aria-modal="true"
        role="dialog"
        className="animate-panel-in absolute inset-y-0 right-0 z-40 flex h-full w-[min(92vw,420px)] shrink-0 flex-col border-l border-hairline bg-panel shadow-2xl lg:relative lg:w-[380px] lg:max-w-[40vw] lg:shadow-none"
        data-agent-workspace
      >
        <header className="flex items-center justify-between border-b border-hairline/60 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent/12 text-accent">
              <Sparkles size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-ink">Agent Workspace</h2>
              <p className="truncate text-[11px] text-ink-secondary">{bot.name} · Không gian tác vụ</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => { dispatch({ type: "newTask", botId: bot.id }); onClose(); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-2.5 py-2 text-[11px] font-medium text-accent transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Plus size={14} /> Tác vụ mới
            </button>
          <button type="button" onClick={onClose} aria-label="Đóng Agent Workspace" className="rounded-lg p-2 text-ink-secondary transition-colors hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <X size={17} />
          </button>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2 border-b border-hairline/50 px-4 py-4" aria-label="Tổng quan tác vụ">
          <div className="rounded-xl border border-hairline/60 bg-card px-3 py-3">
            <p className="text-[10px] font-medium text-ink-secondary">Tổng tác vụ</p>
            <p className="mt-1 text-[23px] font-semibold leading-none tabular-nums text-ink">{tasks.length}</p>
          </div>
          <div className="rounded-xl border border-hairline/60 bg-card px-3 py-3">
            <p className="text-[10px] font-medium text-ink-secondary">Đang chạy</p>
            <p className="mt-1 text-[23px] font-semibold leading-none tabular-nums text-accent">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-hairline/60 bg-card px-3 py-3">
            <p className="text-[10px] font-medium text-ink-secondary">Chờ Agent</p>
            <p className="mt-1 text-[23px] font-semibold leading-none tabular-nums text-warning">{waitingCount}</p>
          </div>
        </section>

        <div className="border-b border-hairline/50 px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <ListTodo size={15} className="text-ink-secondary" />
              Danh sách tác vụ
            </div>
            <span className="text-[10px] text-ink-tertiary">Tối đa 30 tác vụ gần nhất</span>
          </div>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-hairline/70 bg-inset px-3 text-ink-secondary focus-within:border-accent/60">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tác vụ..."
              aria-label="Tìm tác vụ"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-tertiary"
            />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Xóa nội dung tìm kiếm" className="rounded p-0.5 hover:bg-raised"><X size={13} /></button>}
          </label>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Lọc tác vụ">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                  filter === item.id ? "bg-accent/12 text-accent" : "text-ink-secondary hover:bg-raised hover:text-ink",
                )}
              >
                {item.label}<span className={cn("tabular-nums", filter === item.id ? "text-accent/80" : "text-ink-tertiary")}>{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {visibleTasks.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center px-5 text-center">
              <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-inset text-ink-tertiary">
                {query ? <Search size={20} /> : <ListFilter size={20} />}
              </span>
              <p className="text-[13px] font-medium text-ink">{query ? "Không tìm thấy tác vụ" : tasks.length ? "Không có tác vụ trong bộ lọc này" : "Chưa có tác vụ"}</p>
              <p className="mt-1 max-w-[240px] text-[11px] leading-5 text-ink-secondary">
                {query ? "Thử từ khóa khác để tìm trong danh sách tác vụ." : "Khi dữ liệu tác vụ có sẵn, chúng sẽ được hiển thị tại đây."}
              </p>
              {(query || filter !== "all") && <button type="button" onClick={() => { setQuery(""); setFilter("all"); }} className="mt-3 rounded-lg px-3 py-1.5 text-[11px] font-medium text-accent hover:bg-accent/10">Xóa bộ lọc</button>}
            </div>
          ) : (
            <ul className="space-y-2">
              {visibleTasks.map((task) => {
                const status = taskState(task);
                const Icon = status.Icon;
                const date = taskDate(task);
                return (
                  <li key={task.threadId} className={cn("group rounded-xl border px-3.5 py-3 transition-colors", task.threadId === bot.threadId ? "border-accent/35 bg-accent/[0.045]" : "border-hairline/60 bg-card hover:border-hairline hover:bg-raised/70")}>
                    <div className="flex items-start gap-2.5">
                      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-inset", status.tone)}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[12px] font-medium leading-5 text-ink">{task.title || "Tác vụ chưa đặt tên"}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={cn("text-[10px] font-medium", status.tone)}>{status.label}</span>
                          {date && <><span className="text-ink-tertiary">·</span><time className="text-[10px] text-ink-tertiary">{date}</time></>}
                        </div>
                        <div className="mt-2.5 flex justify-end">
                          {task.threadId === bot.threadId ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent">
                              <CheckCircle2 size={12} /> Đang mở
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { dispatch({ type: "switchTask", botId: bot.id, threadId: task.threadId }); onClose(); }}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-ink-secondary transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                            >
                              Mở hội thoại <ArrowUpRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-hairline/60 bg-panel px-4 py-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-ink-tertiary" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-ink">Dữ liệu phiên làm việc</p>
              <p className="mt-0.5 break-all text-[10px] leading-4 text-ink-secondary">Thread: {bot.threadId}</p>
              <p className="mt-1 text-[10px] leading-4 text-ink-tertiary">Chọn một tác vụ để mở lại đúng hội thoại; tạo tác vụ mới bằng nút phía trên. Việc chạy Agent tiếp tục qua luồng chat gốc.</p>
            </div>
          </div>
        </footer>
      </aside>
    </>
  );
}
