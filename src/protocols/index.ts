import type { ProtocolBody } from '../types';
import { ProtocolAdapter } from './types';
import { createOpenAIProtocol } from './openai';
import { createAnthropicProtocol } from './anthropic';
import { createGoogleProtocol } from './google';

const protocols: Record<string, () => ProtocolAdapter> = {
  openai: createOpenAIProtocol,
  anthropic: createAnthropicProtocol,
  google: createGoogleProtocol,
};

interface IdentityTransforms {
  toStandardRequest(body: ProtocolBody): ProtocolBody;
  fromStandardRequest(body: ProtocolBody): ProtocolBody;
  toStandardResponse(body: ProtocolBody, model: string): ProtocolBody;
  fromStandardResponse(body: ProtocolBody): ProtocolBody;
  createToStandardStream(model: string): TransformStream;
  createFromStandardStream(): TransformStream;
}

const identityTransforms: IdentityTransforms = {
  toStandardRequest: (body) => body,
  fromStandardRequest: (body) => body,
  toStandardResponse: (body) => body,
  fromStandardResponse: (body) => body,
  createToStandardStream: () =>
    new TransformStream({
      transform(c, ctl) {
        ctl.enqueue(c);
      },
    }),
  createFromStandardStream: () =>
    new TransformStream({
      transform(c, ctl) {
        ctl.enqueue(c);
      },
    }),
};

function getProtocol(type: string): ProtocolAdapter & IdentityTransforms {
  const creator = protocols[type];
  if (!creator) {
    throw new Error(`Unknown protocol type: ${type}`);
  }
  const protocol = creator();
  return { ...identityTransforms, ...protocol } as ProtocolAdapter & IdentityTransforms;
}

export const ProtocolFactory = {
  get: getProtocol,
};

export * from './types';
export { createOpenAIProtocol } from './openai';
export { createAnthropicProtocol } from './anthropic';
export { createGoogleProtocol } from './google';
