export type CliCommandStats = {
  command: string;
  sessionId: string;
  participantId: string;
  inputLineCount?: number;
  observationCount?: number;
  findingCount?: number;
  redactionCount?: number;
  decisionRecommendation?: string;
  outputPath?: string;
  severityCounts?: Record<string, number>;
};

export type CliCommandResult = {
  exitCode: number;
  stdout: string;
  stderr?: string;
  stats?: CliCommandStats;
};
