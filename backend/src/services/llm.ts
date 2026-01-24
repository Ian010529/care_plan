import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateCarePlan(
  patientRecords: string,
  medicationName: string,
): Promise<string> {
  const prompt = `You are a clinical pharmacist. Based on the following patient information, generate a comprehensive care plan.

Patient Records:
${patientRecords}

Medication: ${medicationName}

Please generate a care plan following this structure:

1. Problem list / Drug therapy problems (DTPs)
2. Goals (SMART)
3. Pharmacist interventions / plan
4. Monitoring plan & lab schedule

Provide detailed, clinically appropriate recommendations.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          "You are an experienced clinical pharmacist specializing in creating comprehensive care plans.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return (
    completion.choices[0].message.content || "Failed to generate care plan"
  );
}
