import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const protectedNavigationFiles = [
  "src/components/app-shell.tsx",
  "src/app/(protected)/page.tsx",
  "src/app/(protected)/dashboard/page.tsx"
];

describe("protected navigation", () => {
  it("uses document navigation instead of Next client navigation", () => {
    for (const file of protectedNavigationFiles) {
      const source = readFileSync(join(process.cwd(), file), "utf8");

      expect(source).not.toContain("next/link");
    }
  });
});
