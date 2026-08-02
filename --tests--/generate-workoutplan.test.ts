import { req, read } from './test-utils';

jest.mock('@/lib/ai/gemini', () => ({
  generateGeminiJson: jest.fn(),
}));
import { generateGeminiJson } from '@/lib/ai/gemini';
const mockedGenerateGeminiJson = jest.mocked(generateGeminiJson);

const payload = {
  workoutType: 'gym',
  fitnessGoal: 'muscle-gain',
  experienceLevel: 'beginner',
  preferredDuration: 30,
  includeCardio: false,
  days: 7,
  ageRange: '18-25',
  equipment: 'dumbbells',
  limitations: '',
  daysPerWeek: 4,
};

beforeEach(() => {
  jest.restoreAllMocks();
  jest.resetAllMocks();
});

describe('generate-workoutplan route', () => {
  it('500 on invalid JSON', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedGenerateGeminiJson.mockResolvedValueOnce('oops');

    const { POST } = await import('@/app/api/generate-workoutplan/route');
    const res = await POST(req('http://test.local/ai', 'POST', payload) as any);
    expect((await read(res)).status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
  });

  it('parses valid JSON when Gemini returns it', async () => {
    const expectedPlan = { Monday: { warmup: 'run' } };
    mockedGenerateGeminiJson.mockResolvedValueOnce(JSON.stringify(expectedPlan));

    const { POST } = await import('@/app/api/generate-workoutplan/route');
    const res  = await POST(req('http://test.local/ai', 'POST', payload) as any);
    const { body } = await read(res);

    expect(body.workoutPlan).toEqual(expectedPlan);
  });
});
