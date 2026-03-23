/* @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let paramsMock = { name: "demo-plugin" };
type LoaderDataMock = {
  detail: {
    package:
      | {
          name: string;
          displayName: string;
          family: "code-plugin";
          channel: "community";
          isOfficial: boolean;
          summary: string;
          latestVersion: string | null;
          createdAt: number;
          updatedAt: number;
          tags: Record<string, string>;
          compatibility: null;
          capabilities: { executesCode: boolean; capabilityTags: string[] };
          verification: null;
        }
      | null;
    owner: null;
  };
  version: null;
  readme: string | null;
};
let loaderDataMock: LoaderDataMock = {
  detail: {
    package: {
      name: "demo-plugin",
      displayName: "Demo Plugin",
      family: "code-plugin" as const,
      channel: "community" as const,
      isOfficial: false,
      summary: "Demo summary",
      latestVersion: null,
      createdAt: 1,
      updatedAt: 1,
      tags: {},
      compatibility: null,
      capabilities: { executesCode: true, capabilityTags: ["tools"] },
      verification: null,
    },
    owner: null,
  },
  version: null,
  readme: null as string | null,
};
let authStatusMock: { isAuthenticated: boolean; isLoading: boolean; me: { _id: string } | null } = {
  isAuthenticated: false,
  isLoading: false,
  me: null,
};
const fetchPackageDetailMock = vi.fn();
const fetchPackageReadmeMock = vi.fn();
const fetchPackageVersionMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    () =>
    (config: {
      loader?: unknown;
      head?: unknown;
      component?: unknown;
    }) => ({
      __config: config,
      useParams: () => paramsMock,
      useLoaderData: () => loaderDataMock,
    }),
}));

vi.mock("../lib/packageApi", () => ({
  fetchPackageDetail: (...args: Parameters<typeof fetchPackageDetailMock>) =>
    fetchPackageDetailMock(...args),
  fetchPackageReadme: (...args: Parameters<typeof fetchPackageReadmeMock>) =>
    fetchPackageReadmeMock(...args),
  fetchPackageVersion: (...args: Parameters<typeof fetchPackageVersionMock>) =>
    fetchPackageVersionMock(...args),
  getPackageDownloadPath: vi.fn((name: string, version?: string | null) =>
    version ? `/api/v1/packages/${name}/download?version=${version}` : `/api/v1/packages/${name}/download`,
  ),
}));

vi.mock("../lib/useAuthStatus", () => ({
  useAuthStatus: () => authStatusMock,
}));

async function loadRoute() {
  return (await import("../routes/plugins/$name")).Route as unknown as {
    __config: {
      component?: ComponentType;
    };
  };
}

describe("plugin detail route", () => {
  beforeEach(() => {
    paramsMock = { name: "demo-plugin" };
    authStatusMock = {
      isAuthenticated: false,
      isLoading: false,
      me: null,
    };
    fetchPackageDetailMock.mockReset();
    fetchPackageReadmeMock.mockReset();
    fetchPackageVersionMock.mockReset();
    loaderDataMock = {
      detail: {
        package: {
          name: "demo-plugin",
          displayName: "Demo Plugin",
          family: "code-plugin",
          channel: "community",
          isOfficial: false,
          summary: "Demo summary",
          latestVersion: null,
          createdAt: 1,
          updatedAt: 1,
          tags: {},
          compatibility: null,
          capabilities: { executesCode: true, capabilityTags: ["tools"] },
          verification: null,
        },
        owner: null,
      },
      version: null,
      readme: null,
    };
  });

  it("hides download actions when the plugin has no latest release", async () => {
    const route = await loadRoute();
    const Component = route.__config.component as ComponentType;

    render(<Component />);

    expect(screen.getByText("No latest tag")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Download zip" })).toBeNull();
  });

  it("shows an access check while auth is still resolving and the loader has no package", async () => {
    authStatusMock = {
      isAuthenticated: false,
      isLoading: true,
      me: null,
    };
    loaderDataMock = {
      detail: { package: null, owner: null },
      version: null,
      readme: null,
    };
    const route = await loadRoute();
    const Component = route.__config.component as ComponentType;

    render(<Component />);

    expect(screen.getByText("Checking plugin access…")).toBeTruthy();
  });

  it("recovers owner-visible plugin detail on the client after auth resolves", async () => {
    authStatusMock = {
      isAuthenticated: true,
      isLoading: false,
      me: { _id: "users:owner" },
    };
    loaderDataMock = {
      detail: { package: null, owner: null },
      version: null,
      readme: null,
    };
    fetchPackageDetailMock.mockResolvedValue({
      package: {
        name: "demo-plugin",
        displayName: "Recovered Plugin",
        family: "code-plugin",
        channel: "community",
        isOfficial: false,
        summary: "Recovered summary",
        latestVersion: "1.2.3",
        createdAt: 1,
        updatedAt: 2,
        tags: {},
        compatibility: null,
        capabilities: { executesCode: true, capabilityTags: ["tools"] },
        verification: null,
      },
      owner: null,
    });
    fetchPackageVersionMock.mockResolvedValue({
      package: {
        name: "demo-plugin",
        displayName: "Recovered Plugin",
        family: "code-plugin",
      },
      version: {
        version: "1.2.3",
        createdAt: 1,
        changelog: "Recovered",
        files: [],
      },
    });
    fetchPackageReadmeMock.mockResolvedValue("# Recovered");
    const route = await loadRoute();
    const Component = route.__config.component as ComponentType;

    render(<Component />);

    await waitFor(() => {
      expect(screen.getByText("Recovered Plugin")).toBeTruthy();
    });
    expect(fetchPackageDetailMock).toHaveBeenCalledWith("demo-plugin");
    expect(fetchPackageVersionMock).toHaveBeenCalledWith("demo-plugin", "1.2.3");
    expect(fetchPackageReadmeMock).toHaveBeenCalledWith("demo-plugin", "1.2.3");
  });
});
