/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createEmotion } from '../../src/emotion';

import { createExampleDistillery } from './fixture';

export interface EmotionExample {
  readonly className: string;
  readonly stylesheet: string;
}

/** Emotion-shaped authoring over the same distillery. */
export const run = (): EmotionExample => {
  const distillery = createExampleDistillery();
  const emotion = createEmotion(distillery);
  const { colors, gap } = distillery.tokens;
  const { ink, accent } = colors;
  const card = emotion.css`
    color: ${ink};
    &:hover {
      color: ${accent};
    }
    @media (min-width: 600px) {
      padding: ${gap};
    }
  `;
  return { className: String(card), stylesheet: emotion.stylesheet() };
};
