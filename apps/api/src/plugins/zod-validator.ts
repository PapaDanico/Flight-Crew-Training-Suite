import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

/**
 * Wires Zod as the schema language for both request validation and
 * response serialization. After this plugin registers, routes can use
 * `schema: { body: ZodSchema, response: { 200: ZodSchema } }` and the
 * types flow through to the handler via `.withTypeProvider<ZodTypeProvider>()`.
 */
export const zodValidatorPlugin: FastifyPluginAsync = async (app) => {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
};

export default fp(zodValidatorPlugin, { name: 'zod-validator' });
export type { ZodTypeProvider };
