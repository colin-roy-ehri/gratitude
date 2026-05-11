import { VertexAI } from '@google-cloud/vertexai';
import { config, requireProjectId } from '../config.js';
import { CommunityActivityReport, MatchCandidate } from '../types.js';

export class GemmaService {
  private model: ReturnType<VertexAI['getGenerativeModel']> | null = null;

  private getModel() {
    if (!this.model) {
      const vertexAI = new VertexAI({
        project: requireProjectId(),
        location: config.vertexAiLocation,
        apiEndpoint: config.vertexAiApiEndpoint,
      });
      this.model = vertexAI.getGenerativeModel({ model: config.vertexAiModel });
    }
    return this.model;
  }

  async summarizeMatches(matches: MatchCandidate[]): Promise<string> {
    if (matches.length === 0) {
      return 'No high-confidence opportunities were found during this connect cycle.';
    }

    const prompt = [
      'You are a matching analyst for mutual aid.',
      'Summarize the following opportunities in 3 short bullet points and keep it practical.',
      'Data:',
      JSON.stringify(matches.slice(0, 10)),
    ].join('\n');

    try {
      const result = await this.getModel().generateContent(prompt);
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      return text?.trim() || 'Gemma returned an empty summary.';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Gemma unavailable (${msg}). Deterministic matching still completed.`;
    }
  }

  async generateCommunityReport(report: CommunityActivityReport): Promise<string> {
    const prompt = [
      'You are a community manager for a mutual aid network.',
      'Here is a report of recent community activity:',
      `- New connections established: ${report.connectionCount}`,
      `- Top active categories: ${JSON.stringify(report.topActiveUnspscs)}`,
      '',
      'Your task is to write a helpful and heart-lifting message (2-3 sentences) for the community.',
      '- If `connectionCount` > 0, celebrate the connections and mention the types of items/services that are popular (based on `topActiveUnspscs`).',
      '- If `connectionCount` === 0, highlight the active needs and offers from `topActiveUnspscs` as opportunities for members to connect.',
      'Your goal is to foster a sense of a living, breathing community with potential for connection.',
    ].join('\n');

    try {
      const result = await this.getModel().generateContent(prompt);
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      return text?.trim() || 'Gemma returned an empty summary.';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Gemma unavailable (${msg}).`;
    }
  }
}

