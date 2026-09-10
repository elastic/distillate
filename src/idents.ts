/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Throws if `segment` is not a valid CSS identifier segment.
 *
 * @param segment Value to validate.
 * @param role Human-readable label for the error message (e.g. `'Distillery prefix'`).
 * @throws If `segment` contains characters outside `[A-Za-z_][A-Za-z0-9_-]*`.
 */
export const assertCssIdentSegment = (segment: string, role: string): void => {
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(segment)) {
    throw new Error(
      `${role} "${segment}" is not a CSS identifier segment. Use a letter or underscore, then letters, digits, hyphens, or underscores.`
    );
  }
};
