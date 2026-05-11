import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useRouterState, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Sidebar, MobileBar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PageShell } from "@/components/layout/PageShell";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { APIProvider } from "@vis.gl/react-google-maps";
import { LanguageProvider } from "@/lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass p-10">
        <h1 className="text-7xl font-display font-extrabold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">The page you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-[var(--color-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-blue-400)]">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass p-10">
        <h1 className="text-xl font-display font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-[var(--color-blue-500)] px-4 py-2 text-sm font-medium text-white">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AwaazAI — Civic Grievance Intelligence" },
      { name: "description", content: "AI-powered grievance resolution for 1.4 billion citizens." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isAuthRoute = path === "/auth";
  return (
    <QueryClientProvider client={queryClient}>
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              {isAuthRoute ? (
                <main className="min-h-screen"><Outlet /></main>
              ) : (
                <div className="min-h-screen relative">
                  <AnimatedBackground />
                  <Sidebar />
                  <div className="md:pl-[260px] min-h-screen flex flex-col">
                    <TopBar />
                    <main className="flex-1">
                      <PageShell><Outlet /></PageShell>
                    </main>
                  </div>
                  <MobileBar />
                </div>
              )}
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </APIProvider>
    </QueryClientProvider>
  );
}
