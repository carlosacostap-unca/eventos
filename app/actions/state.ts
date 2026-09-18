export type ActionState = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = {};
