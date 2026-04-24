/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// Mock for isomorphic-dompurify
const mockSanitize = (dirty: string) => dirty;

export default {
  sanitize: mockSanitize,
};
