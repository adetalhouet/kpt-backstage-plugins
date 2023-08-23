/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 import { DEFAULT_NAMESPACE, stringifyEntityRef } from '@backstage/catalog-model';
import {
  createRouter,
  providers
} from '@backstage/plugin-auth-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    discovery: env.discovery,
    tokenManager: env.tokenManager,
    providerFactories: {
      oauth2Proxy: providers.oauth2Proxy.create({
        signIn: {
          async resolver({ result }, ctx) {
            const name = result.getHeader('x-forwarded-preferred-username');
            if (!name) {
              throw new Error('Request did not contain a user');
            }

            try {
              // Attempts to sign in existing user
              const signedInUser = await ctx.signInWithCatalogUser({
                entityRef: { name },
              });

              return Promise.resolve(signedInUser);
            } catch (e) {
              // Create stub user
              const userEntityRef = stringifyEntityRef({
                kind: 'User',
                name: name,
                namespace: DEFAULT_NAMESPACE,
              });
              return ctx.issueToken({
                claims: {
                  sub: userEntityRef,
                  ent: [userEntityRef],
                },
              });
            }
          },
        },
      }),
    },
  });
}
