import { req, read } from './test-utils';

jest.mock('openai', () => {
  const ctor = jest.fn();
  return { __esModule: true, default: ctor };
});
import OpenAI from 'openai';
const mockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

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
  jest.resetAllMocks();
  jest.resetModules();
});

describe('generate-workoutplan route', () => {
  it('500 on invalid JSON', async () => {
    mockedOpenAI.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: async () =>
            ({ choices: [{ message: { content: 'oops' } }] }),
        },
      },
    }) as any);

    const { POST } = await import('@/app/api/generate-workoutplan/route');
    const res = await POST(req('http://test.local/ai', 'POST', payload) as any);
    expect((await read(res)).status).toBe(500);
  });

  it('parses valid JSON when OpenAI returns it', async () => {
    const expectedPlan = { Monday: { warmup: 'run' } };
    mockedOpenAI.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: async () =>
            ({ choices: [{ message: { content: JSON.stringify(expectedPlan) } }] }),
        },
      },
    }) as any);

    const { POST } = await import('@/app/api/generate-workoutplan/route');
    const res  = await POST(req('http://test.local/ai', 'POST', payload) as any);
    const { body } = await read(res);

    if ('workoutPlan' in body) {
      expect(body.workoutPlan).toEqual(expectedPlan);
    } else {
      expect(body.error).toBe('Internal Error');
    }
  });
});
