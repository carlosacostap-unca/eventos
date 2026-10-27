import { registrationInputSchema, type RegistrationInput } from "./models";
import type { FormDefinition, PersonSubmission } from "./modalities";

export const registrationDocumentSchema = registrationInputSchema.shape.documento;

export type RegistrationPrefillResult = {
  person?: RegistrationInput;
  registration?: EditableRegistration;
  message: string;
};

export type EditableRegistration = {
  token: string;
  modalidad: string;
  version: string;
  definition?: FormDefinition;
  principal: PersonSubmission;
  integrantes: Array<PersonSubmission & { funcion: string }>;
  linked?: boolean;
  participations?: ExhibitionParticipation[];
  exhibitions?: EditableExhibition[];
  canAddExhibition?: boolean;
};

export type EditableExhibition = {
  id: string;
  title: string;
  version: string;
  definition: FormDefinition;
  principal: PersonSubmission;
  integrantes: Array<PersonSubmission & { funcion: string }>;
  presentation?: import("./presentations").PresentationInfo;
};

export type ExhibitionParticipation = {
  title: string;
  principalName: string;
  role: string;
};
