import { CheckCircle2, Circle, Clock3, ListTodo, PauseCircle, Sparkles, X } from "lucide-react";
import type { Bot } from "@/state/store";
import { cn } from "@/lib/cn";

type Props = { bot: Bot; onClose: () => void };

function taskState(task: NonNullable<Bot["tasks"]>[number]) {
  if (task.busy) return { label: "Đang chạy", tone: "text-accent", Icon: Clock3 };
  if (task.waitingForTeammates) return { label: "Chờ Agent khác", tone: "text-warning", Icon: PauseCircle };
  if (task.closedBy || task.archivedAt) return { label: "Đã lưu trữ", tone: "text-ink-tertiary", Icon: CheckCircle2 };
  return { label: "Đang chờ", tone: "text-ink-secondary", Icon: Circle };
}

export function AgentWorkspace({ bot, onClose }: Props) {
  const tasks = bot.tasks ?? [];
  const active = tasks.filter((task) => task.busy || task.waitingForTeammates);
  const recent = tasks.slice(0, 12);

  return (
    <aside
      aria-label="Agent Workspace"
      className="animate-panel-in flex h-full w-[360px] max-w-[42vw] shrink-0 flex-col border-l border-hairline/50 bg-panel max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:w-[min(92vw,380px)] max-lg:max-w-none max-lg:shadow-2xl"
      data-agent-workspace
    >
      <header className="flex items-center justify-between border-b border-hairline/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent/12 text-accent"><Sparkles size={17} /></span>
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-semibold text-ink">Agent Workspace</h2>
            <p className="truncate text-[11px] text-ink-secondary">{bot.name}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng Agent Workspace" className="rounded-lg p-2 text-ink-secondary hover:bg-raised hover:text-ink"><X size={17} /></button>
      </header>

      <div className="grid grid-cols-2 gap-2 border-b border-hairline/40 p-3">
        <div className="rounded-xl border border-hairline/50 bg-card p-3">
          <div className="text-[11px] text-ink-secondary">Đang hoạt động</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{active.length}</div>
        </div>
        <div className="rounded-xl border border-hairline/50 bg-card p-3">
          <div className="text-[11px] text-ink-secondary">Tổng tác vụ</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{tasks.length}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-ink">
          <ListTodo size={15} className="text-ink-secondary" /> Tác vụ gần đây
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline/70 px-4 py-8 text-center">
            <Sparkles size={22} className="mx-auto mb-2 text-ink-tertiary" />
            <p className="text-[13px] font-medium text-ink">Chưa có tác vụ</p>
            <p className="mt-1 text-[11px] leading-5 text-ink-secondary">Khi Agent tạo hoặc chạy tác vụ, tiến trình sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((task) => {
              const status = taskState(task);
              const Icon = status.Icon;
              return (
                <li key={task.threadId} className="rounded-xl border border-hairline/50 bg-card p-3">
                  <div className="flex items-start gap-2.5">
                    <Icon size={15} className={cn("mt-0.5 shrink-0", status.tone)} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[12px] font-medium leading-5 text-ink">{task.title || "Tác vụ chưa đặt tên"}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className={cn("text-[10px]", status.tone)}>{status.label}</span>
                        <time className="text-[10px] text-ink-tertiary">{new Date(task.updatedAt ?? task.createdAt).toLocaleString()}</time>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-5 rounded-xl bg-inset/70 p-3">
          <p className="text-[11px] font-semibold text-ink">Thông tin phiên làm việc</p>
          <p className="mt-1 break-all text-[10px] text-ink-secondary">Thread hiện tại: {bot.threadId}</p>
          <p className="mt-1 text-[10px] text-ink-tertiary">Trạng thái được đọc từ dữ liệu tác vụ sẵn có; bảng này không tự tạo hay giả lập tiến trình Agent.</p>
        </div>
      </div>
    </aside>
  );
}
