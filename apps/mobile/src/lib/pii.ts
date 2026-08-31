const patterns = [
  /\b\d{6}[- ]?[1-4]\d{6}\b/g,
  /\b\d{2,3}[- ]?\d{3,4}[- ]?\d{4}\b/g,
  /\b[A-Z]\d{8,12}\b/gi,
  /\b\d{2,3}[- ]?\d{2,4}[- ]?\d{4,6}\b/g,
];

export function containsSensitiveInfo(value: string) {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}
