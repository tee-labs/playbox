import { describe, it, expect } from 'vitest';
import { addGlmThinkingParam } from '../../../src/utils/glm';
import type { ProtocolBody } from '../../../src/types';

describe('addGlmThinkingParam', () => {
  const baseRequest: ProtocolBody = {
    model: 'test-model',
    messages: [{ role: 'user', content: 'Hello' }],
  };

  describe('GLM models', () => {
    it('should add thinking parameter for glm-4 model', () => {
      const request: ProtocolBody = { ...baseRequest, model: 'glm-4-0520' };
      const result = addGlmThinkingParam(request);

      expect(result.extra_body).toBeDefined();
      expect((result.extra_body as any).thinking).toEqual({
        type: 'enabled',
        clear_thinking: false,
      });
    });

    it('should add thinking parameter for glm-3 model', () => {
      const request: ProtocolBody = { ...baseRequest, model: 'glm-3-flash' };
      const result = addGlmThinkingParam(request);

      expect((result.extra_body as any).thinking).toEqual({
        type: 'enabled',
        clear_thinking: false,
      });
    });

    it('should add thinking parameter for GLM model with mixed case', () => {
      const request: ProtocolBody = { ...baseRequest, model: 'GLM-4-Flash' };
      const result = addGlmThinkingParam(request);

      expect((result.extra_body as any).thinking).toEqual({
        type: 'enabled',
        clear_thinking: false,
      });
    });

    it('should add thinking parameter for models containing glm substring', () => {
      const request: ProtocolBody = { ...baseRequest, model: 'chatglm-4' };
      const result = addGlmThinkingParam(request);

      expect((result.extra_body as any).thinking).toEqual({
        type: 'enabled',
        clear_thinking: false,
      });
    });
  });

  describe('Non-GLM models', () => {
    it('should NOT add thinking parameter for gpt-4 model', () => {
      const request: ProtocolBody = { ...baseRequest, model: 'gpt-4' };
      const result = addGlmThinkingParam(request);

      expect(result.extra_body).toBeUndefined();
    });

    it('should NOT add thinking parameter for claude model', () => {
      const request: ProtocolBody = { ...baseRequest, model: 'claude-3-opus' };
      const result = addGlmThinkingParam(request);

      expect(result.extra_body).toBeUndefined();
    });

    it('should NOT add thinking parameter for gemini model', () => {
      const request: ProtocolBody = { ...baseRequest, model: 'gemini-pro' };
      const result = addGlmThinkingParam(request);

      expect(result.extra_body).toBeUndefined();
    });

    it('should NOT add thinking parameter for empty model', () => {
      const request: ProtocolBody = { ...baseRequest, model: '' };
      const result = addGlmThinkingParam(request);

      expect(result.extra_body).toBeUndefined();
    });

    it('should NOT add thinking parameter for undefined model', () => {
      const request: ProtocolBody = { ...baseRequest, model: undefined };
      const result = addGlmThinkingParam(request);

      expect(result.extra_body).toBeUndefined();
    });
  });

  describe('Extra body merging', () => {
    it('should preserve existing extra_body parameters for GLM models', () => {
      const request: ProtocolBody = {
        ...baseRequest,
        model: 'glm-4',
        extra_body: {
          custom_param: 'test_value',
          temperature: 0.9,
        },
      };
      const result = addGlmThinkingParam(request);

      expect((result.extra_body as any).custom_param).toBe('test_value');
      expect((result.extra_body as any).temperature).toBe(0.9);
      expect((result.extra_body as any).thinking).toEqual({
        type: 'enabled',
        clear_thinking: false,
      });
    });

    it('should NOT modify extra_body for non-GLM models', () => {
      const request: ProtocolBody = {
        ...baseRequest,
        model: 'gpt-4',
        extra_body: {
          custom_param: 'test_value',
        },
      };
      const result = addGlmThinkingParam(request);

      expect((result.extra_body as any).custom_param).toBe('test_value');
      expect((result.extra_body as any).thinking).toBeUndefined();
    });
  });

  describe('Preserved thinking behavior', () => {
    it('should set clear_thinking to false for preserved thinking', () => {
      const request: ProtocolBody = { ...baseRequest, model: 'glm-4' };
      const result = addGlmThinkingParam(request);

      expect((result.extra_body as any).thinking.clear_thinking).toBe(false);
    });
  });
});
