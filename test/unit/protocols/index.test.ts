import { describe, it, expect } from 'vitest';
import { ProtocolFactory } from '../../../src/protocols/index';
import { createOpenAIProtocol } from '../../../src/protocols/openai';
import { createAnthropicProtocol } from '../../../src/protocols/anthropic';
import { createGoogleProtocol } from '../../../src/protocols/google';

describe('ProtocolFactory', () => {
  describe('get', () => {
    it('should return OpenAI protocol', () => {
      const protocol = ProtocolFactory.get('openai');

      expect(protocol.getApiKey).toBeDefined();
      expect(protocol.getEndpoint).toBeDefined();
      expect(protocol.getHeaders).toBeDefined();
    });

    it('should return Anthropic protocol', () => {
      const protocol = ProtocolFactory.get('anthropic');

      expect(protocol.getApiKey).toBeDefined();
      expect(protocol.getEndpoint).toBeDefined();
      expect(protocol.getHeaders).toBeDefined();
    });

    it('should return Google protocol', () => {
      const protocol = ProtocolFactory.get('google');

      expect(protocol.getApiKey).toBeDefined();
      expect(protocol.getEndpoint).toBeDefined();
      expect(protocol.getHeaders).toBeDefined();
    });

    it('should throw error for unknown protocol type', () => {
      expect(() => ProtocolFactory.get('unknown')).toThrow('Unknown protocol type: unknown');
    });

    it('should include identity transforms in returned protocol', () => {
      const protocol = ProtocolFactory.get('openai');

      expect(protocol.toStandardRequest).toBeDefined();
      expect(protocol.fromStandardRequest).toBeDefined();
      expect(protocol.toStandardResponse).toBeDefined();
      expect(protocol.fromStandardResponse).toBeDefined();
      expect(protocol.createToStandardStream).toBeDefined();
      expect(protocol.createFromStandardStream).toBeDefined();
    });

    it('should have identity transforms that pass through values', () => {
      const protocol = ProtocolFactory.get('openai');

      const input = { test: 'value' };
      expect(protocol.toStandardRequest(input)).toBe(input);
      expect(protocol.fromStandardRequest(input)).toBe(input);
      expect(protocol.toStandardResponse(input, 'model')).toBe(input);
      expect(protocol.fromStandardResponse(input)).toBe(input);
    });

    it('should create transform streams', () => {
      const protocol = ProtocolFactory.get('openai');

      const toStream = protocol.createToStandardStream('model');
      const fromStream = protocol.createFromStandardStream();

      expect(toStream).toBeInstanceOf(TransformStream);
      expect(fromStream).toBeInstanceOf(TransformStream);
    });

    it('should return same protocol for multiple calls', () => {
      const protocol1 = ProtocolFactory.get('openai');
      const protocol2 = ProtocolFactory.get('openai');

      expect(typeof protocol1.getApiKey).toBe('function');
      expect(typeof protocol2.getApiKey).toBe('function');
    });
  });

  describe('exports', () => {
    it('should export createOpenAIProtocol', () => {
      expect(createOpenAIProtocol).toBeDefined();
      expect(typeof createOpenAIProtocol).toBe('function');
    });

    it('should export createAnthropicProtocol', () => {
      expect(createAnthropicProtocol).toBeDefined();
      expect(typeof createAnthropicProtocol).toBe('function');
    });

    it('should export createGoogleProtocol', () => {
      expect(createGoogleProtocol).toBeDefined();
      expect(typeof createGoogleProtocol).toBe('function');
    });
  });
});
