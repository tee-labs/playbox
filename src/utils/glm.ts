import type { ProtocolBody } from '../types';

/**
 * Adds preserved thinking parameter for GLM models.
 * GLM models support reserved thinking (保留式思考) via extra_body.thinking.
 * @see https://www.zhipuai.cn/docs/thinking
 */
export function addGlmThinkingParam(request: ProtocolBody): ProtocolBody {
  const model = (request.model as string | undefined)?.toLowerCase() ?? '';

  if (!model.includes('glm')) {
    return request;
  }

  const thinkingConfig = {
    thinking: {
      type: 'enabled',
      clear_thinking: false,
    },
  };

  return {
    ...request,
    extra_body: {
      ...(request.extra_body as Record<string, unknown> | undefined),
      ...thinkingConfig,
    },
  };
}
