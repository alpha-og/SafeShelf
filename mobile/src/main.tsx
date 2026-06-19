import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { CartProvider } from "@/providers/CartProvider";
import { ProfilesProvider, useProfiles } from "@/providers/ProfilesProvider";
import { StoreProvider } from "@/providers/StoreProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const router = createRouter({
  routeTree,
  context: { auth: undefined!, profiles: undefined! },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const auth = useAuth();
  const profiles = useProfiles();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
        StatusBar.setOverlaysWebView({ overlay: true });
        StatusBar.setStyle({ style: Style.Dark });
      });
    }
  }, []);
  if (auth.isLoading || profiles.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  return <RouterProvider router={router} context={{ auth, profiles }} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StoreProvider>
            <ProfilesProvider>
              <CartProvider>
                <InnerApp />
              </CartProvider>
            </ProfilesProvider>
          </StoreProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
