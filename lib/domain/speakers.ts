export const SPEAKER_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value),
  "image/webp": (bytes) =>
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
};

export async function validateSpeakerPhoto(
  value: FormDataEntryValue | null,
  required: boolean,
): Promise<{ photo?: File; error?: string }> {
  if (!(value instanceof File) || value.size === 0) {
    return required ? { error: "Seleccioná una foto del disertante." } : {};
  }
  if (value.size > SPEAKER_PHOTO_MAX_BYTES) {
    return { error: "La foto debe pesar menos de 5 MB." };
  }
  const signature = signatures[value.type];
  if (!signature || !signature(new Uint8Array(await value.slice(0, 12).arrayBuffer()))) {
    return { error: "Usá una imagen JPG, PNG o WebP válida." };
  }
  return { photo: value };
}
