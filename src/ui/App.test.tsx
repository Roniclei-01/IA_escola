import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import "../i18n";

describe("App", () => {
  it("renders the product name", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Estudo IA Local" })).toBeInTheDocument();
  });
});
