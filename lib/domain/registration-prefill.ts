import { registrationInputSchema, type RegistrationInput } from "./models";

export const registrationDocumentSchema = registrationInputSchema.shape.documento;

export type RegistrationPrefillResult = {
  person?: RegistrationInput;
  message: string;
};
