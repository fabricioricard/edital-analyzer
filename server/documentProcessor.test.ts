import { describe, it, expect } from "vitest";
import {
  isSupportedDocumentType,
  getFileExtension,
} from "./documentProcessor";

describe("documentProcessor", () => {
  describe("isSupportedDocumentType", () => {
    it("should support PDF files", () => {
      expect(isSupportedDocumentType("application/pdf")).toBe(true);
    });

    it("should support DOCX files", () => {
      expect(
        isSupportedDocumentType(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe(true);
    });

    it("should support DOC files", () => {
      expect(isSupportedDocumentType("application/msword")).toBe(true);
    });

    it("should reject unsupported file types", () => {
      expect(isSupportedDocumentType("text/plain")).toBe(false);
      expect(isSupportedDocumentType("image/png")).toBe(false);
      expect(isSupportedDocumentType("application/json")).toBe(false);
    });
  });

  describe("getFileExtension", () => {
    it("should return correct extension for PDF", () => {
      expect(getFileExtension("application/pdf")).toBe("pdf");
    });

    it("should return correct extension for DOCX", () => {
      expect(
        getFileExtension(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe("docx");
    });

    it("should return correct extension for DOC", () => {
      expect(getFileExtension("application/msword")).toBe("doc");
    });

    it("should return unknown for unsupported types", () => {
      expect(getFileExtension("text/plain")).toBe("unknown");
    });
  });
});
