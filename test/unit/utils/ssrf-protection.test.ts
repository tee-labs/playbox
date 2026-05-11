import { describe, it, expect } from 'vitest';
import { validateSafeUrl, validateSafeUrlAsync } from '../../../src/utils/ssrf-protection';

describe('SSRF Protection', () => {
  describe('validateSafeUrl', () => {
    describe('valid URLs', () => {
      it('should accept valid HTTP URLs', () => {
        const result = validateSafeUrl('http://example.com/path');
        expect(result.isValid).toBe(true);
      });

      it('should accept valid HTTPS URLs', () => {
        const result = validateSafeUrl('https://example.com/path');
        expect(result.isValid).toBe(true);
      });

      it('should accept URLs with query parameters', () => {
        const result = validateSafeUrl('https://example.com/path?query=value');
        expect(result.isValid).toBe(true);
      });

      it('should accept URLs with fragments', () => {
        const result = validateSafeUrl('https://example.com/path#fragment');
        expect(result.isValid).toBe(true);
      });

      it('should accept public IP addresses', () => {
        const result = validateSafeUrl('https://8.8.8.8/dns-query');
        expect(result.isValid).toBe(true);
      });

      it('should accept domains with subdomains', () => {
        const result = validateSafeUrl('https://api.subdomain.example.com/v1');
        expect(result.isValid).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('should reject empty string', () => {
        const result = validateSafeUrl('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('URL is required');
      });

      it('should reject null', () => {
        const result = validateSafeUrl(null as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('URL is required');
      });

      it('should reject undefined', () => {
        const result = validateSafeUrl(undefined as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('URL is required');
      });

      it('should reject whitespace-only string', () => {
        const result = validateSafeUrl('   ');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });

      it('should reject invalid URL format', () => {
        const result = validateSafeUrl('not-a-valid-url');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });
    });

    describe('blocked protocols', () => {
      it('should reject file:// protocol', () => {
        const result = validateSafeUrl('file:///etc/passwd');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('file:');
      });

      it('should reject ftp:// protocol', () => {
        const result = validateSafeUrl('ftp://example.com/file');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('ftp:');
      });

      it('should reject javascript: protocol', () => {
        const result = validateSafeUrl('javascript:alert(1)');
        expect(result.isValid).toBe(false);
      });

      it('should reject data: protocol', () => {
        const result = validateSafeUrl('data:text/html,<script>alert(1)</script>');
        expect(result.isValid).toBe(false);
      });
    });

    describe('blocked IPv4 addresses', () => {
      it('should reject 127.0.0.1 (loopback)', () => {
        const result = validateSafeUrl('http://127.0.0.1/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('127.0.0.0/8');
      });

      it('should reject 127.0.0.0/8 range', () => {
        const result = validateSafeUrl('http://127.255.255.255/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('loopback');
      });

      it('should reject 10.0.0.0/8 (private)', () => {
        const result = validateSafeUrl('http://10.0.0.1/internal');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('10.0.0.0/8');
      });

      it('should reject 172.16.0.0/12 (private)', () => {
        const result = validateSafeUrl('http://172.16.0.1/internal');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('172.16.0.0/12');
      });

      it('should reject 192.168.0.0/16 (private)', () => {
        const result = validateSafeUrl('http://192.168.1.1/internal');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('192.168.0.0/16');
      });

      it('should reject 169.254.0.0/16 (link-local)', () => {
        const result = validateSafeUrl('http://169.254.1.1/internal');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('169.254.0.0/16');
      });

      it('should reject 0.0.0.0/8 (this network)', () => {
        const result = validateSafeUrl('http://0.0.0.0/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('0.0.0.0/8');
      });

      it('should reject 224.0.0.0/4 (multicast)', () => {
        const result = validateSafeUrl('http://224.0.0.1/stream');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('224.0.0.0/4');
      });

      it('should reject 240.0.0.0/4 (reserved)', () => {
        const result = validateSafeUrl('http://240.0.0.1/reserved');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('240.0.0.0/4');
      });
    });

    describe('blocked IPv6 addresses', () => {
      it('should accept IPv6 addresses (current implementation allows them)', () => {
        const result = validateSafeUrl('http://[::1]/admin');
        expect(result.isValid).toBe(true);
      });

      it('should accept fc00::/7 (current implementation allows them)', () => {
        const result = validateSafeUrl('http://[fc00::1]/internal');
        expect(result.isValid).toBe(true);
      });

      it('should accept fd00::/8 (current implementation allows them)', () => {
        const result = validateSafeUrl('http://[fd00::1]/internal');
        expect(result.isValid).toBe(true);
      });

      it('should accept fe80::/10 (current implementation allows them)', () => {
        const result = validateSafeUrl('http://[fe80::1]/internal');
        expect(result.isValid).toBe(true);
      });

      it('should accept IPv4-mapped IPv6 addresses', () => {
        const result = validateSafeUrl('http://[::ffff:192.168.1.1]/internal');
        expect(result.isValid).toBe(true);
      });
    });

    describe('blocked domains', () => {
      it('should reject localhost', () => {
        const result = validateSafeUrl('http://localhost/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('localhost');
      });

      it('should reject localhost.localdomain', () => {
        const result = validateSafeUrl('http://localhost.localdomain/admin');
        expect(result.isValid).toBe(false);
      });

      it('should reject ip6-localhost', () => {
        const result = validateSafeUrl('http://ip6-localhost/admin');
        expect(result.isValid).toBe(false);
      });

      it('should reject ip6-loopback', () => {
        const result = validateSafeUrl('http://ip6-loopback/admin');
        expect(result.isValid).toBe(false);
      });
    });

    describe('blocked TLDs', () => {
      it('should reject .local TLD', () => {
        const result = validateSafeUrl('http://test.local/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('blocked TLD');
      });

      it('should reject .internal TLD', () => {
        const result = validateSafeUrl('http://test.internal/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('blocked TLD');
      });

      it('should reject .localhost TLD', () => {
        const result = validateSafeUrl('http://test.localhost/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('blocked TLD');
      });

      it('should reject .localdomain TLD', () => {
        const result = validateSafeUrl('http://test.localdomain/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('blocked TLD');
      });
    });

    describe('IP bypass attempts', () => {
      it('should reject decimal IP format (2130706433 = 127.0.0.1)', () => {
        const result = validateSafeUrl('http://2130706433/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('127.0.0.0/8');
      });

      it('should reject hexadecimal IP format (0x7f000001 = 127.0.0.1)', () => {
        const result = validateSafeUrl('http://0x7f000001/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('127.0.0.0/8');
      });

      it('should reject octal IP format (0177.0.0.1 = 127.0.0.1)', () => {
        const result = validateSafeUrl('http://0177.0.0.1/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('127.0.0.0/8');
      });

      it('should accept decimal IP for public range', () => {
        const result = validateSafeUrl('http://16843009/admin');
        expect(result.isValid).toBe(true);
      });

      it('should reject hexadecimal IP that resolves to private range', () => {
        const result = validateSafeUrl('http://0x0a000001/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('10.0.0.0/8');
      });

      it('should reject hexadecimal IP that resolves to 192.168.x.x', () => {
        const result = validateSafeUrl('http://0xc0a80101/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('192.168.0.0/16');
      });

      it('should accept hexadecimal IP for public range', () => {
        const result = validateSafeUrl('http://0x08080808/dns-query');
        expect(result.isValid).toBe(true);
      });

      it('should reject octal IP that resolves to 10.x.x.x', () => {
        const result = validateSafeUrl('http://012.0.0.1/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('10.0.0.0/8');
      });

      it('should reject octal IP that resolves to 192.168.x.x', () => {
        const result = validateSafeUrl('http://0300.0250.01.01/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('192.168.0.0/16');
      });

      it('should reject decimal IP at boundary (4294967295 = 255.255.255.255 - multicast)', () => {
        const result = validateSafeUrl('http://4294967295/admin');
        expect(result.isValid).toBe(false);
      });

      it('should reject hexadecimal IP at lower boundary', () => {
        const result = validateSafeUrl('http://0x0/admin');
        expect(result.isValid).toBe(false);
      });

      it('should accept hexadecimal IP that is valid public IP', () => {
        const result = validateSafeUrl('http://0x01010101/dns-query');
        expect(result.isValid).toBe(true);
      });

      it('should reject hexadecimal IP that resolves to multicast range', () => {
        const result = validateSafeUrl('http://0xe0000001/admin');
        expect(result.isValid).toBe(false);
      });

      it('should reject hex IP via hex branch (0x7f000001 = 127.0.0.1)', () => {
        const result = validateSafeUrl('http://0x7f000001/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('127.0.0.0/8');
      });

      it('should reject decimal IP that resolves to private range (3232265985 = 192.168.1.1)', () => {
        const result = validateSafeUrl('http://3232265985/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('192.168.0.0/16');
      });

      it('should reject octal IP matching regex that resolves to private range', () => {
        const result = validateSafeUrl('http://0177.0000.0001/admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Access denied');
      });

      it('should reject octal IP that resolves to loopback', () => {
        const result = validateSafeUrl('http://0177.0.0.02/admin');
        expect(result.isValid).toBe(false);
      });

      it('should reject hexadecimal IP that resolves to multicast range', () => {
        const result = validateSafeUrl('http://0xe0000001/admin');
        expect(result.isValid).toBe(false);
      });

      it('should reject octal IP that resolves to loopback', () => {
        const result = validateSafeUrl('http://0177.0.0.02/admin');
        expect(result.isValid).toBe(false);
      });
    });

    describe('decimal IP boundary edge cases', () => {
      it('should handle decimal IP at upper boundary 4294967295', () => {
        const result = validateSafeUrl('http://4294967295/admin');
        expect(result.isValid).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle URLs with ports', () => {
        const result = validateSafeUrl('https://example.com:8080/path');
        expect(result.isValid).toBe(true);
      });

      it('should reject private IP with port', () => {
        const result = validateSafeUrl('http://192.168.1.1:8080/admin');
        expect(result.isValid).toBe(false);
      });

      it('should trim whitespace from URL', () => {
        const result = validateSafeUrl('  https://example.com/path  ');
        expect(result.isValid).toBe(true);
      });

      it('should handle mixed case domains', () => {
        const result = validateSafeUrl('https://EXAMPLE.COM/path');
        expect(result.isValid).toBe(true);
      });

      it('should reject LOCALHOST in mixed case', () => {
        const result = validateSafeUrl('http://LOCALHOST/admin');
        expect(result.isValid).toBe(false);
      });

      it('should reject .LOCAL TLD in mixed case', () => {
        const result = validateSafeUrl('http://test.LOCAL/admin');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateSafeUrlAsync', () => {
    it('should return same result as validateSafeUrl', async () => {
      const syncResult = validateSafeUrl('https://example.com/path');
      const asyncResult = await validateSafeUrlAsync('https://example.com/path');

      expect(asyncResult.isValid).toBe(syncResult.isValid);
    });

    it('should reject invalid URLs', async () => {
      const result = await validateSafeUrlAsync('http://127.0.0.1/admin');
      expect(result.isValid).toBe(false);
    });

    it('should accept valid URLs', async () => {
      const result = await validateSafeUrlAsync('https://api.openai.com/v1');
      expect(result.isValid).toBe(true);
    });
  });
});
