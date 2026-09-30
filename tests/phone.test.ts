import { describe, expect, it } from "vitest";
import { formatArPhone, normalizeArPhone, whatsappUrl } from "@/lib/phone";

describe("normalizeArPhone", () => {
  it.each([
    ["+54 9 11 2345-6789", "+5491123456789"],
    ["+5491123456789", "+5491123456789"],
    ["54 9 11 2345 6789", "+5491123456789"],
    ["+54 11 2345-6789", "+5491123456789"],
    ["0054 9 11 2345 6789", "+5491123456789"],
    ["011 2345-6789", "+5491123456789"],
    ["11 2345-6789", "+5491123456789"],
    ["1123456789", "+5491123456789"],
    ["11 15 2345-6789", "+5491123456789"],
    ["011 15 2345-6789", "+5491123456789"],
    ["0351 15 123-4567", "+5493511234567"],
    ["(0351) 123-4567", "+5493511234567"],
    ["+54 9 351 123 4567", "+5493511234567"],
    ["2966 15 12-3456", "+5492966123456"],
  ])("acepta %s", (input, expected) => {
    expect(normalizeArPhone(input)).toBe(expected);
  });

  it.each([
    "",
    "abc",
    "12345",
    "+1 415 555 0100",
    "11 2345 678",
    "11 2345 67890",
    "5123456789",
    "+54 9 11 2345-6789 int 2",
  ])("rechaza %s", (input) => {
    expect(normalizeArPhone(input)).toBeNull();
  });
});

describe("formatArPhone / whatsappUrl", () => {
  it("formatea para mostrar", () => {
    expect(formatArPhone("+5491123456789")).toBe("+54 9 11 2345-6789");
    expect(formatArPhone("+5493511234567")).toBe("+54 9 351 123-4567");
  });

  it("arma el link de WhatsApp", () => {
    expect(whatsappUrl("+5491123456789")).toBe("https://wa.me/5491123456789");
  });
});
