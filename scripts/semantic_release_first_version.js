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

const DEFAULT_FIRST_VERSION = '0.1.0';

/** semantic-release hardcodes the first tag as 1.0.0; override it for this package. */
export const verifyRelease = (pluginConfig, context) => {
  const { lastRelease, nextRelease, branch, options, logger } = context;
  if (lastRelease.version || branch.type === 'prerelease') {
    return;
  }

  const version = pluginConfig.version ?? DEFAULT_FIRST_VERSION;
  const tagFormat = options.tagFormat ?? 'v${version}';
  nextRelease.version = version;
  nextRelease.gitTag = tagFormat.replace('${version}', version);
  nextRelease.name = nextRelease.gitTag;
  logger.log('No previous release; next version is %s', version);
};
