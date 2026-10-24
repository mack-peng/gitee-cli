export function resolveDiffPosition(patch: string, newLine: number): number | undefined {
  const lines = patch.split(/\r?\n/);
  let position = 0;
  let currentNewLine: number | undefined;

  for (const line of lines) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      currentNewLine = Number(hunk[1]);
      continue;
    }

    if (currentNewLine === undefined) continue;
    if (line.startsWith('\\')) continue;

    if (line.startsWith('+') || line.startsWith(' ')) {
      position += 1;
      if (currentNewLine === newLine) return position;
      currentNewLine += 1;
    } else if (line.startsWith('-')) {
      position += 1;
    }
  }

  return undefined;
}
