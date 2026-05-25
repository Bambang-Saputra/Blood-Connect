"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "./api";

/**
 * Notification Bell — dropdown di header dashboard.
 * Polling tiap 30 detik untuk update count.
 */

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function loadCount() {
    const res = await api("/notifications/count").then((r) => r.json()).catch(() => ({ count: 0 }));
    setUnread(res.count ?? 0);
  }

  async function loadAll() {
    const res = await api("/notifications").then((r) => r.json()).catch(() => ({ data: [] }));
    setNotifs(res.data ?? []);
  }

  async function toggle() {
    if (!open) await loadAll();
    setOpen(!open);
  }

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: "PATCH" });
    setNotifs((arr) => arr.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    loadCount();
  }

  async function markAllRead() {
    await api("/notifications/read-all", { method: "PATCH" });
    setNotifs((arr) => arr.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative p-2 rounded hover:bg-slate-100"
        aria-label="Notifikasi"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b flex justify-between items-center">
            <span className="font-semibold text-sm">Notifikasi</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-red-600 hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Tidak ada notifikasi.</p>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${
                    n.isRead ? "" : "bg-blue-50"
                  }`}
                >
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString("id-ID")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
