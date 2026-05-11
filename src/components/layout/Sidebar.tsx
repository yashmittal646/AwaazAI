import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LayoutDashboard, FilePlus2, ListChecks, Map, BrainCircuit, LogOut, LogIn, Trophy, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminSession, clearAdminSession } from "@/lib/adminAuth";
import { useTranslation } from "@/lib/i18n";
import { useState, useEffect } from "react";

const useCitizenNavItems = () => {
  const { t } = useTranslation();
  return [
    { to: "/",               label: t("dashboard"),      icon: LayoutDashboard },
    { to: "/file-complaint", label: t("file_complaint"), icon: FilePlus2       },
    { to: "/my-grievances",  label: t("my_grievances"),  icon: ListChecks      },
    { to: "/rewards",        label: "Rewards",           icon: Trophy          },
    { to: "/heatmap",        label: t("heatmap"),        icon: Map             },
  ];
};

const ADMIN_ITEMS = [
  { to: "/admin", label: "Admin Portal", icon: BrainCircuit },
];

export function Sidebar() {
  const path     = useRouterState({ select: (s) => s.location.pathname });
  const nav      = useNavigate();
  const { user, signOut } = useAuth();
  const { t }   = useTranslation();
  const items    = useCitizenNavItems();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { setIsAdmin(isAdminSession()); }, [path]);

  const initial = (user?.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase() ?? (isAdmin ? "A" : "G");
  const display = isAdmin ? "Administrator" : ((user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Guest");
  const sub     = isAdmin ? "Admin session active" : user
    ? (user.user_metadata?.city ? `Citizen · ${user.user_metadata.city}` : "Citizen account")
    : "Sign in to file complaints";

  const handleAdminLogout = () => { clearAdminSession(); nav({ to: "/auth" }); };

  const allItems = isAdmin ? [...items, ...ADMIN_ITEMS] : items;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[260px] glass-strong z-40 flex-col p-4 border-r border-[var(--glass-border)]">
      <Link to="/" className="flex items-center gap-3 px-2 py-3 mb-4">
        <div className="relative h-10 w-10 flex-shrink-0">
          <img src="/awaaz-logo.png" alt="Awaaz AI" className="h-10 w-10 rounded-xl object-cover" />
        </div>
        <div className="leading-tight">
          <div className="font-display font-extrabold text-lg">Awaaz<span className="text-[var(--color-saffron)]">AI</span></div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            {isAdmin ? "Admin Portal" : "Civic Intelligence"}
          </div>
        </div>
      </Link>

      {isAdmin && (
        <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-amber-400"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
          Admin mode — full access
        </div>
      )}

      <nav className="flex-1 space-y-1 mt-2">
        {allItems.map((it) => {
          const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
          const Icon   = it.icon;
          const isAdminLink = it.to === "/admin";
          return (
            <Link key={it.to} to={it.to} className="block">
              <div className={`relative flex items-center gap-3 h-11 px-3 rounded-xl transition-all
                ${active
                  ? isAdminLink ? "text-amber-400" : "text-[var(--color-blue-300)]"
                  : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"}`}>
                {active && (
                  <motion.div layoutId="sb-active" className="absolute inset-0 rounded-xl glass"
                    style={{ borderLeft: `3px solid ${isAdminLink ? "#f59e0b" : "var(--color-blue-400)"}` }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                )}
                <Icon className="h-[18px] w-[18px] relative z-10" />
                <span className="relative z-10 text-sm font-medium">{it.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-3 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-2 px-2 text-xs text-[var(--text-secondary)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-emerald)]" />
          </span>
          System Live · 12ms
        </div>

        <div className="flex items-center gap-3 px-2 py-2 glass rounded-xl">
          <div className="h-8 w-8 rounded-full grid place-items-center font-display font-bold text-sm text-white"
            style={{ background: isAdmin ? "linear-gradient(135deg,#f59e0b,#d97706)" : "var(--gradient-saffron)" }}>
            {initial}
          </div>
          <div className="text-xs leading-tight flex-1 min-w-0">
            <div className="font-medium truncate">{display}</div>
            <div className="text-[var(--text-secondary)] truncate">{sub}</div>
          </div>

          {isAdmin ? (
            <button onClick={handleAdminLogout} title="Exit admin" className="h-7 w-7 grid place-items-center rounded-md hover:bg-amber-500/20 text-amber-400">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : user ? (
            <button onClick={() => signOut()} title="Sign out" className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10 text-[var(--text-secondary)]">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link to="/auth" title="Sign in" className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10 text-[var(--color-blue-300)]">
              <LogIn className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}

export function MobileBar() {
  const path  = useRouterState({ select: (s) => s.location.pathname });
  const items = useCitizenNavItems();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { setIsAdmin(isAdminSession()); }, [path]);

  const all = isAdmin ? [...items, ...ADMIN_ITEMS] : items;

  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 glass-strong rounded-2xl p-2 flex justify-between">
      {all.map((it) => {
        const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
        const Icon   = it.icon;
        return (
          <Link key={it.to} to={it.to}
            className={`flex-1 flex flex-col items-center py-2 rounded-xl text-[10px] ${active ? "text-[var(--color-blue-300)] bg-white/5" : "text-[var(--text-secondary)]"}`}>
            <Icon className="h-5 w-5 mb-0.5" />
            <span className="font-medium">{it.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
