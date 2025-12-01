import { describe, it, expect } from "vitest";
import { assertSafeUrl, SSRFBlockedError } from "@/lib/ssrf-guard";
describe("SSRF guard", () => {
  describe("scheme enforcement", () => {
    it("rejects file:// URLs", async () => {
      await expect(assertSafeUrl("file:///etc/passwd")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
    it("rejects ftp:// URLs", async () => {
      await expect(assertSafeUrl("ftp://example.com/file.txt")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
    it("rejects javascript: URLs", async () => {
      await expect(assertSafeUrl("javascript:alert(1)")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
    it("rejects data: URLs", async () => {
      await expect(assertSafeUrl("data:text/plain,hello")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
    it("rejects invalid URLs", async () => {
      await expect(assertSafeUrl("not-a-url")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
  });
  describe("hostname blocks", () => {
    it("rejects localhost by name", async () => {
      await expect(assertSafeUrl("http://localhost/test")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
    it("rejects metadata.google.internal by name", async () => {
      await expect(
        assertSafeUrl("http://metadata.google.internal/computeMetadata/v1/")
      ).rejects.toBeInstanceOf(SSRFBlockedError);
    });
    it("rejects metadata by name", async () => {
      await expect(assertSafeUrl("http://metadata/latest")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
  });
  describe("IPv4 blocked ranges", () => {
    it.each([
      ["127.0.0.1", "loopback"],
      ["127.255.255.255", "loopback"],
      ["10.0.0.1", "RFC1918 10/8"],
      ["10.255.255.255", "RFC1918 10/8"],
      ["172.16.0.1", "RFC1918 172.16/12"],
      ["172.31.255.255", "RFC1918 172.16/12"],
      ["192.168.1.1", "RFC1918 192.168/16"],
      ["169.254.169.254", "AWS metadata!"],
      ["100.64.0.1", "CGNAT 100.64/10"],
      ["0.0.0.0", "this network"],
      ["224.0.0.1", "multicast"],
      ["198.18.0.1", "benchmarking"],
    ])("blocks %s (%s)", async (ip) => {
      await expect(assertSafeUrl(`http://${ip}/test`)).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
  });
  describe("IPv6 blocked ranges", () => {
    it("blocks IPv6 loopback ::1", async () => {
      await expect(assertSafeUrl("http://[::1]/test")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
    it("blocks IPv6 link-local fe80::", async () => {
      await expect(assertSafeUrl("http://[fe80::1]/test")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
    it("blocks IPv6 unique-local fc00::/7", async () => {
      await expect(assertSafeUrl("http://[fc00::1]/test")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
      await expect(assertSafeUrl("http://[fd00::1]/test")).rejects.toBeInstanceOf(
        SSRFBlockedError
      );
    });
    it("blocks IPv4-mapped IPv6 in private range", async () => {
      await expect(
        assertSafeUrl("http://[::ffff:127.0.0.1]/test")
      ).rejects.toBeInstanceOf(SSRFBlockedError);
      await expect(
        assertSafeUrl("http://[::ffff:10.0.0.1]/test")
      ).rejects.toBeInstanceOf(SSRFBlockedError);
    });
  });
});
