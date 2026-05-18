import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import "../i18n";

describe("App", () => {
  it("renders the product name", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Estudo IA Local" })).toBeInTheDocument();
  });

  it("imports a text book from a file path", async () => {
    const importTextBook = vi.fn().mockResolvedValue({
      document_id: "document-1",
      book_id: "book-1",
      content: "Conteudo importado para estudo.",
      language: "Pt"
    });

    render(<App importTextBook={importTextBook} />);

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/book.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(importTextBook).toHaveBeenCalledWith("/tmp/book.txt");
    });
    expect(await screen.findByText("Documento importado")).toBeInTheDocument();
    expect(screen.getByText("Conteudo importado para estudo.")).toBeInTheDocument();
  });

  it("shows an error when import fails", async () => {
    const importTextBook = vi.fn().mockRejectedValue(new Error("Arquivo de texto nao encontrado."));

    render(<App importTextBook={importTextBook} />);

    fireEvent.change(screen.getByLabelText("Caminho do arquivo .txt"), {
      target: { value: "/tmp/missing.txt" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Arquivo de texto nao encontrado.");
  });
});
