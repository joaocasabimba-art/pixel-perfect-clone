import { describe, it, expect } from "vitest";
import { formatDateBR, formatCurrency, formatPhone, recurrenceUrgency } from "@/lib/business";

describe("formatDateBR", () => {
  it("deve exibir a data correta (sem shift de timezone UTC→local)", () => {
    // Datas ISO como vêm do Supabase (DATE = string YYYY-MM-DD)
    expect(formatDateBR("2026-03-10")).toBe("10/03/2026");
    expect(formatDateBR("2026-01-01")).toBe("01/01/2026");
    expect(formatDateBR("2025-12-31")).toBe("31/12/2025");
  });

  it("deve aceitar um objeto Date diretamente", () => {
    // Meio-dia local para evitar qualquer problema de tz nos próprios testes
    const d = new Date(2026, 2, 10, 12, 0, 0); // 10/03/2026 meio-dia local
    expect(formatDateBR(d)).toBe("10/03/2026");
  });

  it("deve formatar timestamps ISO completos sem alterar o comportamento anterior", () => {
    // Timestamp completo deve ser tratado como antes (não é string de 10 chars)
    const ts = "2026-03-10T12:00:00.000Z";
    const result = formatDateBR(ts);
    // Aceita qualquer resultado válido (12:00 UTC pode ser 09:00 ou 12:00 local)
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("formatCurrency", () => {
  it("deve formatar valores monetários no padrão BR", () => {
    expect(formatCurrency(1500)).toBe("R$ 1500,00");
    expect(formatCurrency(0)).toBe("R$ 0,00");
    expect(formatCurrency(99.9)).toBe("R$ 99,90");
  });
});

describe("formatPhone", () => {
  it("deve formatar celular de 11 dígitos", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("deve formatar telefone fixo de 10 dígitos", () => {
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
  });
});

describe("recurrenceUrgency", () => {
  it("deve retornar 'destructive' para datas vencidas", () => {
    const past = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
    expect(recurrenceUrgency(past).color).toBe("destructive");
  });

  it("deve retornar 'warning' para prazo de até 7 dias", () => {
    const soon = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
    expect(recurrenceUrgency(soon).color).toBe("warning");
  });

  it("deve retornar 'default' para prazo distante", () => {
    const far = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];
    expect(recurrenceUrgency(far).color).toBe("default");
  });
});
