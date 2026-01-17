/**
 * OpenAI Service Exports
 */
export {
  transcribeWithNoiseFiltering,
  structureWorkData,
  processVoiceToStructuredData,
} from './client';

export { WHISPER_NOISE_FILTERING_PROMPT, EXTRACTION_SYSTEM_PROMPT } from './prompts';
