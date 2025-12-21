'use server';

/**
 * @fileOverview Validates that a photo is of a person.
 *
 * - validateLemburPhoto - A function that validates a photo.
 * - ValidateLemburPhotoInput - The input type for the validateLemburPhoto function.
 * - ValidateLemburPhotoOutput - The return type for the validateLemburPhoto function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateLemburPhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type ValidateLemburPhotoInput = z.infer<typeof ValidateLemburPhotoInputSchema>;

const ValidateLemburPhotoOutputSchema = z.object({
  isPerson: z.boolean().describe('Whether or not the photo is of a person.'),
  confidence: z
    .number()
    .describe('The confidence level that the photo is of a person (0-1).'),
});
export type ValidateLemburPhotoOutput = z.infer<typeof ValidateLemburPhotoOutputSchema>;

export async function validateLemburPhoto(
  input: ValidateLemburPhotoInput
): Promise<ValidateLemburPhotoOutput> {
  return validateLemburPhotoFlow(input);
}

const validateLemburPhotoPrompt = ai.definePrompt({
  name: 'validateLemburPhotoPrompt',
  input: {schema: ValidateLemburPhotoInputSchema},
  output: {schema: ValidateLemburPhotoOutputSchema},
  prompt: `You are an expert AI that specializes in validating whether a photo is of a person.

You will be provided a photo, and you will determine whether or not the photo is of a person.

If the photo is of a person, set isPerson to true, otherwise set it to false.
Also, set the confidence level that the photo is of a person (0-1).

Photo: {{media url=photoDataUri}}`,
});

const validateLemburPhotoFlow = ai.defineFlow(
  {
    name: 'validateLemburPhotoFlow',
    inputSchema: ValidateLemburPhotoInputSchema,
    outputSchema: ValidateLemburPhotoOutputSchema,
  },
  async input => {
    const {output} = await validateLemburPhotoPrompt(input);
    return output!;
  }
);
