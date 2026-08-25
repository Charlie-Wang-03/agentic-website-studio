import path from 'node:path';

const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
export function assertProjectSlug(project: string): void {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(project) || reserved.test(project) || /[. ]$/.test(project)) {
    throw new Error('Project must be a safe lowercase slug (letters, digits, _ or -)');
  }
}

export function containedPath(root: string, ...parts: string[]): string {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ...parts);
  const relative = path.relative(resolvedRoot, target);
  if (relative === '' || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error('Output path escapes the configured root');
  }
  return target;
}

export function portable(relativePath: string): string { return relativePath.split(path.sep).join('/'); }
