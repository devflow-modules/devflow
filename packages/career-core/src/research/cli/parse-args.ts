export type ParsedCliArgs = {
  command?: string;
  positional: string[];
  flags: Map<string, string | boolean>;
};

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | boolean>();
  let command: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        flags.set(key, true);
      } else {
        flags.set(key, next);
        i += 1;
      }
      continue;
    }

    if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

export function flagString(args: ParsedCliArgs, key: string): string | undefined {
  const value = args.flags.get(key);
  return typeof value === "string" ? value : undefined;
}

export function flagBoolean(args: ParsedCliArgs, key: string): boolean {
  return args.flags.get(key) === true;
}

export function requireFlag(args: ParsedCliArgs, key: string): string {
  const value = flagString(args, key);
  if (!value) throw new Error(`Missing required flag --${key}`);
  return value;
}
