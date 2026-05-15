import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders the redesign brand mark and primary protected navigation", () => {
    const html = renderToStaticMarkup(AppShell({ children: "content" }));

    expect(html).toContain('aria-label="stock_selection home"');
    expect(html).toContain("stock_selection logo mark");
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("Dashboard");
    expect(html).toContain("Settings");
    expect(html).toContain("Health");
  });
});
